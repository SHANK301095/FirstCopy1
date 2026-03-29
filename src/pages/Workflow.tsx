import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, Code, Play, Download, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DataTab } from '@/components/workflow/DataTab';
import { StrategyTab } from '@/components/workflow/StrategyTab';
import { BacktestTab } from '@/components/workflow/BacktestTab';
import { ResultsTab } from '@/components/workflow/ResultsTab';
import { OnboardingBanner } from '@/components/workflow/OnboardingBanner';
import { MultiAssetInfoCard } from '@/components/workflow/MultiAssetInfoCard';
import { QuickStartWizard } from '@/components/workflow/QuickStartWizard';
import { useBacktestStore } from '@/lib/backtestStore';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';
import { InlineHelp } from '@/components/help';

export default function Workflow() {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'data');
  const [showQuickStart, setShowQuickStart] = useState(false);
  const { isDataValid, isStrategyValid, results } = useBacktestStore();

  // Sync tab from URL params
  useEffect(() => {
    if (urlTab && ['data', 'strategy', 'backtest', 'results'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const tabs = [
    { value: 'data', label: 'Data', icon: FileSpreadsheet, done: isDataValid() },
    { value: 'strategy', label: 'Strategy', icon: Code, done: isStrategyValid() },
    { value: 'backtest', label: 'Backtest', icon: Play, done: false },
    { value: 'results', label: 'Results/Exports', icon: Download, done: !!results },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PageTitle 
            title="Backtest Workflow" 
            subtitle="Upload data, paste strategy, run backtest, export results"
          />
          <InlineHelp topicId="backtest-run" />
        </div>
        
        {/* Quick Start Button - Show when no data loaded */}
        {!isDataValid() && !results && (
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setShowQuickStart(true)}
            className="gap-2"
          >
            <Zap className="h-4 w-4" />
            Quick Start
          </Button>
        )}
      </div>

      <OnboardingBanner onNavigate={setActiveTab} />
      
      {/* Multi-Asset Info Notice */}
      {activeTab === 'data' && <MultiAssetInfoCard variant="inline" className="mt-2" />}
      
      {/* Quick Start Wizard Modal */}
      <QuickStartWizard open={showQuickStart} onOpenChange={setShowQuickStart} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                tab.done && 'border-profit/50'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.done && <span className="text-xs text-profit">✓</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="data" className="mt-0">
            <DataTab onProceedToStrategy={() => setActiveTab('strategy')} />
          </TabsContent>
          <TabsContent value="strategy" className="mt-0">
            <StrategyTab onProceedToBacktest={() => setActiveTab('backtest')} />
          </TabsContent>
          <TabsContent value="backtest" className="mt-0">
            <BacktestTab />
          </TabsContent>
          <TabsContent value="results" className="mt-0">
            <ResultsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
