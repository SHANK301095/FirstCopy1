# Strategy Health Score — Technical Documentation

## Overview
The Strategy Health Score (0–100) is an explainable, deterministic metric that evaluates trading strategy quality. It identifies overfit, fragile, or risky strategies and down-ranks them in recommendations.

## Score Components (Weighted)

| Component | Weight | What it measures |
|-----------|--------|-----------------|
| **Robustness** | 30% | Sub-period stability, one-trade dependence, profitability across thirds |
| **Risk Quality** | 30% | Max drawdown ratio, worst loss streak, loss size distribution |
| **Consistency** | 20% | Monthly profitability rate, return variance (CV) |
| **Execution Reality** | 20% | Trade frequency realism, fees presence, data span |

## Grading

| Score | Grade | Color |
|-------|-------|-------|
| 80–100 | Healthy | Green |
| 60–79 | Medium | Amber |
| 0–59 | Risky | Red |

## Data Sources
- `trades` table (pnl, net_pnl, fees, entry_time, exit_time)
- `results` table (summary_json for backtest metrics)
- `computed_from` field tracks: `backtest`, `paper`, `live`, or `mixed`

## Recommendation Multiplier
When computing investor recommendations:
- **Healthy** → score × 1.10
- **Medium** → score × 1.00
- **Risky** → score × 0.75 + forced Paper mode

## Recompute
- Edge function: `strategy-health` with `?action=recompute`
- Admin-only trigger
- Audit logged in `strategy_health_runs` table

## Database Tables
- `strategy_health_scores` — per-strategy scores with components, reasons, warnings
- `strategy_health_runs` — audit log of recompute runs

## UI
- Health Badge on marketplace strategy cards
- "Why" drawer showing component breakdown, reasons, and warnings
- Sort by health in marketplace
- Hinglish reasons/warnings for Indian trader audience

## Minimum Sample
- 10 trades required for scoring
- < 10 trades → score 0, grade "risky"
