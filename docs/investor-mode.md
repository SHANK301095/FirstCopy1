# Investor Mode Documentation

## Overview
Investor Mode is a "No Charts, No Coding" experience for non-traders who want to deploy proven strategies with safety guardrails.

## User Flow
1. **Goal Wizard** (`/investor/goal`) → User enters capital, risk tolerance, time horizon, preferred assets, experience level
2. **Recommendations** (`/investor/recommendations`) → Top 7 strategies scored deterministically
3. **Strategy Detail** (`/investor/strategy-detail`) → Plain-language explanation + risk guardrails
4. **Paper Trading** → Starts automatically when user clicks "Paper Start"
5. **Execution Console** (`/investor/console`) → Status, events timeline, kill switch
6. **Daily Reports** (`/investor/reports`) → Investor-grade daily cards

## How Recommendation Works

### Scoring Engine (Deterministic, 0-100)
| Factor | Max Points | Logic |
|--------|-----------|-------|
| Asset class match | 25 | Overlap between user preferred assets and strategy supported assets |
| Risk profile match | 20 | Exact match = 20, off-by-one = 10, mismatch = 0 |
| Horizon match | 15 | Strategy style (scalp/swing/positional) vs user horizon days |
| Max DD compatibility | 20 | Strategy DD ≤ user limit = 20, up to 1.5x = 10 |
| Trade frequency suitability | 10 | Experience level vs strategy frequency |
| Min capital fit | 10 | User capital ≥ strategy minimum |

### Output per Strategy
- Score (0-100)
- 3 reasons (Hinglish)
- 3 risks (Hinglish)
- "Ideal for you if…" line
- Recommended settings (mode, risk rules)

### Important
- **No guaranteed returns** — always "expected range" wording
- Results saved to `recommendation_runs` for full audit trail

## How to Add/Edit Strategies

Strategies live in the `strategies` table. Key investor-mode columns:

```sql
-- Required for recommendation matching:
style          -- 'scalp' | 'intraday' | 'swing' | 'positional'
risk_profile   -- 'conservative' | 'moderate' | 'aggressive'
asset_classes  -- text[] e.g. {'forex', 'gold', 'indices'}
min_capital    -- numeric (minimum recommended capital)
max_recommended_dd_pct -- numeric (expected max drawdown %)
expected_trade_frequency -- 'low' | 'medium' | 'high'
typical_hold_time -- text description
status         -- 'active' | 'disabled'
```

Tags go in `strategy_tags` table (many-to-many).

## Paper-First Gating

Live mode is **locked** until either:
- ≥ 10 paper trades completed, OR
- ≥ 3 paper trading days

Constants defined in `InvestorConsole.tsx`:
```typescript
const MIN_PAPER_TRADES = 10;
const MIN_PAPER_DAYS = 3;
```

## Risk Engine (Default ON)

Every `chosen_strategy_instance` has a `risk_ruleset` JSON:

```json
{
  "maxDailyLossPct": 3,
  "maxOpenTrades": 3,
  "cooldownAfterLossMin": 30,
  "killSwitch": false
}
```

When risk is triggered:
- Trade is blocked
- `investor_executions` row created with `risk_blocked: true` and `risk_reason`
- User sees red event in console timeline

### Kill Switch
- Big red button in console
- Sets `killSwitch: true` and instance status to `paused`
- All trading stops immediately

## Database Tables

| Table | Purpose |
|-------|---------|
| `investor_profiles` | User goals/preferences (1 per user) |
| `recommendation_runs` | Audit trail of every recommendation |
| `chosen_strategy_instances` | User's active strategy configs |
| `investor_executions` | Event log (trades, risk blocks, kill switch) |
| `investor_daily_reports` | Daily performance cards |
| `strategy_tags` | Tag taxonomy for strategies |

All tables have RLS — users only see their own data. Strategy library is readable by all authenticated users.

## Testing Checklist

- [ ] Goal Wizard: All 4 steps work, validation on empty assets
- [ ] Recommendations: Edge function returns scored strategies
- [ ] Strategy Detail: Risk guardrails editable, paper start creates instance
- [ ] Console: Kill switch toggles, events show, live gating works
- [ ] Reports: Empty state shows correctly, populated reports render
- [ ] RLS: User A cannot see User B's instances/reports
- [ ] Mobile: All screens usable on 375px width
- [ ] No charts rendered anywhere in investor mode
