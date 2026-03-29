/**
 * Portfolio Breach Logger — Persists constraint breaches and surfaces them in UI
 * Integrates portfolioRiskGuard with incident service for full auditability
 */
import { supabase } from '@/integrations/supabase/client';
import { runPortfolioRiskCheck, persistPortfolioBreaches, type PortfolioRiskCheckResult } from './portfolioRiskGuard';
import { createIncident } from './incidentService';
import { logAudit } from './auditService';
import type { PortfolioAllocation, PortfolioConstraints } from '@/types/quant';

/**
 * Full portfolio risk check with automatic breach logging, incident creation, and audit
 */
export async function executePortfolioRiskCheckWithLogging(
  userId: string,
  portfolioId: string,
  allocations: PortfolioAllocation[],
  constraints?: PortfolioConstraints,
  previousAllocations?: PortfolioAllocation[]
): Promise<PortfolioRiskCheckResult> {
  const result = runPortfolioRiskCheck(allocations, constraints, previousAllocations);

  // Persist breaches to DB
  if (result.breaches.length > 0) {
    await persistPortfolioBreaches(userId, portfolioId, result.breaches);

    // Create incidents for violations
    const violations = result.breaches.filter(b => b.severity === 'violation');
    if (violations.length > 0) {
      await createIncident(userId, {
        type: 'portfolio_constraint_violation',
        severity: 'elevated',
        title: `Portfolio constraint violated: ${violations.map(v => v.constraint).join(', ')}`,
        detail: violations.map(v => v.detail).join(' | '),
        metadata: { portfolio_id: portfolioId, breaches: violations },
      });
    }

    // Audit log
    await logAudit({
      action: 'risk_policy_changed',
      entity_type: 'portfolio',
      entity_id: portfolioId,
      after_data: {
        breaches_count: result.breaches.length,
        violations_count: violations.length,
        passed: result.passed,
      },
      reason: result.passed ? 'Portfolio check passed with warnings' : 'Portfolio constraint violations detected',
    });
  }

  return result;
}

/**
 * Fetch recent portfolio breaches for display
 */
export async function fetchRecentPortfolioBreaches(portfolioId?: string, limit = 50) {
  let query = supabase
    .from('portfolio_constraint_breaches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (portfolioId) {
    query = query.eq('portfolio_id', portfolioId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[PortfolioBreachLogger] Fetch failed:', error.message);
    return [];
  }
  return data || [];
}
