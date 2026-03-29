

# Next Powerful Upgrades — ProJournX-Level Features for MMC

After auditing your current app against ProJournX.com and identifying gaps, here are the **5 highest-impact upgrades** that will bring MMC to parity and beyond.

---

## Upgrade 1: AI Trade Grading (A/B/C/D/F Score per Trade)

**What**: Every trade automatically gets a quality grade based on your own historical patterns — not generic rules.

**How it works**:
- On trade close/import, an edge function scores the trade across 5 dimensions: Entry timing, Risk:Reward adherence, Strategy match, Session alignment, Emotional discipline
- Grade displayed as a colored badge on each trade row and in the journal
- Dashboard shows "Average Trade Grade" as a new KPI
- Filter trades by grade to study what separates A-trades from D-trades

**Implementation**:
- New edge function `grade-trade` using Lovable AI (gemini-3-flash-preview) with structured output via tool calling
- Add `trade_grade` and `grade_details` columns to trades table
- Update TradeKPICards to show average grade
- Add grade badge to RecentTradesList and Trades page table

---

## Upgrade 2: Period Comparison (This Week vs Last Week / This Month vs Last Month)

**What**: Side-by-side comparison of any two time periods — the most-requested ProJournX feature.

**How it works**:
- New tab/section in Trade Reports page
- Select two date ranges (presets: This Week vs Last, This Month vs Last, Custom)
- Shows delta arrows for every metric (win rate, P&L, profit factor, avg RR, trade count)
- Visual bar chart comparing key metrics side-by-side
- AI summary: "Your win rate improved 8% but you took 40% fewer trades — quality over quantity shift"

**Implementation**:
- New `PeriodComparison.tsx` component using shared `tradeMetrics.ts` module
- Two date range pickers with preset buttons
- Recharts grouped bar chart for visual comparison
- Optional AI summary via existing edge function

---

## Upgrade 3: Trade Screenshot Journal (Before/After with Annotations)

**What**: Attach chart screenshots to trades with before (setup) and after (result) views — core ProJournX journal feature.

**How it works**:
- On the trade detail/journal entry, two upload slots: "Setup (Before)" and "Result (After)"
- Images stored in Lovable Cloud file storage with user-scoped RLS
- Gallery view on Trading Dashboard showing recent annotated trades
- Screenshots linked to trade ID for full context

**Implementation**:
- Create `trade_screenshots` storage bucket with RLS policies
- Add `setup_screenshot_url` and `result_screenshot_url` columns to trades table
- New `TradeScreenshotUpload.tsx` component with drag-and-drop + compression
- Update journal entry form to include screenshot slots
- Thumbnail gallery in dashboard "Recent Trades" section

---

## Upgrade 4: Streak Recovery Tracker + Drawdown Analyzer

**What**: Visual timeline showing every drawdown period — how deep, how long to recover, and what changed.

**How it works**:
- Equity curve overlay showing drawdown zones (red shaded areas)
- Table: each drawdown with start date, bottom date, recovery date, depth %, duration
- "Current streak" widget on dashboard: "5 green days" or "In drawdown: -3.2% (Day 4)"
- AI insight: "Your average recovery takes 6 trading days. This drawdown is within normal range."

**Implementation**:
- New `DrawdownAnalyzer.tsx` component with Recharts area chart
- Drawdown computation function in `tradeMetrics.ts`
- Streak widget added to TradeKPICards row
- Integrate into Trading Dashboard below equity curve

---

## Upgrade 5: Smart Auto-Tags + Advanced Filters

**What**: AI automatically tags each trade with detected patterns (Breakout, Reversal, Trend Follow, News, etc.) and lets you filter/group by tags.

**How it works**:
- On import/sync, trades are batch-tagged via AI edge function
- Tags visible as colored chips on trade rows
- Filter panel: filter by tag, grade, session, symbol, day-of-week
- "Tag Performance" breakdown: which tags are most profitable
- Users can also add custom tags manually

**Implementation**:
- Add `tags` (text array) column to trades table
- New edge function `auto-tag-trades` using Lovable AI with tool calling for structured output
- `TagPerformance.tsx` component showing tag-wise win rate, P&L, profit factor
- Enhanced filter bar on Trades page with multi-select tag filter
- Manual tag editor on trade detail view

---

## Implementation Order

| Phase | Feature | Effort | Impact |
|-------|---------|--------|--------|
| 1 | Period Comparison | Medium | High — most requested analytics feature |
| 2 | Smart Auto-Tags + Filters | Medium | High — transforms trade analysis workflow |
| 3 | AI Trade Grading | Medium | High — unique differentiator vs ProJournX |
| 4 | Trade Screenshots | Medium | Medium — core journal parity |
| 5 | Drawdown Analyzer | Low | Medium — advanced analytics polish |

---

## Technical Notes

- All AI features use Lovable AI gateway (gemini-3-flash-preview) via edge functions — no API key needed from user
- All new DB columns added via migrations with safe defaults (nullable or default values)
- RLS policies enforced on all new tables/storage buckets
- Shared `tradeMetrics.ts` module extended (not duplicated) for new computations
- No existing features broken — all additive changes

