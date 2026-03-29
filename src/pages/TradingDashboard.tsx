/**
 * Trading Dashboard - Tabbed layout with KPIs, equity curve, heatmap, risk, AI widgets
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, FileText, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageTitle } from '@/components/ui/PageTitle';
import { useTradesDB } from '@/hooks/useTradesDB';
import { CalendarHeatmap } from '@/components/trading/CalendarHeatmap';
import { EquityCurve } from '@/components/trading/EquityCurve';
import { TradeKPICards } from '@/components/trading/TradeKPICards';
import { RecentTradesList } from '@/components/trading/RecentTradesList';
import { ScreenshotGallery } from '@/components/trading/ScreenshotGallery';
import { AIPlaybookCards } from '@/components/trading/AIPlaybookCards';
import { DrawdownAnalyzer } from '@/components/trading/DrawdownAnalyzer';
import { TiltDetectionEngine } from '@/components/trading/TiltDetectionEngine';
import { RiskBudgetCalculator } from '@/components/trading/RiskBudgetCalculator';
import { SessionPnLHeatmap } from '@/components/trading/SessionPnLHeatmap';
import { AchievementBadges } from '@/components/trading/AchievementBadges';
import { QuickTradeWidget } from '@/components/trading/QuickTradeWidget';
import { SlippageTracker } from '@/components/trading/SlippageTracker';
import { PortfolioHeatMap } from '@/components/trading/PortfolioHeatMap';
import { MarketRegimeDetector } from '@/components/trading/MarketRegimeDetector';
import { WinProbabilityMeter } from '@/components/trading/WinProbabilityMeter';
import { AITradeReplay } from '@/components/trading/AITradeReplay';
import { MentorMode } from '@/components/trading/MentorMode';
import { TradeTemplates } from '@/components/trading/TradeTemplates';
import { TradingViewEmbed } from '@/components/trading/TradingViewEmbed';
import { AIInsightsHub } from '@/components/trading/AIInsightsHub';
import { MultiAccountSwitcher } from '@/components/trading/MultiAccountSwitcher';
import { DashboardCustomizer, useDashboardWidgets } from '@/components/trading/DashboardCustomizer';
import { Skeleton } from '@/components/ui/skeleton';
import { MT5StatusCard } from '@/components/mt5/MT5StatusCard';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'risk', label: 'Risk' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'ai', label: 'AI' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TradingDashboard() {
  const { trades, loading, stats } = useTradesDB();
  const { widgets, toggle, reset, isEnabled } = useDashboardWidgets();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageTitle
          title="Trading Dashboard"
          subtitle="Track performance, patterns, and risk at a glance"
        />
        <div className="flex gap-2 flex-wrap">
          <MultiAccountSwitcher />
          <DashboardCustomizer widgets={widgets} toggle={toggle} reset={reset} />
          <Button variant="outline" size="sm" asChild>
            <Link to="/trade-reports">
              <FileText className="h-4 w-4 mr-1.5" /> Reports
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/trades">
              <Upload className="h-4 w-4 mr-1.5" /> Import
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/trades">
              <Plus className="h-4 w-4 mr-1.5" /> Log Trade
            </Link>
          </Button>
        </div>
      </div>

      {/* MT5 Status Card */}
      <MT5StatusCard />

      {/* KPI Cards — always visible */}
      {isEnabled('kpis') && (stats ? (
        <TradeKPICards stats={stats} trades={trades} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No closed trades yet. <Link to="/trades" className="text-primary hover:underline">Import or log trades</Link> to see your stats.</p>
        </div>
      ))}

      {/* Tab Strip */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/50 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in" key={activeTab}>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {isEnabled('equity') && <EquityCurve trades={trades} />}
              {isEnabled('calendar') && <CalendarHeatmap trades={trades} months={3} />}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {isEnabled('playbook') && <AIPlaybookCards trades={trades} />}
              {isEnabled('recent_trades') && <RecentTradesList trades={trades} />}
            </div>
            <ScreenshotGallery trades={trades} />
            {isEnabled('achievements') && <AchievementBadges trades={trades} />}
            {isEnabled('mentor') && <MentorMode trades={trades} />}
            {isEnabled('templates') && <TradeTemplates />}
            {isEnabled('tradingview') && <TradingViewEmbed />}
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {isEnabled('risk_budget') && <RiskBudgetCalculator trades={trades} />}
              {isEnabled('tilt') && <TiltDetectionEngine trades={trades} />}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {isEnabled('drawdown') && <DrawdownAnalyzer trades={trades} />}
              {isEnabled('slippage') && <SlippageTracker trades={trades} />}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {isEnabled('session_heatmap') && <SessionPnLHeatmap trades={trades} />}
              {isEnabled('portfolio_heat') && <PortfolioHeatMap trades={trades} />}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {isEnabled('win_probability') && <WinProbabilityMeter trades={trades} />}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            {isEnabled('ai_insights') && <AIInsightsHub trades={trades} stats={stats} />}
            <div className="grid gap-6 lg:grid-cols-2">
              {isEnabled('market_regime') && <MarketRegimeDetector trades={trades} />}
              {isEnabled('trade_replay') && <AITradeReplay trades={trades} />}
            </div>
          </div>
        )}
      </div>

      {/* Quick Trade FAB */}
      <QuickTradeWidget />
    </div>
  );
}
