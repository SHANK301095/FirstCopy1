// MMC Copilot Deep Knowledge Base
// EXTREMELY COMPREHENSIVE documentation for every feature, metric, workflow, and edge case
// This is the MASTER reference that makes Copilot the ultimate MMC expert

export const MMC_COPILOT_DEEP_KNOWLEDGE = `
================================================================================
PART 1: COMPLETE METRICS & FORMULAS ENCYCLOPEDIA
================================================================================

## 1.1 PERFORMANCE METRICS (with exact formulas)

### Net Profit
- Formula: Gross Profit - Gross Loss
- Also called: Total P/L, Net Returns
- Unit: Currency (₹, $)
- Interpretation: Total money made/lost
- Healthy: Positive (obviously)

### Net Profit Percentage
- Formula: (Net Profit / Initial Capital) × 100
- Also called: Total Return %
- Unit: Percentage
- Context: Compare across different account sizes

### Gross Profit
- Formula: Sum of all winning trades
- Only counts positive P/L trades
- Used for: Profit Factor calculation

### Gross Loss  
- Formula: Sum of all losing trades (absolute value)
- Only counts negative P/L trades
- Used for: Profit Factor calculation

### Profit Factor
- Formula: Gross Profit / Gross Loss
- Interpretation:
  - < 1: Losing money (bad)
  - = 1: Breaking even
  - 1.0 - 1.5: Marginal edge
  - 1.5 - 2.0: Reliable edge
  - 2.0 - 3.0: Strong edge
  - > 3.0: Exceptional (or check for overfitting)
- Why it matters: Shows how much you make per unit of loss

### Win Rate (Win Ratio)
- Formula: (Winning Trades / Total Trades) × 100
- Also called: Hit Rate, Success Rate
- Unit: Percentage
- Interpretation:
  - 30-40%: Trend following systems (need high R:R)
  - 50-60%: Mean reversion systems
  - 70%+: Scalping (need tight R:R)
- Trap: High win rate ≠ profitable (depends on R:R)

### Loss Rate
- Formula: 100% - Win Rate
- Or: (Losing Trades / Total Trades) × 100

### Risk-Reward Ratio (R:R)
- Formula: Average Win / Average Loss
- Also called: Reward-to-Risk, Win/Loss Ratio
- Interpretation:
  - 1:1 = Break even at 50% WR
  - 2:1 = Break even at 33% WR
  - 3:1 = Break even at 25% WR
- Formula for break-even WR: 1 / (1 + R:R)

### Average Win
- Formula: Gross Profit / Number of Winning Trades
- Unit: Currency
- Affected by: Take profit settings, trailing stops

### Average Loss
- Formula: Gross Loss / Number of Losing Trades
- Unit: Currency
- Affected by: Stop loss settings

### Expectancy (Expected Value per Trade)
- Formula: (Win Rate × Average Win) - (Loss Rate × Average Loss)
- Also called: Mathematical Expectancy, Edge
- Unit: Currency per trade
- Interpretation:
  - Positive: Long-term profitable
  - Negative: Long-term losing
  - Zero: Break even
- Example: 55% WR, ₹100 avg win, ₹80 avg loss
  - E = (0.55 × 100) - (0.45 × 80) = 55 - 36 = ₹19 per trade

### Expectancy Ratio
- Formula: Expectancy / Average Loss
- Normalized version for comparison
- > 0.1 is decent, > 0.3 is excellent

### Maximum Drawdown (MDD)
- Formula: Max(Peak - Trough) for any point in equity curve
- Unit: Currency or Percentage
- Percentage form: ((Peak - Trough) / Peak) × 100
- Interpretation:
  - < 10%: Very conservative
  - 10-20%: Moderate
  - 20-30%: Aggressive
  - > 30%: High risk
- Why it matters: Shows worst losing period

### Maximum Drawdown Duration
- Formula: Longest time spent below previous peak
- Unit: Days/Bars
- Interpretation: How long before recovery
- Trader impact: Psychological tolerance

### Average Drawdown
- Formula: Mean of all drawdown periods
- Less extreme than max, more representative

### Recovery Factor
- Formula: Net Profit / Max Drawdown
- Interpretation:
  - < 1: Not worth the risk
  - 1-2: Marginal
  - 2-5: Good
  - > 5: Excellent
- Meaning: How much profit per unit of pain

### Sharpe Ratio
- Formula: (Return - Risk-Free Rate) / Standard Deviation of Returns
- Annualized: Multiply by √252 for daily data
- Interpretation:
  - < 0: Worse than cash
  - 0-1: Sub-optimal
  - 1-2: Good
  - 2-3: Excellent
  - > 3: Outstanding (check for overfitting)
- Uses: Compare risk-adjusted returns

### Sortino Ratio
- Formula: (Return - Risk-Free Rate) / Downside Deviation
- Similar to Sharpe but only penalizes downside volatility
- Interpretation: Same scale as Sharpe
- Advantage: Doesn't penalize upside volatility

### Calmar Ratio
- Formula: CAGR / Max Drawdown
- Interpretation:
  - < 0.5: Poor
  - 0.5-1.0: Decent
  - 1.0-2.0: Good
  - > 2.0: Excellent
- Uses: Long-term risk-adjusted returns

### CAGR (Compound Annual Growth Rate)
- Formula: ((Final Value / Initial Value)^(1/Years)) - 1
- Unit: Percentage per year
- Uses: Compare across different time periods

### Ulcer Index
- Formula: √(Average of Squared Drawdowns)
- Lower is better
- Focuses on drawdown depth and duration

### Pain Index
- Formula: Average Drawdown × Average Duration
- Psychological burden metric

### Volatility (Standard Deviation)
- Formula: √(Variance of Returns)
- Daily Vol: StdDev of daily returns
- Annualized: Daily × √252
- Uses: Risk assessment, position sizing

### Beta
- Formula: Covariance(Strategy, Benchmark) / Variance(Benchmark)
- Interpretation:
  - β = 1: Moves with market
  - β > 1: More volatile than market
  - β < 1: Less volatile
  - β < 0: Inverse to market

### Alpha (Jensen's Alpha)
- Formula: Return - (Risk-Free + β × (Market Return - Risk-Free))
- Interpretation: Excess return beyond market exposure
- Positive alpha = skill/edge

### Value at Risk (VaR)
- 95% VaR: 5% chance of losing this much or more
- 99% VaR: 1% chance of losing this much or more
- Formula (Parametric): μ - z × σ
  - z = 1.645 for 95%, 2.326 for 99%
- Uses: Risk management, position limits

### Conditional VaR (CVaR / Expected Shortfall)
- Formula: Expected loss given VaR is breached
- Average of losses beyond VaR threshold
- More conservative than VaR

### Skewness
- Measures asymmetry of return distribution
- Positive: More extreme positive returns
- Negative: More extreme negative returns
- Ideal: Slight positive skew

### Kurtosis
- Measures tail thickness
- > 3: Fat tails (more extremes)
- < 3: Thin tails (fewer extremes)
- Trading: Fat tails = more black swan risk

## 1.2 TRADE STATISTICS

### Total Trades
- Count of all opened and closed positions
- More trades = more statistical significance

### Long Trades / Short Trades
- Breakdown by direction
- Compare win rates separately

### Average Trade Duration
- Formula: Sum of (Exit Time - Entry Time) / Total Trades
- Units: Seconds, minutes, hours, days

### Maximum Consecutive Wins
- Longest winning streak
- Psychological boost

### Maximum Consecutive Losses
- Longest losing streak
- Key for position sizing (survival)

### Average Bars in Trade
- How long positions stay open on average

### Profit per Bar
- Formula: Net Profit / Total Bars in All Trades
- Efficiency metric

### Trades per Day/Week/Month
- Activity level
- Affects transaction costs

## 1.3 ADVANCED ANALYSIS METRICS

### Monte Carlo Confidence Intervals
- 95% CI: 95% of simulated outcomes fall here
- Worst Case (5th percentile): Conservative estimate
- Median: Most likely outcome
- Uses: Risk assessment, position sizing

### Walk-Forward Efficiency
- Formula: OOS Performance / IS Performance
- Interpretation:
  - 0.8-1.2: Robust (minimal overfitting)
  - < 0.5: Significant overfitting
  - > 1.5: Unusual, check data

### Optimization Robustness Score
- Based on performance plateau vs isolated peak
- Plateau = robust, Peak = fragile

### Regime Performance
- Per-regime metrics (Trend/Range/Volatile)
- Helps identify suitable market conditions

================================================================================
PART 2: COMPLETE FEATURE DOCUMENTATION
================================================================================

## 2.1 DATA MANAGEMENT (DEEP DIVE)

### CSV Import Wizard
Location: /data → Import button
Supported formats: CSV, Excel (.xlsx, .xls)
Column detection: Automatic + manual override
Required columns: Date/Time, Open, High, Low, Close
Optional columns: Volume, Tick Volume, Spread

Date format support:
- ISO 8601: 2024-01-15T14:30:00Z
- YYYY-MM-DD HH:mm:ss
- YYYY.MM.DD HH:mm:ss
- DD/MM/YYYY HH:mm
- DD-MM-YYYY HH:mm
- Unix timestamp (seconds)
- Unix milliseconds

Timezone handling:
- Source timezone: Detected or manual
- Target: UTC (recommended) or IST
- Conversion at import boundary
- All internal storage: UTC

Delimiter detection:
- Comma (,) - default
- Semicolon (;) - European
- Tab - TSV files
- Pipe (|) - rare

Row preview: First 20 rows shown
Validation: Pre-import quality check
Error handling: Row-by-row with skip option

### Dataset Quality Scanner
Location: Data Manager → Select dataset → Quality tab
Checks performed:
1. Gap Detection
   - Missing bars between timestamps
   - Excludes weekends/holidays (optional)
   - Threshold: Configurable (1-10 bars)
   
2. Duplicate Detection
   - Same timestamp rows
   - Resolution: Keep first/last/none
   
3. Outlier Detection  
   - Price spikes > 3 standard deviations
   - Volume anomalies
   - Flagged for review
   
4. Invalid Candle Detection
   - High < Low (impossible)
   - Negative prices
   - Zero volume (when volume expected)
   
5. Timestamp Validation
   - Future dates
   - Out of order
   - Weekend data (for forex)

Quality Score:
- Excellent: > 95% (green)
- Good: 85-95% (light green)
- Fair: 70-85% (yellow)
- Poor: < 70% (red)

Auto-fix options:
- Remove duplicates
- Interpolate small gaps
- Remove outliers
- Sort by timestamp

### Dataset Merge
Location: Data Manager → Select multiple → Merge
Modes:
1. Append: Combine all rows, sort by time
2. Stitch: Sequential (no overlap allowed)
3. Smart Merge: Detect overlaps, resolve conflicts

Overlap resolution:
- Keep first
- Keep last
- Average
- Drop duplicates

Gap policies:
- Allow: Merge anyway
- Warn: Show warning, proceed
- Block: Refuse until fixed

Requirements:
- Same symbol
- Same timeframe
- Compatible columns

Memory handling:
- Streaming for large files
- Up to 500MB total recommended
- Batch merge for very large sets

### Dataset Organization
Folders: Symbol-based auto-grouping
Tags: Custom labels (multi-select)
Favorites: Pin frequently used
Search: Full-text on name, symbol, tags
Sort: Date, size, name, usage count
Bulk actions: Multi-select for delete, tag, export

Coverage heatmap:
- Visual calendar of data availability
- Green = data present
- Red = gaps
- Gray = weekends/holidays

## 2.2 STRATEGY MANAGEMENT (DEEP DIVE)

### Monaco Code Editor
Features:
- Syntax highlighting (MQL4/5, Pine, JavaScript)
- Auto-complete
- Bracket matching
- Code folding
- Minimap navigation
- Find/Replace with regex
- Multiple cursors
- Theme sync with app

Validation:
- Real-time syntax check
- Red underlines for errors
- Hover for error details
- Validate button for full check

### Strategy Parameters
Definition format:
\`\`\`
// Input parameters
extern int FastMA = 10;      // Fast MA period
extern int SlowMA = 20;      // Slow MA period
extern double StopLoss = 50; // Stop loss in pips
extern double TakeProfit = 100;
\`\`\`

Parameter types:
- Integer: Whole numbers
- Double: Decimals
- String: Text
- Boolean: true/false
- Enum: Predefined options

Optimization settings:
- Start value
- End value
- Step size
- Enabled/disabled toggle

### Version Control
Auto-save: Every significant edit
Manual save: With version note
History: Unlimited versions kept
Diff viewer: Side-by-side comparison
Restore: One-click rollback
Branch: Fork from any version

Version metadata:
- Timestamp
- Change summary
- Parameter snapshot
- Performance snapshot (if tested)

### Strategy Templates
Built-in templates:
1. MA Crossover (SMA/EMA variants)
2. RSI Overbought/Oversold
3. MACD Signal Cross
4. Bollinger Band Bounce
5. Breakout (High/Low)
6. Mean Reversion
7. Trend Following
8. Momentum
9. Range Trading
10. Grid Trading
11. Martingale (with warnings)
12. Anti-Martingale
13. Dual Thrust
14. Donchian Channel
15. ATR Trailing Stop

Clone action: Duplicate to personal library
Modify: Full edit after clone

## 2.3 BACKTESTING ENGINE (DEEP DIVE)

### Execution Modes
1. Bar Close (default)
   - Orders execute at bar close price
   - Fastest simulation
   - Suitable for most strategies
   
2. OHLC Simulation
   - Simulates intra-bar movement
   - Order: Open → High/Low → Close
   - More realistic for stop/limit orders
   
3. Tick Level (if available)
   - Uses actual tick data
   - Most accurate
   - Slowest, needs tick data

### Cost Modeling
Spread:
- Fixed: Constant pips (e.g., 2)
- Variable: Range with randomization
- Dynamic: Based on time/volatility

Commission:
- Per lot: ₹ per standard lot
- Per trade: Flat fee
- Percentage: % of notional

Slippage:
- Fixed: Constant pips
- Variable: Random within range
- Market impact: Increases with size

Swap/Rollover:
- Long swap rate
- Short swap rate
- Applied at rollover time

### Progress & Monitoring
Live indicators during run:
- Progress bar with %
- Current equity curve
- Trade count
- ETA (estimated time)
- Cancel button

Background processing:
- Web Workers for non-blocking
- Queue multiple runs
- Auto-resume after interruption

### Result Storage
Saved automatically:
- Full equity curve data
- All trades with details
- Summary metrics
- Parameters used
- Dataset info
- Timestamp

Naming: Auto-generated or custom
Favorites: Star important results
Tags: Organize with labels

## 2.4 OPTIMIZATION (DEEP DIVE)

### Grid Search
How it works: Tests every combination
Best for: < 1000 combinations
Pros: Exhaustive, finds global optimum
Cons: Slow, exponential growth

Example:
- Param A: 10-50, step 10 → 5 values
- Param B: 20-100, step 20 → 5 values
- Total: 5 × 5 = 25 combinations

### Genetic Algorithm
How it works: Evolution-based optimization
Parameters:
- Population size: 50-200
- Generations: 50-500
- Mutation rate: 0.1-0.3
- Crossover rate: 0.7-0.9
- Elite preservation: Top 5-10%

Process:
1. Generate random initial population
2. Evaluate fitness (objective metric)
3. Select parents (tournament/roulette)
4. Crossover to create offspring
5. Mutate randomly
6. Replace worst with offspring
7. Repeat for N generations

Best for: Large search spaces (> 1000 combos)
Pros: Efficient, handles many params
Cons: May miss global optimum

### Particle Swarm Optimization (PSO)
How it works: Swarm intelligence
Parameters:
- Swarm size: 30-100
- Iterations: 50-200
- Inertia weight: 0.4-0.9
- Cognitive coefficient: 1.5-2.0
- Social coefficient: 1.5-2.0

Process:
1. Initialize particles with random positions
2. Evaluate fitness at each position
3. Update personal best
4. Update global best
5. Move particles toward bests
6. Repeat for N iterations

Best for: Continuous parameter spaces
Pros: Fast convergence
Cons: Can get stuck in local optima

### Bayesian Optimization
How it works: Probabilistic model
Uses: Gaussian Process surrogate
Acquisition: Expected Improvement

Process:
1. Build prior model from few samples
2. Predict promising areas
3. Sample at highest expected improvement
4. Update model
5. Repeat until budget exhausted

Best for: Expensive evaluations, few iterations
Pros: Sample efficient
Cons: Complex, slower per iteration

### Multi-Objective Optimization
Objectives: 2+ metrics simultaneously
Example: Maximize Sharpe + Minimize Drawdown
Result: Pareto frontier (trade-off curve)
Selection: Choose based on preference

### Optimization Heatmap
Visualization: 2D color grid
X-axis: Parameter A values
Y-axis: Parameter B values
Color: Objective metric value
Use: Identify robust regions (not isolated peaks)

Robust indicators:
- Wide colored regions = stable
- Isolated hot spots = overfitting risk
- Gradual transitions = good

### Convergence Chart
X-axis: Generation/Iteration
Y-axis: Best fitness so far
Use: Detect premature convergence

Good signs:
- Gradual improvement
- Slowing but continuing
- Final plateau

Bad signs:
- Immediate plateau
- Erratic jumps
- No convergence

## 2.5 WALK-FORWARD ANALYSIS (DEEP DIVE)

### Concept
Purpose: Out-of-sample validation
Method: Rolling optimization + testing

### Configuration
In-Sample (IS) %: 60-80% (optimization)
Out-of-Sample (OOS) %: 20-40% (testing)
Windows: 4-12 periods
Mode: Rolling or Anchored

### Process
1. Split data into N windows
2. For each window:
   - Optimize on IS portion
   - Test best params on OOS portion
   - Record OOS performance
3. Aggregate OOS results
4. Compare IS vs OOS

### Metrics
Walk-Forward Efficiency:
- Formula: Avg OOS / Avg IS metric
- Good: 0.7 - 1.3
- Overfitting: < 0.5
- Anomaly: > 1.5

Consistency:
- How many windows profitable
- 80%+ = robust

### Interpretation
High IS, Low OOS: Overfitting
Similar IS and OOS: Robust strategy
Variable OOS: Market regime dependency

### Anchored vs Rolling
Anchored: IS always starts from beginning
Rolling: IS window slides forward
Anchored: More data, slower adaptation
Rolling: Less data, faster adaptation

## 2.6 MONTE CARLO SIMULATION (DEEP DIVE)

### Concept
Purpose: Stress test via randomization
Methods: Trade reordering, random sampling

### Configuration
Iterations: 1000-10000
Method: Shuffle trades, bootstrap sampling
Seed: Optional for reproducibility

### Process
1. Take original trade sequence
2. Randomly reorder N times
3. Calculate equity curve for each
4. Build distribution of outcomes
5. Extract confidence intervals

### Outputs
Equity paths:
- Best case (95th percentile)
- Median case (50th)
- Worst case (5th percentile)

Drawdown distribution:
- Expected max DD at 95% confidence
- Probability of various DD levels

Return distribution:
- Expected return range
- Standard deviation of outcomes

### Interpretation
Tight confidence bands: Consistent strategy
Wide bands: Order-dependent, risky
High worst-case DD: Reduce position size

### Position Sizing Decision
If 95% worst DD > Risk tolerance:
- Reduce position size
- Formula: New Size = Current × (Tolerance / Worst DD)

## 2.7 PORTFOLIO ANALYSIS (DEEP DIVE)

### Correlation Matrix
Purpose: Measure strategy relationships
Values: -1 to +1
- +1: Perfect positive (move together)
- 0: Uncorrelated (independent)
- -1: Perfect negative (opposite)

Interpretation:
- Green (< 0.3): Good diversification
- Yellow (0.3-0.7): Moderate correlation
- Red (> 0.7): Redundant strategies

### Portfolio Optimization
Objectives:
1. Maximum Sharpe: Best risk-adjusted return
2. Minimum Variance: Lowest volatility
3. Risk Parity: Equal risk contribution
4. Maximum Diversification: Lowest correlation

Constraints:
- Min/Max weight per strategy
- Total weight = 100%
- Optional: Sector limits

### Efficient Frontier
What: Set of optimal portfolios
How: Different risk levels, max return each
Use: Choose based on risk tolerance

## 2.8 RISK MANAGEMENT (DEEP DIVE)

### Position Sizing Methods

Fixed Fractional:
- Risk fixed % per trade
- Formula: Size = (Account × Risk%) / Stop Loss Distance
- Common: 1-2% per trade
- Pros: Consistent risk
- Cons: Slow growth

Kelly Criterion:
- Formula: f* = W - (1-W)/R
- W = Win Rate, R = Win/Loss Ratio
- Pros: Optimal growth
- Cons: Aggressive, high volatility
- Recommendation: Use Half-Kelly (f*/2)

Optimal f:
- Formula: Maximizes geometric growth
- Similar to Kelly but empirical
- Based on historical trades

Fixed Lot:
- Same size every trade
- Pros: Simple
- Cons: Doesn't adapt to account changes

### Risk of Ruin Calculation
Formula (approximation):
RoR = ((1-Edge)/(1+Edge))^Units

Where:
- Edge = (WinRate × AvgWin - LossRate × AvgLoss) / AvgLoss
- Units = Max Acceptable DD% / Risk per Trade%

Interpretation:
- RoR < 1%: Negligible risk
- RoR 1-5%: Low risk
- RoR 5-20%: Moderate risk
- RoR > 20%: High risk

### Drawdown Management
Alert thresholds:
- Warning: 50% of max tolerance
- Critical: 80% of max tolerance
- Stop: 100% of max tolerance

Actions:
- Reduce size at warning
- Stop new trades at critical
- Full stop at limit

## 2.9 CALCULATORS (DEEP DIVE)

### Position Size Calculator
Inputs:
- Account Balance (₹)
- Risk Per Trade (%)
- Entry Price
- Stop Loss Price
- Method (Fixed Fractional / Kelly)

For Kelly, also needs:
- Win Rate (%)
- Average Win/Loss Ratio

Output:
- Risk Amount (₹)
- Stop Loss Distance (points)
- Position Size (units/lots)
- Kelly Fraction (if applicable)

Example:
- Account: ₹100,000
- Risk: 2%
- Entry: 100
- Stop: 95
- Risk Amount: ₹2,000
- SL Distance: 5 points
- Position Size: 400 units

### Risk of Ruin Calculator
Inputs:
- Win Rate (%)
- Risk Per Trade (%)
- Win/Loss Ratio
- Max Acceptable Drawdown (%)

Output:
- Edge Per Trade (%)
- Units to Ruin
- Risk of Ruin (%)
- Risk Assessment (Low/Moderate/High)

### Compound Interest Calculator
Inputs:
- Initial Investment (₹)
- Annual Rate (%)
- Investment Period (years)
- Monthly Contribution (₹)

Formula:
Future Value = P(1 + r/n)^(nt) + PMT × ((1 + r/n)^(nt) - 1) / (r/n)

Where:
- P = Principal
- r = Annual rate
- n = Compounds per year (12)
- t = Years
- PMT = Monthly payment

Output:
- Future Value
- Total Contributions
- Total Interest Earned
- Growth Percentage

### Break-Even Calculator
Inputs:
- Entry Price
- Quantity
- Total Commission (buy + sell)
- Spread Cost Per Unit

Formula:
Break-Even = Entry + (Total Costs / Quantity)

Output:
- Total Costs
- Break-Even Price
- Required Move (%)

### Fibonacci Calculator
Inputs:
- High Price
- Low Price
- Direction (Uptrend/Downtrend)

Retracement Levels:
- 0% (High or Low depending on direction)
- 23.6%
- 38.2%
- 50%
- 61.8%
- 78.6%
- 100%

Extension Levels:
- 127.2%
- 161.8%
- 200%
- 261.8%

### Pivot Point Calculator
Methods:
1. Standard (Classic)
   - Pivot = (H + L + C) / 3
   - S1 = 2P - H
   - R1 = 2P - L
   - S2 = P - (H - L)
   - R2 = P + (H - L)
   - S3 = L - 2(H - P)
   - R3 = H + 2(P - L)

2. Woodie
   - Pivot = (H + L + 2C) / 4
   - (Different S/R formulas)

3. Camarilla
   - Uses 1.1/12 and 1.1/6 multipliers
   - Tighter levels, good for scalping

## 2.10 SIMULATORS (DEEP DIVE)

### Monte Carlo Simulator
Location: /simulators → Monte Carlo tab
Inputs:
- Historical trades (from results)
- Iterations (1000-10000)
- Confidence level (90%, 95%, 99%)

Process:
1. Load trade history
2. Shuffle trade order N times
3. Calculate equity curve each time
4. Build distribution of final equities
5. Calculate confidence intervals

Outputs:
- Equity path chart (fan shape)
- Best/Median/Worst final equity
- Max drawdown distribution
- Probability of hitting targets

### What-If Analysis
Location: /simulators → What-If tab
Purpose: Impact of changing stats

Sliders:
- Win Rate adjustment (±20%)
- R:R adjustment (±50%)
- Trade count adjustment

Real-time recalculation:
- New expectancy
- New profit factor
- New estimated returns

Use cases:
- "What if I improve win rate by 5%?"
- "What if R:R drops due to slippage?"

### Equity Curve Simulator
Location: /simulators → Equity Curve tab
Purpose: Project future growth

Inputs:
- Starting capital
- Expected monthly return (%)
- Volatility estimate (%)
- Projection period (months)
- Number of paths to simulate

Output:
- Projected equity paths
- Confidence bands
- Probability of reaching goals

## 2.11 DEVELOPER TOOLS (DEEP DIVE)

### JSON Editor
Location: /dev-tools → JSON tab
Features:
- Syntax highlighting
- Auto-formatting (prettify)
- Validation
- Tree view
- Search/replace
- Copy formatted

Uses:
- Edit raw strategy configs
- Modify exported data
- Debug data structures

### Regex Tester
Location: /dev-tools → Regex tab
Features:
- Pattern input
- Test string input
- Real-time matching
- Capture group display
- Flag toggles (g, i, m)
- Common patterns library

Uses:
- Test scanner patterns
- Validate input formats
- Extract data

### LocalStorage Viewer
Location: /dev-tools → Storage tab
Features:
- View all keys
- Edit values
- Delete entries
- Export all
- Size calculation

Stored items:
- User preferences
- Theme settings
- Sidebar state
- Feature flags
- Cache data

### Timestamp Converter
Location: /dev-tools → Timestamp tab
Conversions:
- Unix (seconds) ↔ Human readable
- Unix (milliseconds) ↔ Human readable
- ISO 8601 ↔ Unix
- Timezone adjustments

### Base64 Tool
Location: /dev-tools → Base64 tab
Operations:
- Encode text → Base64
- Decode Base64 → text
- Encode file → Base64
- Decode Base64 → file

Uses:
- Share configs
- Embed data
- Debug encoded payloads

================================================================================
PART 3: TROUBLESHOOTING MATRIX
================================================================================

## IMPORT ISSUES
| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Import fails immediately | Wrong file format | Use CSV or XLSX only |
| Column mapping wrong | Auto-detect failed | Manual mapping |
| Date parse error | Unusual format | Specify format in dropdown |
| Stuck at 99% | Large file processing | Wait 2 min, check memory |
| Empty after import | Wrong timezone | Adjust timezone setting |
| Duplicates warning | Overlapping data | Use append mode |

## BACKTEST ISSUES
| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| No trades | Entry conditions never met | Check strategy logic |
| Very few trades | Date range too narrow | Expand date range |
| All trades lose | Strategy bug | Validate code, check logic |
| Results blank | Query/parse error | Check network, refresh |
| Slow performance | Too much data | Use smaller date range |
| Timeout | Memory exceeded | Reduce dataset size |

## OPTIMIZER ISSUES
| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Takes forever | Too many combinations | Use Genetic instead of Grid |
| No improvement | Search space wrong | Expand parameter ranges |
| All results same | Step size too large | Decrease step size |
| Isolated peaks | Overfitting | Use Walk-Forward validation |
| Memory crash | Large population | Reduce pop size |

## CONNECTION ISSUES
| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Auth fails | Session expired | Re-login |
| Sync stuck | Network issue | Check internet, retry |
| 401 errors | Token expired | Re-authenticate |
| CORS errors | URL mismatch | Clear cache |
| Offline mode broken | PWA corrupted | Reinstall PWA |

## BROKER ISSUES
| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Zerodha disconnect | Token expired | Daily re-auth required |
| Order rejected | Margin/hours | Check balance, market hours |
| Position missing | Sync delay | Manual sync button |
| Rate limited | Too fast | Wait and retry |

================================================================================
PART 4: BEST PRACTICES & TIPS
================================================================================

## DATA BEST PRACTICES
1. Always use quality score > 90% data
2. Prefer UTC timezone storage
3. Backup before major merges
4. Tag datasets for organization
5. Minimum 1000 bars for backtest
6. 5000+ bars for optimization
7. Check for survivorship bias

## STRATEGY BEST PRACTICES
1. Keep strategies simple (< 5 parameters)
2. Version control all changes
3. Document with comments
4. Use meaningful parameter names
5. Set reasonable min/max ranges
6. Test on multiple timeframes

## BACKTEST BEST PRACTICES
1. Always include realistic costs
2. Use slippage (1-3 pips typical)
3. Don't optimize on full dataset
4. Reserve 20-30% for validation
5. Check trade count (min 100)
6. Verify logic with manual trades

## OPTIMIZATION BEST PRACTICES
1. Start wide, narrow down
2. Use Genetic for > 1000 combos
3. Look for plateaus not peaks
4. Validate with Walk-Forward
5. Check multiple objectives
6. Beware of isolated optima

## RISK BEST PRACTICES
1. Never risk > 2% per trade
2. Use Half-Kelly for sizing
3. Keep max DD tolerance < 20%
4. Diversify across strategies
5. Monitor correlation
6. Have stop-trading rules

================================================================================
PART 5: KEYBOARD SHORTCUTS COMPLETE LIST
================================================================================

Global:
- Ctrl/Cmd + K: Command palette
- Ctrl/Cmd + B: Toggle sidebar
- Ctrl/Cmd + /: Help
- Esc: Close modal/drawer

Navigation (G then...):
- G then D: Data Manager
- G then S: Strategies
- G then B: Backtest
- G then R: Results
- G then O: Optimizer
- G then A: Analytics
- G then P: Portfolio
- G then J: Journal
- G then T: Settings

Editor:
- Ctrl/Cmd + S: Save
- Ctrl/Cmd + Z: Undo
- Ctrl/Cmd + Shift + Z: Redo
- Ctrl/Cmd + F: Find
- Ctrl/Cmd + H: Replace

Tables:
- Arrow keys: Navigate cells
- Enter: Edit cell
- Tab: Next cell
- Shift + Tab: Previous cell

================================================================================
PART 6: GLOSSARY
================================================================================

Alpha: Excess return beyond market exposure
ATR: Average True Range - volatility indicator
Backtesting: Testing strategy on historical data
Beta: Sensitivity to market movements
CAGR: Compound Annual Growth Rate
Calmar: CAGR divided by Max Drawdown
CVaR: Conditional VaR / Expected Shortfall
Drawdown: Peak-to-trough decline in equity
Edge: Mathematical advantage per trade
Expectancy: Average profit per trade
Genetic Algorithm: Evolution-based optimization
In-Sample: Data used for optimization
Kelly: Optimal bet sizing formula
Monte Carlo: Random simulation technique
MQL: MetaQuotes Language
OOS: Out-of-sample (validation data)
Pareto: Set of optimal trade-offs
PineScript: TradingView's language
Profit Factor: Gross Profit / Gross Loss
PSO: Particle Swarm Optimization
R:R: Risk-Reward Ratio
RLS: Row Level Security (Supabase)
Sharpe: Risk-adjusted return metric
Slippage: Difference between expected and actual execution
Sortino: Like Sharpe but downside only
Spread: Bid-ask difference
VaR: Value at Risk
Walk-Forward: Rolling optimization validation
Win Rate: Percentage of winning trades

================================================================================
PART 7: ADVANCED WORKFLOW PATTERNS & RECIPES
================================================================================

## 7.1 COMPLETE WORKFLOW RECIPES

### Recipe: First-Time User Setup (0 to First Backtest)
1. Sign up / Log in
2. Navigate to /workflow (main page)
3. Step 1 - Upload CSV:
   - Click "Upload" or drag-and-drop
   - Preview column mapping → Confirm
   - Wait for quality scan
4. Step 2 - Add Strategy:
   - Option A: Paste MQL5 EA code
   - Option B: Select from Templates (MA Crossover recommended)
   - Validate code (green checkmark)
5. Step 3 - Configure:
   - Initial Capital: ₹100,000 (or your amount)
   - Spread: 2 pips (forex), 0.05% (equity)
   - Commission: As per broker
   - Slippage: 1 pip
6. Step 4 - Run:
   - Click "Run Backtest"
   - Watch live equity curve
   - Wait for completion
7. Results:
   - Check Net Profit, Sharpe, Max DD
   - Export PDF tearsheet
   - Save to results library

### Recipe: Strategy Development Lifecycle
Phase 1 - Idea:
  - Identify market inefficiency
  - Define entry/exit rules on paper
  - Choose timeframe and asset class

Phase 2 - Code:
  - Use Strategy Library → New
  - Code in Monaco editor or use template
  - Define parameters with ranges
  - Validate syntax

Phase 3 - Initial Backtest:
  - Use 70% of data (In-Sample)
  - Set realistic costs
  - Run and check basic metrics
  - If Profit Factor < 1 → rethink logic

Phase 4 - Optimization:
  - Optimizer → Select strategy + dataset
  - Start with Grid (small space) or Genetic (large)
  - Check heatmap for robust regions
  - Pick parameters from plateau, not peak

Phase 5 - Validation:
  - Walk-Forward Analysis on remaining 30%
  - Check WF Efficiency > 0.7
  - Run Monte Carlo (1000+ iterations)
  - Check 95% worst-case DD < tolerance

Phase 6 - Paper Trading:
  - Enable Paper Trading mode
  - Run for 2-4 weeks minimum
  - Compare with backtest expectations
  - Check for execution differences

Phase 7 - Live Deployment:
  - Connect Zerodha via Execution Bridge
  - Start with 25% of intended capital
  - Monitor daily via Risk Dashboard
  - Scale up after 1 month if consistent

### Recipe: Multi-Strategy Portfolio Construction
1. Develop 3-5 uncorrelated strategies
2. Backtest each independently
3. Portfolio Builder → Add all strategies
4. Check Correlation Matrix:
   - All pairs < 0.3 = ideal
   - Remove if > 0.7
5. Weight allocation:
   - Start with Equal Weight
   - Try Risk Parity for advanced
   - Run Portfolio Optimization for optimal
6. Check combined metrics:
   - Combined Sharpe should be > individual
   - Combined DD should be < worst individual
7. Set rebalancing: Quarterly with 5% drift trigger
8. Monitor via Risk Dashboard

### Recipe: Debugging a Losing Strategy
1. Check basic metrics first:
   - Is Expectancy negative? → Fundamentally broken
   - Is Win Rate OK but R:R bad? → Exits need work
   - Is R:R OK but Win Rate low? → Entries need work
2. Trade-level analysis:
   - Filter losing trades by time
   - Any pattern? (specific hours, days?)
   - Filter by duration → Are long trades losers?
3. Regime analysis:
   - Run Regime Detection
   - Is strategy losing in specific regimes?
   - Add regime filter to code
4. Parameter sensitivity:
   - Run optimization with narrow ranges
   - Is performance sensitive to small changes?
   - If yes → overfitting
5. Data quality check:
   - Run Quality Scanner
   - Gaps during key events?
   - Timezone correct?

## 7.2 ADVANCED INDICATOR COMBINATIONS

### Trend + Momentum + Volume (TMV) Framework
Entry:
- Trend: EMA 50 > EMA 200 (bullish structure)
- Momentum: RSI crosses above 50
- Volume: Above 20-period average
Exit:
- RSI > 70 (overbought) OR
- EMA 50 < EMA 200 (trend reversal) OR
- Trailing stop at 2 × ATR

### Mean Reversion with Bollinger + RSI
Entry (Long):
- Price touches lower Bollinger Band (2 StdDev)
- RSI < 30 (oversold)
- Volume spike > 1.5 × average
Exit:
- Price reaches middle band (SMA 20) OR
- RSI > 50 OR
- Time stop: 5 bars

### Breakout with Volume Confirmation
Entry:
- Price closes above 20-bar high
- Volume > 2 × average
- ATR expanding (current > 1.5 × 10-bar avg)
Exit:
- Trailing stop: 3 × ATR
- Or opposite breakout

## 7.3 PERFORMANCE TUNING GUIDE

### App Performance
- Large datasets (> 500K rows): Use chunked loading
- Many strategies: Archive unused ones
- Slow UI: Clear browser cache, close tabs
- IndexedDB growing: Prune old caches via Dev Tools → Storage

### Backtest Performance
- Speed up: Use Bar-Close mode (not tick)
- Reduce data range for initial testing
- Enable Web Workers (auto-detected)
- Close other tabs during heavy runs

### Optimization Performance
- Grid Search: Keep total combinations < 5000
- Genetic: Population 100, Generations 100 max
- PSO: Swarm 50, Iterations 100 max
- Use Random Search first to identify promising ranges
- Then narrow with Grid or Genetic

## 7.4 DATA PREPARATION MASTERCLASS

### Ideal Dataset Properties
- Duration: 3-5 years minimum (covers bull + bear + sideways)
- Quality: Score > 95% (no gaps during market hours)
- Granularity: Match strategy timeframe (don't use 1H data for scalping)
- Source: Official exchange data or reputable providers
- Timezone: UTC (convert IST at boundary)

### Common Data Pitfalls
1. Survivorship bias: Only using currently listed instruments
2. Look-ahead bias: Using future data in signals
3. Selection bias: Cherry-picking favorable periods
4. Data snooping: Testing too many ideas on same data
5. Corporate actions: Splits, dividends not adjusted

### Data Quality Checklist
Before every backtest, verify:
□ No weekend data (for forex)
□ No holiday data
□ No negative prices
□ High > Low for every candle
□ Volume > 0 (if volume strategy)
□ No gaps > 3 bars during market hours
□ Correct timezone
□ Column mapping verified
□ Quality score > 90%

## 7.5 REPORT GENERATION GUIDE

### Professional Tearsheet Contents
Page 1 (Summary):
- Strategy name, version, date range
- Key metrics: Net Profit, Sharpe, Max DD, PF, Win Rate
- Equity curve chart
- Monthly returns heatmap

Page 2 (Detail):
- Trade statistics table
- Drawdown analysis
- Win/Loss distribution
- Duration analysis

Page 3 (Risk):
- VaR and CVaR
- Monte Carlo confidence bands
- Stress test results
- Position sizing recommendations

### Custom Report Templates
1. Create custom template: Report Generator → Template Builder
2. Drag sections: Metrics, Charts, Tables
3. Brand it: Logo, colors, fonts
4. Save template for reuse
5. Batch generate across multiple results

## 7.6 SECURITY & PRIVACY DEEP DIVE

### Data Protection
- All market data stored locally (IndexedDB)
- Encrypted with browser-level security
- Cloud sync uses end-to-end encryption
- No server-side access to raw data
- GDPR compliant data handling

### Authentication Security
- Email + Password authentication
- Session timeout: 1 hour idle
- Active session: 7 days
- Password reset via email
- No API key exposure to client

### Workspace Security
- Invite tokens: 7-day expiry, single-use
- Role-based access: Owner > Admin > Editor > Viewer
- Activity logging: All actions recorded
- Member removal: Immediate access revocation
- Data isolation: Workspaces are separate containers

### Broker Connection Security
- OAuth 2.0 for Zerodha
- Tokens encrypted in database vault
- Daily token rotation (Zerodha requirement)
- No passwords stored
- Revocation capability

## 7.7 MOBILE & PWA GUIDE

### Installing PWA
Chrome (Android/Desktop):
1. Open MMC URL in Chrome
2. Click install icon in address bar
3. Or: Menu → Install app
4. App appears on home screen

Safari (iOS):
1. Open MMC URL in Safari
2. Share button → Add to Home Screen
3. Confirm name
4. Opens as standalone app

### Mobile-Specific Features
- Bottom navigation: Home, Data, Workflow, Results, Menu
- Swipe gestures: Navigate between tabs
- Pull-to-refresh: Update current view
- Touch-friendly: Larger tap targets
- Responsive charts: Pinch to zoom
- Offline mode: Full functionality without internet

### Offline Capabilities
Available offline:
- View all local datasets
- Browse strategies
- View saved results
- Access calculators
- Use Dev Tools

Requires internet:
- Cloud sync
- Broker connections
- AI features (Sentinel)
- Marketplace
- Workspace sync

## 7.8 ADMIN PANEL GUIDE

### Admin Dashboard (/admin)
Access: Admin role required
Modules:
1. Overview: KPI cards, quick actions
2. Config Center: App-wide settings
3. Feature Flags: Toggle features, kill switches
4. Audit Trail: Immutable action log
5. User Management: Roles, access
6. System Health: DB, API, storage status

### Feature Flags
Types:
- Standard toggle: Enable/disable feature
- Kill switch: Emergency disable
- Rollout: Percentage-based gradual release
- Target groups: Beta, premium, all

### Config Center
Categories:
- General: App name, version, limits
- Limits: Rate limits, quotas
- AI: Model settings, prompts
- Security: Session timeout, password rules
- Appearance: Default theme, branding

### Audit Trail
Records:
- Who did what, when
- Before/after data snapshots
- Filterable by user, action, entity
- Exportable for compliance
- Immutable (cannot be deleted)

================================================================================
PART 8: INDIAN MARKET SPECIFIC GUIDE
================================================================================

## 8.1 NSE/BSE SPECIFIC
- Trading hours: 9:15 AM - 3:30 PM IST
- Pre-open session: 9:00 - 9:15 AM
- Lot sizes: Vary by instrument
- Circuit limits: 2%, 5%, 10%, 20%
- Settlement: T+1 for equity
- Timeframes: Use IST, convert to UTC for storage

## 8.2 ZERODHA INTEGRATION SPECIFICS
- Kite Connect API: v3
- Token expiry: Daily at 6:00 AM IST
- Re-auth required: Every morning
- Rate limit: ~3 requests/second
- Order types: Market, Limit, SL, SL-M
- Instruments: NSE, BSE, MCX, CDS
- API subscription: ₹2000/month

## 8.3 COMMON INDIAN INSTRUMENTS
- NIFTY 50: Index trading
- BANKNIFTY: High volatility index
- RELIANCE, TCS, INFY: Large caps
- Gold (MCX): Commodity
- USDINR: Currency pair

## 8.4 COST STRUCTURE (INDIA)
Equity Delivery:
- Brokerage: ₹20 or 0.03% (Zerodha)
- STT: 0.1% on buy + sell
- Exchange txn: 0.00345%
- GST: 18% on brokerage
- SEBI: ₹10 per crore
- Stamp: 0.015% (buy side)

F&O:
- Brokerage: ₹20 per order
- STT: 0.05% on sell side
- Exchange txn: 0.05%
- GST: 18% on brokerage

================================================================================
PART 9: COPILOT CONVERSATION PATTERNS
================================================================================

## 9.1 GREETING PATTERNS
When user says hello/hi/namaste:
- Greet warmly in Hinglish
- Ask what they're working on
- Suggest common actions

## 9.2 ERROR PATTERNS
When user reports error:
1. Ask for error message (if not provided)
2. Check common causes from troubleshooting matrix
3. Provide 2-3 hypotheses
4. Give step-by-step fix

## 9.3 LEARNING PATTERNS
When user asks "what is X":
1. Define clearly in 1-2 lines
2. Give formula if applicable
3. Give interpretation ranges
4. Give practical example
5. Status: Implemented/Coming Soon

## 9.4 WORKFLOW PATTERNS
When user asks "how to do X":
1. Give exact navigation path
2. Step-by-step with numbers
3. Include prerequisites
4. Mention common gotchas
5. End with next logical step

## 9.5 COMPARISON PATTERNS
When user asks "X vs Y":
1. Define both briefly
2. Key differences (table format)
3. When to use each
4. Recommendation with reasoning

## 9.6 DEBUGGING PATTERNS
When user says "not working / error / fail":
1. Don't guess - ask for specifics
2. Start with read-only investigation
3. Form hypotheses
4. Minimal fix suggestion
5. Regression checklist

================================================================================
PART 10: COMPLETE PAGE REFERENCE
================================================================================

Every page in MMC with exact path and purpose:

| Path | Page | Purpose |
|------|------|---------|
| / | Dashboard/Home | Landing, KPIs, quick actions |
| /workflow | Backtest Workflow | 4-step guided backtest |
| /data | Data Manager | Upload, manage, quality check data |
| /import | Import Wizard | CSV/Excel import flow |
| /strategies | Strategy Library | Manage all strategies |
| /strategy-library | Strategy Browser | Browse and filter strategies |
| /backtests | Backtest History | View past runs |
| /saved-results | Saved Results | Browse saved results |
| /analytics | Analytics | Performance charts and metrics |
| /advanced-analytics | Advanced Analytics | Monte Carlo, WF, Regime |
| /optimizer | Optimizer | Parameter optimization |
| /advanced-optimizer | Advanced Optimizer | GA, PSO, Bayesian |
| /walk-forward | Walk-Forward | OOS validation |
| /portfolio-builder | Portfolio Builder | Multi-strategy portfolios |
| /risk-dashboard | Risk Dashboard | Risk metrics and alerts |
| /position-sizing | Position Sizing | Calculator for sizing |
| /calculators | Calculators | All financial calculators |
| /simulators | Simulators | Monte Carlo, What-If |
| /scanner | Scanner | Rule-based scanning |
| /sentinel | Sentinel AI | AI chat assistant |
| /pattern-recognition | Patterns | Candlestick/chart patterns |
| /execution-bridge | Execution Bridge | Broker connections |
| /paper-trading | Paper Trading | Simulated trading |
| /workspace-dashboard | Workspace | Team collaboration |
| /strategy-marketplace | Marketplace | Buy/sell strategies |
| /report-generator | Reports | Custom report builder |
| /tearsheet | Tearsheet | One-page PDF report |
| /export-center | Export Center | Bulk export hub |
| /trade-journal | Journal | Trading diary |
| /alerts | Alerts | Alert management |
| /settings | Settings | App configuration |
| /profile | Profile | User profile |
| /logs | Logs | Debug logs viewer |
| /dev-tools | Dev Tools | Developer utilities |
| /feature-registry | Feature Registry | All features status |
| /app-guide | App Guide | Documentation + PDF |
| /tutorials | Tutorials | Video tutorials |
| /faq | FAQ | Common questions |
| /admin | Admin Panel | Admin-only management |
| /achievements | Achievements | Gamification badges |
| /system-check | System Check | Health diagnostics |
| /premium | Premium | Subscription info |
| /leaderboard | Leaderboard | Community rankings |
| /bulk-tester | Bulk Tester | Batch testing |
| /stress-testing | Stress Testing | Crisis simulations |
| /quick-compare | Quick Compare | Side-by-side comparison |
| /live-tracker | Live Tracker | Real-time positions |
| /cloud-sync | Cloud Sync | Sync management |
| /cloud-dashboard | Cloud Dashboard | Cloud usage stats |
| /trading-dashboard | Trading Dashboard | Live trade journal dashboard |
| /ai-copilot | AI Trade Copilot | AI chat for trade analysis |
| /prop-firm | Prop Firm Tracker | Challenge monitoring |

================================================================================
PART 11: NEW FEATURES (2026 UPDATE)
================================================================================

## 11.1 TRADING DASHBOARD (/trading-dashboard)

Full-featured trade journaling and analytics dashboard with customizable widgets.

### KPI Cards (8 metrics)
- Total P&L (₹), Win Rate (%), Profit Factor, Total Trades
- Average Win, Average Loss, Best Trade, Worst Trade
- Live data from Supabase trades table
- Color-coded: Green for profit, Red for loss

### Equity Curve
- Recharts line chart of cumulative P&L over time
- Hover for exact values with ₹ formatting
- Based on actual trade exit timestamps

### P&L Calendar Heatmap
- 3-month rolling calendar view
- Color intensity based on daily P&L
- Green = profit days, Red = loss days
- Click day for trade details

### Risk Budget Calculator
- Set daily risk budget (e.g., ₹2000)
- Shows per-trade allocation based on open trades
- Visual progress bar of risk used

### Tilt Detection Engine
- Analyzes recent trade patterns for emotional trading
- Status badges: CALM, CAUTION, TILT
- Detects: Rapid trading, revenge trading, oversize positions
- Rules-based (no AI, runs locally)

### Drawdown Analyzer
- Chart of drawdown periods over time
- Table of all drawdown periods with depth, duration, recovery
- Identifies worst drawdown automatically

### Session × Day Heatmap
- Grid: Sessions (Asia/London/NY/Late NY) × Days (Mon-Fri)
- Color = average P&L per cell
- Identifies best/worst session-day combos

### AI Playbook
- Automatically detects trading patterns from trade history
- Patterns: By symbol, strategy, setup type, direction, session
- Shows win rate, avg P&L, trade count per pattern
- Confidence scoring

### Period Comparison
- Compare metrics across different time periods
- Presets: This Week vs Last Week, This Month vs Last Month, This Quarter vs Last Quarter
- Delta arrows showing improvement/decline
- Metrics: P&L, Win Rate, Avg Trade, Trade Count

### Tag Analysis
- Analyzes trades grouped by tags
- Shows: Trade count, Win Rate, Total P&L, Profit Factor per tag
- Identifies best and worst performing tags

### Dashboard Customizer
- Toggle 19+ widgets on/off
- Persisted in localStorage
- Categories: Core Analytics, Advanced Analytics, AI Features, New Features

## 11.2 SLIPPAGE TRACKER (Widget)
- Monitors execution quality
- Compares planned entry vs actual entry
- Compares planned SL vs actual exit
- Calculates slippage in pips/points
- Visual chart of slippage over time
- Based on stop_loss, entry_price, exit_price from trades

## 11.3 PORTFOLIO HEAT MAP (Widget)
- Visual treemap/grid of symbol-level performance
- Shows: Total P&L, Win Rate, Trade Count per symbol
- Color-coded by profitability
- Size proportional to trade count
- Quick identification of best/worst instruments

## 11.4 MARKET REGIME DETECTOR (Widget)
- Identifies current market phase from recent trades
- Regimes: Trending, Ranging, Volatile
- Uses trade P&L patterns and volatility
- Recharts visualization of regime history
- Performance breakdown per regime

## 11.5 WIN PROBABILITY METER (Widget)
- Circular SVG gauge showing current win probability
- Based on recent trade history (last N trades)
- Color gradient: Red (low) → Yellow (mid) → Green (high)
- Shows exact percentage and trend

## 11.6 AI TRADE REPLAY (Widget)
- Chronological stepper through trade history
- For each trade: entry/exit details, P&L, duration
- AI-generated commentary for notable trades
- Navigate forward/backward through trades
- Helps identify patterns in trade execution

## 11.7 AI INSIGHTS HUB (Widget)
- Centralized AI analysis panel with multiple modes:
  1. Weekly Report: AI-generated performance summary
  2. Position Sizing: Kelly Criterion recommendations based on stats
  3. Risk Alerts: AI identifies concerning patterns
  4. Exit Advisor: Suggestions for improving exits
  5. Pattern Discovery: AI finds hidden correlations
- Uses Lovable AI (gemini-3-flash-preview) via edge function
- Real trade data context sent for personalized insights

## 11.8 MENTOR MODE (Widget)
- Gamified trading improvement system
- 6 levels: Beginner → Intermediate → Advanced → Expert → Master → Elite
- XP system: Points earned for completing challenges
- Challenges: Achieve win rate targets, maintain discipline, reduce drawdown
- Progress tracking with visual level indicator

## 11.9 TRADE TEMPLATES
- Save common trade setups as reusable templates
- Fields: Name, Symbol, Direction, Entry/Exit/SL/TP, Quantity, Notes, Tags
- Quick-apply to new trades
- CRUD operations with localStorage persistence
- Templates list with one-click application

## 11.10 TRADINGVIEW EMBED (Widget)
- Live TradingView chart embedded in dashboard
- Symbol selector (NIFTY, BANKNIFTY, RELIANCE, etc.)
- Timeframe selector (1m to 1M)
- Dark theme matching app aesthetic
- Lightweight widget (no TradingView account needed)

## 11.11 MULTI-ACCOUNT SWITCHER (Widget)
- Switch between connected broker accounts
- Shows account status, type, last sync
- Integrates with broker_connections table
- Visual account cards with connection status
- Quick connect/disconnect actions

## 11.12 AI TRADE COPILOT (/ai-copilot)
- Full conversational AI for trade analysis
- Sends real trade data as context (P&L, win rate, symbols, patterns)
- Hinglish response style
- Quick prompt suggestions (auto-send on click)
- Markdown rendering for formatted responses
- Rate limit and credit handling (429/402 errors)
- Uses Lovable AI gateway

## 11.13 PROP FIRM CHALLENGE TRACKER
- Track prop firm challenges (FTMO, Topstep, etc.)
- Monitor: Balance, P&L, DD limits, profit targets
- Visual progress bars for each metric
- Phase tracking (Phase 1, Phase 2, Live)
- Rules configuration per firm
- Daily DD and Total DD monitoring

## 11.14 TRADING JOURNAL (/trading-dashboard)
- Full trade journal with Supabase persistence
- Trade entry: Symbol, Direction, Entry/Exit, Quantity, Fees, Notes
- Auto-calculated: P&L, Net P&L, Duration
- Tags and emotions tracking
- Quality score and trade grading
- Screenshot attachment support
- CSV import for bulk trade upload

================================================================================
PART 12: HEADLESS MT5 RUNNER INFRASTRUCTURE (2026 Q1)
================================================================================

## 12.1 OVERVIEW — OPTION A: HEADLESS MT5 RUNNER

MMC now supports running compiled MT5 Expert Advisors (.ex5) on remote VPS
without the user needing MT5 open locally. The architecture:

User → MMC UI → Backend (Edge Functions) → Command Queue → Runner Agent (VPS) → MT5 Controller EA → MT5 Terminal

Core journey:
1. Register a Runner (VPS machine)
2. Add Terminals (MT5 instances on that Runner)
3. Upload EAs to EA Library
4. Create Presets (template configs)
5. Start a Run (EA + Symbol + TF + Account)
6. Monitor via Run Console (status, heartbeats, logs, trades)
7. Stop / Panic Stop as needed

## 12.2 RUNNERS & TERMINALS (/runners)

### Runner Registration
Location: /runners → "Register Runner" button
Flow:
1. Enter runner name (e.g., "VPS-Mumbai-01")
2. Select OS (Windows required for MT5)
3. Optional: IP hint for identification
4. System generates a unique runner_key (UUID)
5. runner_key shown ONCE — copy it immediately
6. Runner Agent on VPS uses this key for authentication

Runner States:
- online: Heartbeat received within 60 seconds
- degraded: No heartbeat for 60s-5min (yellow warning)
- offline: No heartbeat for 5+ minutes (red)
- error: Runner reported error state
- disabled: Manually disabled by user

### Terminal Management
Each Runner can host multiple MT5 terminals (one per broker account recommended).

Terminal Registration:
1. Select parent Runner
2. Enter label (e.g., "DERIV-DEMO-12345")
3. Optional: terminal path, portable mode toggle
4. Terminal appears under its Runner in the dashboard

Terminal States:
- ready: Terminal registered, not yet started
- running: MT5 process active, Controller EA responding
- error: MT5 crashed or Controller not responding
- restarting: Auto-recovery in progress

### Health Monitoring Dashboard
- Real-time status cards per Runner
- CPU, RAM, Disk usage (from heartbeat telemetry)
- MT5 alive indicator (green/red)
- Controller alive indicator
- Last tick timestamp (data flow confirmation)
- Crash loop protection: If terminal restarts > 5 times in 10 min → auto-disable + alert

### Runner Heartbeat Protocol
- Runner Agent sends heartbeat every 5-10 seconds
- Payload: CPU%, RAM%, disk_free, mt5_alive, controller_alive, last_tick_at
- Backend updates runner status + inserts into runner_heartbeats table
- Staleness detection automatic in UI

## 12.3 EA LIBRARY (/ea-library)

### Overview
Central repository for compiled Expert Advisors (.ex5 files).
Supports 100-150+ EAs with metadata, versioning, and risk classification.

### EA Upload Flow
1. Click "Add EA" button
2. Fill: Name, Version, Strategy Tags, Risk Tier
3. Upload .ex5 file to secure storage (ea-binaries bucket)
4. Optional: Set allowed symbols and timeframes
5. SHA256 hash computed for integrity verification
6. EA appears in library with status "active"

### EA Metadata
- name: Display name (e.g., "MMC Trend Rider")
- version: Semantic version (e.g., "1.4.2")
- strategy_tags: Array (trend, scalp, meanrev, breakout, grid, etc.)
- risk_tier: low / med / high
- allowed_symbols: Whitelist (null = all allowed)
- allowed_timeframes: Whitelist (null = all allowed)
- file_sha256: Integrity hash
- storage_path: Secure storage location
- status: active / deprecated

### EA Presets
Presets define input configurations for an EA.
- Each preset references an EA
- Contains: template_name (.tpl file), template_storage_path, inputs_json
- Templates uploaded to ea-templates storage bucket
- One EA can have multiple presets (Conservative, Aggressive, etc.)

### Search & Filter
- Search by name or tags
- Filter by risk tier, status
- Sort by name, version, created date
- Grid or list view

## 12.4 RUN CONSOLE (/run-console)

### Starting a Run
1. Select MT5 Account (from mt5_accounts)
2. Select Terminal (must be "running" status)
3. Select EA from library
4. Select Preset (optional)
5. Enter Symbol (e.g., EURUSD)
6. Select Timeframe (M1 to MN1)
7. Set Slot number (chart slot)
8. Choose Mode: live / paper
9. Configure Risk Limits (max DD, max lot, max positions)
10. Click "Start Run"

### Run State Machine
queued → starting → running → stopping → stopped
Error can occur at any state → transitions to "error"

State details:
- queued: Backend created run + command, waiting for Runner
- starting: Runner acknowledged, applying template
- running: EA confirmed active, heartbeats flowing
- stopping: Stop command sent, waiting for confirmation
- stopped: EA removed, chart closed
- error: Something failed, last_error populated

### Run Monitoring
- Status badge with color coding
- Last heartbeat timestamp
- Event timeline (ea_run_events): chronological log of all state changes
- Live trade panel: Trades linked to this run
- Error details if any

### Controls
- STOP: Graceful stop (close chart, optionally close positions)
- PANIC STOP: Immediate stop ALL runs on a terminal/connection
- State transitions logged in ea_run_events

### Event Types in Timeline
- START_REQUESTED: User clicked Run
- COMMAND_QUEUED: Backend created runner_commands entry
- COMMAND_ACKED: Runner picked up the command
- TEMPLATE_APPLIED: Controller applied template to chart
- EA_STARTED: EA confirmed running
- HEARTBEAT_OK: Periodic health confirmation
- STOP_REQUESTED: User clicked Stop
- EA_STOPPED: EA confirmed stopped
- ERROR: Something went wrong (payload has details)

## 12.5 COMMAND QUEUE PROTOCOL

### How Commands Flow
1. User action in MMC UI → Edge Function creates runner_commands row
2. Runner Agent polls: GET commands where status=queued
3. Runner acknowledges: status → acked
4. Runner executes (via Controller EA file queue)
5. Runner reports result: status → done (or error)
6. Backend updates ea_runs status accordingly

### Command Types
- START_RUN: Open chart, apply template, start EA
- STOP_RUN: Close chart, optionally close positions
- RESTART_MT5: Restart terminal process
- APPLY_TEMPLATE: Change EA config on running chart
- HEALTH_CHECK: Verify terminal responsiveness
- PANIC_STOP: Stop all runs on terminal

### Controller EA Communication
Runner → Controller uses local file queue (most reliable):
- Runner writes: MQL5/Files/mmc_cmd.json
- Controller reads every 1 second
- Controller executes and writes: MQL5/Files/mmc_result.json
- Runner reads result and reports to backend

## 12.6 SAFETY & RISK GUARDRAILS

### Pre-Start Validation (Backend)
Before allowing RUN:
- Max daily loss limit configured?
- Max lot cap respected?
- Max concurrent runs not exceeded?
- Symbol not in blocked list?
- Within session window (UTC)?
- Spread check (if supported)

### Auto-Kill Logic
- If equity drawdown crosses threshold → auto STOP_RUN
- Configurable per-run via risk_limits JSON
- Fields: max_dd_pct, max_lot_size, max_positions, session_start, session_end

### Crash Loop Protection
- If terminal restarts > N times in 10 minutes
- Terminal auto-disabled
- Alert banner shown in UI
- Manual re-enable required

## 12.7 STORAGE BUCKETS

Three secure buckets:
1. ea-binaries: Compiled .ex5 files
2. ea-templates: .tpl preset files
3. controller-binaries: Controller EA for Runner deployment

All private, per-user folder structure (user_id prefix).
Signed URLs for upload and download.

## 12.8 DATABASE TABLES (Runner Infrastructure)

| Table | Purpose |
|-------|---------|
| mt5_runners | VPS machines registry |
| mt5_terminals | MT5 instances per runner |
| ea_library | Compiled EA metadata + storage |
| ea_presets | Input configs per EA |
| ea_runs | Active/historical run instances |
| ea_run_events | Event log per run |
| runner_heartbeats | Telemetry data |
| runner_commands | Command queue (queued→acked→done) |

All tables have RLS policies (user can only access own data).
runner_key authentication for Runner-side endpoints.

================================================================================
PART 13: MT5 SYNC V3 (PRODUCTION-GRADE EA)
================================================================================

## 13.1 MT5 SYNC BRIDGE V3

The MT5 AutoSync EA has been upgraded to V3 with production-grade reliability:

### Key V3 Features
1. Exponential Backoff + Retry (up to 4 retries with jitter)
2. Circuit Breaker (10 failures → 120s cooldown)
3. HMAC-SHA256 Signature Headers (server-side verification)
4. Delta Mode (skip snapshot if positions/orders unchanged)
5. FNV-1a / SHA256 Hashing for change detection
6. Watermark Persistence (GlobalVariables for deal history tracking)
7. UTC Time Handling (ServerToUtc conversion at boundary)
8. Idempotency Keys (prevent duplicate processing)
9. Request IDs (for correlation/debugging)
10. Server-Side Throttle (adjustable snapshot interval)

### Sync Actions
- register: Initial account registration
- heartbeat: Periodic health check (every 5-10s)
- sync_positions: Live positions + pending orders snapshot (every 2-5s)
- sync_deals: Closed deal history with watermark (every 30s)
- log: Diagnostic messages

### Data Flow
MT5 Terminal → EA V3 → HTTPS POST → Edge Function (mt5-sync / sync-mt5-trades) → Supabase Tables

### Existing MT5 Sync Tables
| Table | Purpose |
|-------|---------|
| mt5_accounts | Connected MT5 accounts |
| mt5_positions | Current open positions |
| mt5_orders | Pending orders |
| mt5_deals | Closed deal history |
| mt5_equity_snapshots | Balance/equity snapshots |
| mt5_sync_log | Sync event audit trail |
| mt5_reconciliation | Mismatch detection |
| mt5_risk_config | Risk rules per account |

### MT5 Setup Wizard (/mt5-sync)
3-step wizard:
1. Account Details: Account number, broker, server → Generate sync key
2. Download EA: Code shown with copy button, step-by-step MT5 instructions
3. Verify Connection: Test button, green checkmark on success

### MT5 Hub (/mt5)
Dashboard showing:
- Connected accounts with status
- Sync health indicators
- Last sync timestamps
- Trade count summaries
- Quick actions (sync now, configure)

================================================================================
PART 14: PROP FIRM CHALLENGE TRACKER (/prop-firm)
================================================================================

## 14.1 OVERVIEW
Track prop firm challenges across 9+ firms with real-time rule monitoring.

### Supported Firms (Presets)
FTMO, MyForexFunds, Topstep, The Funded Trader, E8 Funding,
True Forex Funds, Surge Trader, City Traders Imperium, Custom

### Challenge Fields
- firm_name, challenge_name
- phase: Phase 1 / Phase 2 / Live Account
- initial_balance, current_balance
- profit_target_pct (e.g., 10%)
- max_daily_dd_pct (e.g., 5%)
- max_total_dd_pct (e.g., 10%)
- dd_mode: equity / balance (how DD is calculated)
- min_trading_days
- start_date, end_date
- rules_config: Custom JSON for firm-specific rules

### Visual Dashboard
- Challenge cards with progress bars
- Profit progress: Current vs Target
- Daily DD gauge: Used vs Limit
- Total DD gauge: Used vs Limit
- Trading days counter
- Status badges: active / passed / failed / expired
- Color-coded warnings as limits approach

### CRUD Operations
- Create challenge with firm presets (auto-fills rules)
- Edit challenge details
- Delete with confirmation
- Status tracking (auto-compute pass/fail)

================================================================================
PART 15: TRADING NOTEBOOK (/notebook)
================================================================================

## 15.1 OVERVIEW
Notion-like notes with Supabase persistence, auto-save, and categories.

### Features
- Create/edit/delete notes
- Rich text content area
- Category system: General, Strategy, Analysis, Psychology, Market, Research
- Tag system (comma-separated)
- Pin/unpin notes (pinned show first)
- Search by title and content
- Auto-save with debounce (2 seconds)
- Sync indicator (saved/saving/offline)
- Keyboard shortcut: Ctrl+N for new note

### Categories with Colors
- General: Gray
- Strategy: Blue
- Analysis: Green
- Psychology: Purple
- Market: Orange
- Research: Cyan

### Data Persistence
- Stored in notebook_notes table (Supabase)
- RLS: Users can only access their own notes
- Fields: title, content, category, tags[], pinned, created_at, updated_at

================================================================================
PART 16: BEHAVIORAL DIAGNOSTICS (/behavioral-diagnostics)
================================================================================

## 16.1 OVERVIEW
Psychological trading pattern analysis — overtrading, revenge trading, consistency.

### Diagnostics Computed
1. Overtrading Detection
   - Measures trades per day
   - Flags days with > 2 standard deviations above average
   - Score: Low/Medium/High overtrading

2. Revenge Trading Detection
   - Looks for rapid trades after losses
   - Pattern: Loss → quick re-entry → another loss
   - Identifies revenge trade sequences

3. Consistency Score
   - Measures variance in trade sizing, frequency, timing
   - Compares current week vs historical average
   - Higher = more consistent = better

4. Win Streak / Loss Streak Analysis
   - Current streak tracking
   - Historical max streaks
   - Average streak length

5. Time-of-Day Patterns
   - Identifies best/worst trading hours
   - P&L by session (Asia/London/NY)

### Minimum Data Requirement
- Needs at least 20 closed trades for meaningful analysis
- Shows "Insufficient Data" state if below threshold

### Visual Output
- Score cards with progress bars
- Color-coded severity badges
- Actionable recommendations per diagnostic
- Trend arrows showing improvement/decline

================================================================================
PART 17: LIVE PORTFOLIO TRACKER (/live-tracker)
================================================================================

## 17.1 OVERVIEW
Real-time position monitoring and P&L tracking dashboard.

### Features
- Add/manage live positions manually
- Real-time P&L calculation
- Position cards with entry/current/SL/TP
- Total portfolio metrics (unrealized P&L, exposure)
- Risk alerts (approaching SL, high exposure)
- Auto-refresh capability
- Privacy mode (blur sensitive values)
- Pause/resume tracking

### Position Fields
- Symbol, Direction (Long/Short)
- Entry Price, Current Price
- Quantity/Lots
- Stop Loss, Take Profit
- P&L (auto-calculated)

### Broker Integration
- Works with mt5_positions table for auto-synced positions
- Also supports manual position entry
- Combined view of all sources

================================================================================
PART 18: PRE-TRADE CHECK (/pre-trade-check)
================================================================================

## 18.1 OVERVIEW
Match your next trade setup against your historical edge before entering.

### How It Works
1. Enter planned trade: Symbol, Direction, Setup Type, Session
2. System searches your trade history for matching patterns
3. Shows: Historical win rate, avg P&L, trade count for that pattern
4. Confidence level based on sample size
5. Recommendation: Take / Skip / Reduce Size

### Integration with AI Playbook
- Pre-Trade Check uses patterns detected by AI Playbook
- Combines with setup_type, session_tag, symbol analysis
- Quick reference before every trade entry

================================================================================
PART 19: SHARE STATS (/share/:userId)
================================================================================

## 19.1 OVERVIEW
Public stats sharing page for traders who opt-in to public profiles.

### Features
- Public URL: /share/{userId}
- Shows: Win Rate, Profit Factor, Total Trades, Total P&L
- Branded MMC card with user avatar
- SEO optimized with meta tags
- Only visible if user has is_public=true in profile
- No sensitive data exposed (no individual trades)

### How to Enable
1. Profile → Toggle "Public Profile" ON
2. Share your link: mmcai.app/share/{your-id}
3. Others can see your aggregate stats

================================================================================
PART 20: PERFORMANCE ATTRIBUTION (/attribution)
================================================================================

## 20.1 OVERVIEW
Decompose trading returns by multiple factors.

### Attribution Dimensions
1. Direction: Long vs Short performance
2. Time of Day: Hourly P&L breakdown
3. Day of Week: Which days profitable
4. Holding Period: Short vs medium vs long trades
5. Market Regime: Performance per detected regime
6. Symbol: Per-instrument contribution
7. Strategy/Setup: Per setup type breakdown

### Visualization
- Stacked bar charts
- Contribution tables with win rate and avg P&L
- Percentage of total return per factor

================================================================================
PART 21: AI PLAYBOOK (/ai-playbook)
================================================================================

## 21.1 OVERVIEW
Automatic pattern detection from trade history with 7-dimension analysis.

### Pattern Detection
- Groups trades by: Symbol, Setup Type, Direction, Session, Tags
- Computes: Win Rate, Avg P&L, Trade Count, Profit Factor per pattern
- Confidence scoring based on sample size
- Identifies "edge" patterns (high WR + positive expectancy)

### 7-Dimension Analysis Tabs
1. Streaks: Win/loss streak analysis with recovery rate
2. Risk: VaR, CVaR, drawdown metrics
3. Time: Hourly/daily/weekly P&L heatmaps
4. Emotions: Correlation of mood tags with performance
5. Benchmarks: Compare against common benchmarks
6. Quality: Trade quality scoring distribution
7. Correlations: Inter-metric correlations

### AI Insights
- Auto-generated actionable insights
- Streak warnings and encouragement
- Pattern-based trade recommendations
- Minimum 5 trades required for analysis

================================================================================
PART 22: ADDITIONAL NEW WIDGETS & FEATURES
================================================================================

## 22.1 CONSECUTIVE LOSS IMPACT ANALYZER
- Visualizes the impact of losing streaks on equity
- Shows average recovery time after N consecutive losses
- Helps set realistic expectations for drawdown periods

## 22.2 HOLD TIME OPTIMIZER
- Analyzes P&L by trade duration
- Identifies optimal holding period for different setups
- Histogram of trade durations with P&L overlay

## 22.3 FEE IMPACT REPORT
- Total fees paid (commission + swap + spread)
- Fee as percentage of gross profit
- Fee per trade average
- Identifies if fees are eating into edge

## 22.4 SETUP DECAY ANALYSIS
- Tracks if a setup type's edge is degrading over time
- Rolling win rate and expectancy per setup
- Alerts when setup performance drops significantly

## 22.5 R-MULTIPLE DISTRIBUTION
- Distribution chart of trade outcomes in R-multiples
- Shows: How many 1R, 2R, 3R+ winners vs -1R losers
- Helps understand risk-adjusted trade quality

## 22.6 TRADE SCREENSHOT UPLOAD
- Attach chart screenshots to individual trades
- Stored in trade-screenshots storage bucket
- View screenshots in trade detail modal
- Supports drag-and-drop upload

## 22.7 QUICK TRADE WIDGET
- Rapid trade entry from dashboard
- Minimal fields: Symbol, Direction, Entry, SL, TP
- One-click trade logging
- Auto-fills common defaults

## 22.8 DAY OF WEEK PERFORMANCE
- Bar chart showing P&L per weekday
- Identifies best and worst trading days
- Win rate per day overlay

## 22.9 SHARE TRADE CARD
- Generate beautiful trade summary cards
- Shareable image format
- Includes: Entry/Exit, P&L, R-multiple, duration
- Brand watermark

## 22.10 AFFILIATE PROGRAM (/affiliate)
- Apply to become MMC affiliate
- Track referral clicks and conversions
- Commission dashboard
- Affiliate code generation
- Payout tracking

## 22.11 REFERRAL SYSTEM (/referral)
- Personal referral code auto-generated
- Share link to invite friends
- Track referral status (pending/converted)
- Rewards for successful referrals

## 22.12 SEO LANDING PAGES
- /backtesting-software: SEO page for backtesting
- /mt5-journal: SEO page for MT5 journaling
- /prop-firm-tracker: SEO page for prop firm tracking
- /compare/projournx: Comparison with ProJournx
- /compare/tradezella: Comparison with Tradezella
- All with structured data, meta tags, canonical URLs

## 22.13 GROWTH ROADMAP (/roadmap)
- Public product roadmap
- Upcoming features with timeline
- Voting on feature requests
- Status indicators: Planned, In Progress, Released

## 22.14 PARITY DASHBOARD (/parity)
- Feature comparison with competitors
- Side-by-side feature matrix
- Gap analysis for product development

================================================================================
PART 23: UPDATED PAGE REFERENCE (COMPLETE 2026)
================================================================================

| Path | Page | Purpose |
|------|------|---------|
| /runners | Runner Dashboard | VPS runner + terminal management |
| /run-console | Run Console | Start/stop/monitor EA runs |
| /ea-library | EA Library | Upload and manage compiled EAs |
| /mt5 | MT5 Hub | MT5 account management |
| /mt5-sync | MT5 Sync | Setup wizard for MT5 connection |
| /prop-firm | Prop Firm Tracker | Challenge monitoring |
| /notebook | Trading Notebook | Notion-like trading notes |
| /behavioral-diagnostics | Behavioral Diagnostics | Psychology analysis |
| /live-tracker | Live Tracker | Real-time position monitoring |
| /pre-trade-check | Pre-Trade Check | Edge verification before trade |
| /share/:userId | Share Stats | Public stats page |
| /attribution | Performance Attribution | Factor-based return analysis |
| /ai-playbook | AI Playbook | Pattern detection + 7D analysis |
| /trading-dashboard | Trading Dashboard | Full trade journal + widgets |
| /ai-copilot | AI Copilot Chat | Conversational AI assistant |
| /affiliate | Affiliate Program | Affiliate management |
| /referral | Referrals | Referral tracking |
| /roadmap | Growth Roadmap | Product roadmap |
| /parity | Parity Dashboard | Competitor comparison |
| /trade-reports | Trade Reports | Custom report generation |
| /broker-directory | Broker Directory | Broker information |
| /ea-manager | EA Manager | Advanced EA management |
| /ea/:id | EA Profile | Individual EA details |
| /batches | Batch Tester | Batch backtest queue |
| (Previous pages from Part 10 still active) |
`;

export const COPILOT_DEEP_KNOWLEDGE_KEY = 'MMC_COPILOT_DEEP_KNOWLEDGE';
