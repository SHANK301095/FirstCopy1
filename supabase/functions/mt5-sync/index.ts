/**
 * MT5 Sync Edge Function v3
 * Receives data from MQL5 EA via HTTP POST, normalizes, and stores in DB
 * Auth: Supports BOTH X-MT5-Key (sync_key) AND Authorization Bearer (JWT)
 * Handles: heartbeat, positions, orders, deals, equity snapshots, reconciliation, kill switch
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-mt5-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface MT5SyncPayload {
  action: 'heartbeat' | 'sync_positions' | 'sync_orders' | 'sync_deals' | 'sync_snapshot' | 'full_sync' | 'register' | 'reconcile';
  account_number: string;
  broker_name: string;
  server_name?: string;
  terminal_build?: string;
  leverage?: number;
  currency?: string;
  timezone?: string;
  timestamp: string;
  data?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // ── AUTH: Support both X-MT5-Key and Bearer JWT ──
    const mt5Key = req.headers.get('X-MT5-Key')
    const authHeader = req.headers.get('Authorization')

    let userId: string
    let supabase: any

    if (mt5Key) {
      // EA auth via sync_key — no JWT needed
      supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )

      const { data: account, error: accErr } = await supabase
        .from('mt5_accounts')
        .select('id, user_id, account_number, broker_name')
        .eq('sync_key', mt5Key)
        .eq('is_active', true)
        .maybeSingle()

      if (accErr || !account) {
        return jsonResponse({ error: 'Invalid or inactive sync key' }, 403)
      }

      userId = account.user_id
    } else if (authHeader?.startsWith('Bearer ')) {
      // Web UI auth via JWT
      supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return jsonResponse({ error: 'Invalid token' }, 401)
      }
      userId = user.id
    } else {
      return jsonResponse({ error: 'Missing authentication. Provide X-MT5-Key or Authorization header.' }, 401)
    }

    const payload: MT5SyncPayload = await req.json()

    // Check kill switch before any write action
    if (['sync_positions', 'sync_orders', 'sync_deals', 'full_sync'].includes(payload.action)) {
      const killed = await isKillSwitchActive(supabase, userId, payload)
      if (killed) {
        return jsonResponse({ error: 'Kill switch is active. Sync paused.', kill_switch: true }, 403)
      }
      
      // Check circuit breaker
      const circuitOpen = await isCircuitOpen(supabase, userId, payload)
      if (circuitOpen) {
        return jsonResponse({ error: 'Circuit breaker open. Too many recent errors.', circuit_breaker: true }, 429)
      }
    }

    switch (payload.action) {
      case 'register':
        return await handleRegister(supabase, userId, payload)
      case 'heartbeat':
        return await handleHeartbeat(supabase, userId, payload)
      case 'sync_positions':
        return await handleSyncPositions(supabase, userId, payload)
      case 'sync_orders':
        return await handleSyncOrders(supabase, userId, payload)
      case 'sync_deals':
        return await handleSyncDeals(supabase, userId, payload)
      case 'sync_snapshot':
        return await handleSyncSnapshot(supabase, userId, payload)
      case 'full_sync':
        return await handleFullSync(supabase, userId, payload)
      case 'reconcile':
        return await handleReconcile(supabase, userId, payload)
      default:
        return jsonResponse({ error: `Unknown action: ${payload.action}` }, 400)
    }
  } catch (err) {
    console.error('MT5 Sync Error:', err)
    return jsonResponse({ error: 'Internal server error', details: err.message }, 500)
  }
})

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// ── Kill Switch Check ──
async function isKillSwitchActive(supabase: any, userId: string, payload: MT5SyncPayload) {
  const { data: globalConfig } = await supabase
    .from('mt5_risk_config')
    .select('kill_switch_active')
    .eq('user_id', userId)
    .eq('scope', 'global')
    .maybeSingle()

  if (globalConfig?.kill_switch_active) return true

  const account = await getAccount(supabase, userId, payload)
  if (!account) return false

  const { data: accountConfig } = await supabase
    .from('mt5_risk_config')
    .select('kill_switch_active')
    .eq('user_id', userId)
    .eq('account_id', account.id)
    .eq('scope', 'account')
    .maybeSingle()

  return accountConfig?.kill_switch_active === true
}

// ── Circuit Breaker Check ──
async function isCircuitOpen(supabase: any, userId: string, payload: MT5SyncPayload) {
  const account = await getAccount(supabase, userId, payload)
  if (!account) return false

  const { data: config } = await supabase
    .from('mt5_risk_config')
    .select('circuit_breaker_enabled, circuit_open_until')
    .eq('user_id', userId)
    .eq('account_id', account.id)
    .eq('scope', 'account')
    .maybeSingle()

  if (!config?.circuit_breaker_enabled) return false
  if (!config.circuit_open_until) return false
  return new Date(config.circuit_open_until) > new Date()
}

// ── Increment Circuit Breaker Error Count ──
async function recordSyncError(supabase: any, userId: string, accountId: string) {
  const { data: config } = await supabase
    .from('mt5_risk_config')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('scope', 'account')
    .maybeSingle()

  if (!config?.circuit_breaker_enabled) return

  const now = new Date()
  const windowStart = new Date(now.getTime() - config.error_window_minutes * 60 * 1000)
  const lastError = config.last_error_at ? new Date(config.last_error_at) : null

  let newCount = (lastError && lastError > windowStart) ? config.current_error_count + 1 : 1

  const update: any = {
    current_error_count: newCount,
    last_error_at: now.toISOString(),
  }

  if (newCount >= config.max_consecutive_errors) {
    update.circuit_open_until = new Date(now.getTime() + config.error_window_minutes * 60 * 1000).toISOString()
  }

  await supabase.from('mt5_risk_config').update(update).eq('id', config.id)
}

// ── Register Account ──
async function handleRegister(supabase: any, userId: string, payload: MT5SyncPayload) {
  const { data, error } = await supabase
    .from('mt5_accounts')
    .upsert({
      user_id: userId,
      account_number: payload.account_number,
      broker_name: payload.broker_name,
      server_name: payload.server_name || null,
      terminal_build: payload.terminal_build || null,
      leverage: payload.leverage || 100,
      currency: payload.currency || 'USD',
      timezone: payload.timezone || null,
      connection_status: 'connected',
      last_heartbeat_at: new Date().toISOString(),
      is_active: true,
    }, {
      onConflict: 'user_id,account_number,broker_name',
    })
    .select()
    .single()

  if (error) return jsonResponse({ error: error.message }, 400)

  // Auto-create default risk config for this account
  await supabase.from('mt5_risk_config').upsert({
    user_id: userId,
    account_id: data.id,
    scope: 'account',
  }, { onConflict: 'user_id,account_id,scope' })

  return jsonResponse({ ok: true, account: data })
}

// ── Heartbeat ──
async function handleHeartbeat(supabase: any, userId: string, payload: MT5SyncPayload) {
  const account = await getAccount(supabase, userId, payload)
  if (!account) return jsonResponse({ error: 'Account not found. Register first.' }, 404)

  await supabase.from('mt5_accounts').update({
    connection_status: 'connected',
    last_heartbeat_at: new Date().toISOString(),
    server_name: payload.server_name || undefined,
    terminal_build: payload.terminal_build || undefined,
    leverage: payload.leverage || undefined,
    currency: payload.currency || undefined,
  }).eq('id', account.id)

  const killed = await isKillSwitchActive(supabase, userId, payload)

  return jsonResponse({ ok: true, status: 'alive', kill_switch: killed })
}

// ── Sync Positions ──
async function handleSyncPositions(supabase: any, userId: string, payload: MT5SyncPayload) {
  const account = await getAccount(supabase, userId, payload)
  if (!account) return jsonResponse({ error: 'Account not found' }, 404)

  const startTime = Date.now()
  const positions = payload.data?.positions || []
  
  const { data: syncLog } = await supabase.from('mt5_sync_log').insert({
    account_id: account.id,
    user_id: userId,
    sync_type: 'positions',
    status: 'started',
  }).select().single()

  let created = 0, updated = 0
  const mismatches: any[] = []

  try {
    // Mark all existing as potentially closed
    await supabase.from('mt5_positions')
      .update({ is_open: false })
      .eq('account_id', account.id)
      .eq('is_open', true)

    for (const pos of positions) {
      const { data: existing } = await supabase.from('mt5_positions')
        .select('id, volume, stop_loss, take_profit')
        .eq('account_id', account.id)
        .eq('ticket', pos.ticket)
        .maybeSingle()

      const record = {
        account_id: account.id,
        user_id: userId,
        ticket: pos.ticket,
        symbol: pos.symbol,
        direction: pos.type?.toLowerCase() === 'buy' ? 'buy' : 'sell',
        volume: pos.volume,
        open_price: pos.open_price,
        current_price: pos.current_price,
        stop_loss: pos.stop_loss || null,
        take_profit: pos.take_profit || null,
        swap: pos.swap || 0,
        profit: pos.profit || 0,
        commission: pos.commission || 0,
        magic_number: pos.magic_number || null,
        comment: pos.comment || null,
        open_time: pos.open_time,
        synced_at: new Date().toISOString(),
        is_open: true,
      }

      if (existing) {
        if (existing.volume !== pos.volume) {
          mismatches.push({ type: 'qty_mismatch', ticket: pos.ticket, field: 'volume', expected: pos.volume, actual: existing.volume })
        }
        await supabase.from('mt5_positions').update(record).eq('id', existing.id)
        updated++
      } else {
        await supabase.from('mt5_positions').insert(record)
        created++
      }
    }

    const duration = Date.now() - startTime
    const severity = mismatches.length === 0 ? 'none' : mismatches.length < 3 ? 'info' : 'warning'

    if (syncLog) {
      await supabase.from('mt5_sync_log').update({
        status: 'success',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        records_synced: positions.length,
        records_created: created,
        records_updated: updated,
        mismatches: mismatches,
        mismatch_count: mismatches.length,
        mismatch_severity: severity,
      }).eq('id', syncLog.id)
    }

    await supabase.from('mt5_accounts').update({
      last_sync_at: new Date().toISOString(),
      sync_latency_ms: duration,
      connection_status: 'connected',
    }).eq('id', account.id)

    await supabase.from('mt5_risk_config').update({
      current_error_count: 0,
    }).eq('user_id', userId).eq('account_id', account.id).eq('scope', 'account')

    return jsonResponse({ ok: true, synced: positions.length, created, updated, mismatches: mismatches.length, duration_ms: duration })
  } catch (err) {
    await recordSyncError(supabase, userId, account.id)
    if (syncLog) {
      await supabase.from('mt5_sync_log').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: err.message,
        duration_ms: Date.now() - startTime,
      }).eq('id', syncLog.id)
    }
    throw err
  }
}

// ── Sync Orders ──
async function handleSyncOrders(supabase: any, userId: string, payload: MT5SyncPayload) {
  const account = await getAccount(supabase, userId, payload)
  if (!account) return jsonResponse({ error: 'Account not found' }, 404)

  const orders = payload.data?.orders || []
  let created = 0, updated = 0

  for (const ord of orders) {
    const { data: existing } = await supabase.from('mt5_orders')
      .select('id')
      .eq('account_id', account.id)
      .eq('ticket', ord.ticket)
      .maybeSingle()

    const record = {
      account_id: account.id,
      user_id: userId,
      ticket: ord.ticket,
      symbol: ord.symbol,
      order_type: ord.type?.toLowerCase().replace(' ', '_'),
      volume: ord.volume,
      price: ord.price,
      stop_loss: ord.stop_loss || null,
      take_profit: ord.take_profit || null,
      stop_limit: ord.stop_limit || null,
      magic_number: ord.magic_number || null,
      comment: ord.comment || null,
      order_time: ord.order_time,
      expiration: ord.expiration || null,
      state: ord.state || 'placed',
      synced_at: new Date().toISOString(),
    }

    if (existing) {
      await supabase.from('mt5_orders').update(record).eq('id', existing.id)
      updated++
    } else {
      await supabase.from('mt5_orders').insert(record)
      created++
    }
  }

  return jsonResponse({ ok: true, synced: orders.length, created, updated })
}

// ── Sync Deals ──
async function handleSyncDeals(supabase: any, userId: string, payload: MT5SyncPayload) {
  const account = await getAccount(supabase, userId, payload)
  if (!account) return jsonResponse({ error: 'Account not found' }, 404)

  const deals = payload.data?.deals || []
  let created = 0, skipped = 0, tradesCreated = 0

  for (const deal of deals) {
    const record = {
      account_id: account.id,
      user_id: userId,
      deal_ticket: deal.ticket,
      order_ticket: deal.order_ticket || null,
      position_ticket: deal.position_ticket || null,
      symbol: deal.symbol || '',
      deal_type: deal.type?.toLowerCase() || 'buy',
      entry_type: deal.entry?.toLowerCase() || null,
      volume: deal.volume || 0,
      price: deal.price || 0,
      profit: deal.profit || 0,
      swap: deal.swap || 0,
      commission: deal.commission || 0,
      fee: deal.fee || 0,
      magic_number: deal.magic_number || null,
      comment: deal.comment || null,
      deal_time: deal.time,
      synced_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('mt5_deals').upsert(record, {
      onConflict: 'account_id,deal_ticket',
    })

    if (error) { skipped++ } else { created++ }

    // Auto-create trade in trades table for closed deals (entry_type = 'out')
    // NOTE: For exit deals, deal_type is the CLOSING action:
    //   buy-to-close = short position was closed → direction = 'short'
    //   sell-to-close = long position was closed → direction = 'long'
    if (!error && (deal.entry?.toLowerCase() === 'out' || record.entry_type === 'out')) {
      const brokerTradeId = `mt5_${account.account_number}_${deal.ticket}`
      const closingAction = deal.type?.toLowerCase() || record.deal_type
      const direction = (closingAction === 'buy') ? 'short' : 'long'
      const profit = deal.profit || 0
      const commission = deal.commission || 0
      const swap = deal.swap || 0
      const fee = deal.fee || 0
      const netPnl = profit - Math.abs(commission) - Math.abs(fee) + swap

      const tradeRecord = {
        user_id: userId,
        broker_trade_id: brokerTradeId,
        symbol: deal.symbol || record.symbol,
        direction,
        entry_price: deal.price || 0,
        entry_time: deal.time || new Date().toISOString(),
        exit_price: deal.price || 0,
        exit_time: deal.time || new Date().toISOString(),
        quantity: deal.volume || 1,
        lot_size: deal.volume || 0,
        pnl: profit,
        net_pnl: netPnl,
        fees: Math.abs(commission) + Math.abs(fee),
        status: 'closed',
        import_source: 'mt5_auto',
        account_id: null,
        metadata: { mt5_deal_ticket: deal.ticket, mt5_account: account.account_number, mt5_swap: swap },
      }

      const { error: tradeErr } = await supabase.from('trades').upsert(tradeRecord, {
        onConflict: 'user_id,broker_trade_id',
      })

      if (!tradeErr) tradesCreated++
    }
  }

  return jsonResponse({ ok: true, synced: deals.length, created, skipped, trades_created: tradesCreated })
}

// ── Sync Equity Snapshot ──
async function handleSyncSnapshot(supabase: any, userId: string, payload: MT5SyncPayload) {
  const account = await getAccount(supabase, userId, payload)
  if (!account) return jsonResponse({ error: 'Account not found' }, 404)

  const snap = payload.data || {}
  await supabase.from('mt5_equity_snapshots').insert({
    account_id: account.id,
    user_id: userId,
    balance: snap.balance || 0,
    equity: snap.equity || 0,
    margin: snap.margin || 0,
    free_margin: snap.free_margin || 0,
    margin_level: snap.margin_level || null,
    floating_pl: snap.floating_pl || 0,
    positions_count: snap.positions_count || 0,
    orders_count: snap.orders_count || 0,
  })

  return jsonResponse({ ok: true })
}

// ── Full Sync ──
async function handleFullSync(supabase: any, userId: string, payload: MT5SyncPayload) {
  const results: any = {}

  if (payload.data?.positions) {
    const r = await handleSyncPositions(supabase, userId, { ...payload, action: 'sync_positions' })
    results.positions = await r.json()
  }
  if (payload.data?.orders) {
    const r = await handleSyncOrders(supabase, userId, { ...payload, action: 'sync_orders' })
    results.orders = await r.json()
  }
  if (payload.data?.deals) {
    const r = await handleSyncDeals(supabase, userId, { ...payload, action: 'sync_deals' })
    results.deals = await r.json()
  }
  if (payload.data?.snapshot) {
    const snapshotPayload = { ...payload, data: payload.data.snapshot }
    const r = await handleSyncSnapshot(supabase, userId, snapshotPayload)
    results.snapshot = await r.json()
  }

  return jsonResponse({ ok: true, results })
}

// ── Reconciliation ──
async function handleReconcile(supabase: any, userId: string, payload: MT5SyncPayload) {
  const account = await getAccount(supabase, userId, payload)
  if (!account) return jsonResponse({ error: 'Account not found' }, 404)

  const eaPositions = payload.data?.positions || []
  const eaOrders = payload.data?.orders || []

  const { data: dbPositions } = await supabase.from('mt5_positions')
    .select('ticket, symbol, volume, direction, is_open')
    .eq('account_id', account.id)
    .eq('is_open', true)

  const { data: dbOrders } = await supabase.from('mt5_orders')
    .select('ticket, symbol, volume, state')
    .eq('account_id', account.id)

  const positionMismatches: any[] = []
  const orderMismatches: any[] = []

  const dbPosMap = new Map((dbPositions || []).map((p: any) => [p.ticket, p]))
  const eaPosMap = new Map(eaPositions.map((p: any) => [p.ticket, p]))

  for (const [ticket, dbPos] of dbPosMap) {
    if (!eaPosMap.has(ticket)) {
      positionMismatches.push({ type: 'ghost_position', ticket, severity: 'warning', detail: 'Position in DB but not in MT5' })
    }
  }

  for (const [ticket, eaPos] of eaPosMap) {
    if (!dbPosMap.has(ticket)) {
      positionMismatches.push({ type: 'missing_position', ticket, severity: 'warning', detail: 'Position in MT5 but not in DB' })
    } else {
      const dbP = dbPosMap.get(ticket)
      if (dbP.volume !== eaPos.volume) {
        positionMismatches.push({ type: 'qty_mismatch', ticket, severity: 'critical', detail: `Volume: DB=${dbP.volume} EA=${eaPos.volume}` })
      }
    }
  }

  const severity = positionMismatches.some((m: any) => m.severity === 'critical') ? 'critical'
    : (positionMismatches.length + orderMismatches.length) > 0 ? 'warning' : 'none'

  await supabase.from('mt5_reconciliation').insert({
    account_id: account.id,
    user_id: userId,
    expected_positions: eaPositions.length,
    actual_positions: (dbPositions || []).length,
    position_mismatches: positionMismatches,
    expected_orders: eaOrders.length,
    actual_orders: (dbOrders || []).length,
    order_mismatches: orderMismatches,
    severity,
    manual_required: positionMismatches.filter((m: any) => m.severity === 'critical').length,
    auto_healed: 0,
  })

  return jsonResponse({
    ok: true,
    severity,
    position_mismatches: positionMismatches.length,
    order_mismatches: orderMismatches.length,
    details: { positionMismatches, orderMismatches },
  })
}

// ── Helper: Get Account ──
async function getAccount(supabase: any, userId: string, payload: MT5SyncPayload) {
  const { data } = await supabase
    .from('mt5_accounts')
    .select('id, account_number')
    .eq('user_id', userId)
    .eq('account_number', payload.account_number)
    .eq('broker_name', payload.broker_name)
    .maybeSingle()
  return data
}
