// App entry point - security hardened v3
import { Suspense, lazy, useState, useEffect, type ReactNode } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { FastLoader } from "@/components/ui/FastLoader";
import { 
  DashboardSkeleton, 
  StrategySkeleton, 
  DataManagerSkeleton, 
  AnalyticsSkeleton,
  WorkflowSkeleton,
  MarketplaceSkeleton,
  GenericPageSkeleton 
} from "@/components/skeletons/PageSkeletons";
import { prefetchCommonRoutes } from "@/hooks/usePrefetch";
import { secureLogger } from "@/lib/secureLogger";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileGestureProvider } from "@/components/mobile/MobileGestureProvider";
import { PhoneRequiredModal } from "@/components/auth/PhoneRequiredModal";
import { LayoutDebugger } from "@/components/debug/LayoutDebugger";
import { PageTransitionWrapper } from "@/components/ui/PageTransitionWrapper";
import { useAppInit } from "@/hooks/useAppInit";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { SpotlightSearch } from "@/components/ui/SpotlightSearch";

// Lazy load desktop-only features
const CommandPalette = lazyWithRetry(() => import("@/components/CommandPalette").then(m => ({ default: m.CommandPalette })));
const KeyboardShortcuts = lazyWithRetry(() => import("./components/KeyboardShortcuts").then(m => ({ default: m.KeyboardShortcuts })));
const SupportBot = lazyWithRetry(() => import("@/components/support/SupportBot"));

// Lazy load all pages for better performance
const Landing = lazyWithRetry(() => import("./pages/Landing"));
const Home = lazyWithRetry(() => import("./pages/Home"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Workflow = lazyWithRetry(() => import("./pages/Workflow"));
const DataManager = lazyWithRetry(() => import("./pages/DataManager"));
const StrategyLibrary = lazyWithRetry(() => import("./pages/StrategyLibrary"));
const Optimizer = lazyWithRetry(() => import("./pages/Optimizer"));
const WalkForward = lazyWithRetry(() => import("./pages/WalkForward"));
const Analytics = lazyWithRetry(() => import("./pages/Analytics"));
const AdvancedAnalytics = lazyWithRetry(() => import("./pages/AdvancedAnalytics"));
const PortfolioBuilder = lazyWithRetry(() => import("./pages/PortfolioBuilder"));
const PerformanceAttribution = lazyWithRetry(() => import("./pages/PerformanceAttribution"));
const WorkflowTemplates = lazyWithRetry(() => import("./pages/WorkflowTemplates"));
const TradeJournal = lazyWithRetry(() => import("./pages/TradeJournal"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const LiveTracker = lazyWithRetry(() => import("./pages/LiveTracker"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Logs = lazyWithRetry(() => import("./pages/Logs"));
const HelpOffline = lazyWithRetry(() => import("./pages/HelpOffline"));
const HelpCenter = lazyWithRetry(() => import("./pages/HelpCenter"));
const EAManager = lazyWithRetry(() => import("./pages/EAManager"));
const DesktopSettings = lazyWithRetry(() => import("./pages/DesktopSettings"));
const SystemCheck = lazyWithRetry(() => import("./pages/SystemCheck"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const QuickCompare = lazyWithRetry(() => import("./pages/QuickCompare"));
const PositionSizing = lazyWithRetry(() => import("./pages/PositionSizing"));
const StressTesting = lazyWithRetry(() => import("./pages/StressTesting"));
const RiskDashboard = lazyWithRetry(() => import("./pages/RiskDashboard"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const PaperTrading = lazyWithRetry(() => import("./pages/PaperTrading"));
const PatternRecognition = lazyWithRetry(() => import("./pages/PatternRecognition"));
const Tutorials = lazyWithRetry(() => import("./pages/Tutorials"));
const Academy = lazyWithRetry(() => import("./pages/Academy"));
const Achievements = lazyWithRetry(() => import("./pages/Achievements"));
const AdvancedOptimizer = lazyWithRetry(() => import("./pages/AdvancedOptimizer"));
const ReportGenerator = lazyWithRetry(() => import("./pages/ReportGenerator"));
const ExecutionBridge = lazyWithRetry(() => import("./pages/ExecutionBridge"));
const CloudSync = lazyWithRetry(() => import("./pages/CloudSync"));
const SavedResults = lazyWithRetry(() => import("./pages/SavedResults"));
const CloudDashboard = lazyWithRetry(() => import("./pages/CloudDashboard"));
const StrategyVersioning = lazyWithRetry(() => import("./pages/StrategyVersioning"));
const WorkspaceSettings = lazyWithRetry(() => import("./pages/WorkspaceSettings"));
const InviteAccept = lazyWithRetry(() => import("./pages/InviteAccept"));
const WorkspaceDashboard = lazyWithRetry(() => import("./pages/WorkspaceDashboard"));
const AppGuide = lazyWithRetry(() => import("./pages/AppGuide"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const StrategyMarketplace = lazyWithRetry(() => import("./pages/StrategyMarketplace"));
const Sentinel = lazyWithRetry(() => import("./pages/Sentinel"));
const AdminSettings = lazyWithRetry(() => import("./pages/AdminSettings"));
const Scanner = lazyWithRetry(() => import("./pages/Scanner"));
const Tearsheet = lazyWithRetry(() => import("./pages/Tearsheet"));
const CopilotQA = lazyWithRetry(() => import("./pages/CopilotQA"));
const AIFeatures = lazyWithRetry(() => import("./pages/AIFeatures"));
const FeatureGuide = lazyWithRetry(() => import("./pages/FeatureGuide"));
const Premium = lazyWithRetry(() => import("./pages/Premium"));
const ExportCenter = lazyWithRetry(() => import("./pages/ExportCenter"));
const BulkTester = lazyWithRetry(() => import("./pages/BulkTester"));
const FeatureRegistry = lazyWithRetry(() => import("./pages/FeatureRegistry"));
const Calculators = lazyWithRetry(() => import("./pages/Calculators"));
const DevTools = lazyWithRetry(() => import("./pages/DevTools"));
const Simulators = lazyWithRetry(() => import("./pages/Simulators"));
const Trades = lazyWithRetry(() => import("./pages/Trades"));
const PropFirmTracker = lazyWithRetry(() => import("./pages/PropFirmTracker"));
const RiskTools = lazyWithRetry(() => import("./pages/RiskTools"));
const BehavioralDiagnostics = lazyWithRetry(() => import("./pages/BehavioralDiagnostics"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const TradingDashboard = lazyWithRetry(() => import("./pages/TradingDashboard"));
const TradeReportsPage = lazyWithRetry(() => import("./pages/TradeReportsPage"));
const AIPlaybook = lazyWithRetry(() => import("./pages/AIPlaybook"));
const GrowthRoadmap = lazyWithRetry(() => import("./pages/GrowthRoadmap"));
const PreTradeCheckPage = lazyWithRetry(() => import("./pages/PreTradeCheckPage"));
const AlertsPage = lazyWithRetry(() => import("./pages/AlertsPage"));
const ParityDashboard = lazyWithRetry(() => import("./pages/ParityDashboard"));
const TradingNotebook = lazyWithRetry(() => import("./pages/TradingNotebook"));
const BrokerDirectory = lazyWithRetry(() => import("./pages/BrokerDirectory"));
const AICopilotChat = lazyWithRetry(() => import("./pages/AICopilotChat"));
const MT5Hub = lazyWithRetry(() => import("./pages/MT5Hub"));
const MT5Sync = lazyWithRetry(() => import("./pages/MT5Sync"));
const RunnerDashboard = lazyWithRetry(() => import("./pages/RunnerDashboard"));
const RunConsole = lazyWithRetry(() => import("./pages/RunConsole"));
const AIInsightsDrilldown = lazyWithRetry(() => import("./pages/AIInsightsDrilldown"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogPost = lazyWithRetry(() => import("./pages/BlogPost"));
const CompareProJournX = lazyWithRetry(() => import("./pages/CompareProJournX"));
const CompareTradezella = lazyWithRetry(() => import("./pages/CompareTradezella"));
const SEOBacktesting = lazyWithRetry(() => import("./pages/SEOBacktesting"));
const SEOMT5Journal = lazyWithRetry(() => import("./pages/SEOMT5Journal"));
const SEOPropFirm = lazyWithRetry(() => import("./pages/SEOPropFirm"));
const Referral = lazyWithRetry(() => import("./pages/Referral"));
const ShareStats = lazyWithRetry(() => import("./pages/ShareStats"));
const Affiliate = lazyWithRetry(() => import("./pages/Affiliate"));
const AffiliateDashboard = lazyWithRetry(() => import("./pages/AffiliateDashboard"));
const InvestorGoalWizard = lazyWithRetry(() => import("./pages/InvestorGoalWizard"));
const InvestorRecommendations = lazyWithRetry(() => import("./pages/InvestorRecommendations"));
const InvestorStrategyDetail = lazyWithRetry(() => import("./pages/InvestorStrategyDetail"));
const InvestorConsole = lazyWithRetry(() => import("./pages/InvestorConsole"));
const InvestorReports = lazyWithRetry(() => import("./pages/InvestorReports"));
const FactoryStrategyLibrary = lazyWithRetry(() => import("./pages/factory/FactoryStrategyLibrary"));
const FactoryBacktestFactory = lazyWithRetry(() => import("./pages/factory/FactoryBacktestFactory"));
const FactoryLeaderboard = lazyWithRetry(() => import("./pages/factory/FactoryLeaderboard"));
const FactoryPortfolioBuilder = lazyWithRetry(() => import("./pages/factory/FactoryPortfolioBuilder"));
const FactoryDeployments = lazyWithRetry(() => import("./pages/factory/FactoryDeployments"));
const FactoryMonitoring = lazyWithRetry(() => import("./pages/factory/FactoryMonitoring"));
const StrategyIntelligenceLibrary = lazyWithRetry(() => import("./pages/StrategyIntelligenceLibrary"));
const StrategyIntelligenceProfile = lazyWithRetry(() => import("./pages/StrategyIntelligenceProfile"));
const TradingCommandCenter = lazyWithRetry(() => import("./pages/TradingCommandCenter"));
const StrategyAutoSelection = lazyWithRetry(() => import("./pages/StrategyAutoSelection"));
const RegimeControlCenter = lazyWithRetry(() => import("./pages/RegimeControlCenter"));
const RiskGuardian = lazyWithRetry(() => import("./pages/RiskGuardian"));
const PropFirmIntelligence = lazyWithRetry(() => import("./pages/PropFirmIntelligence"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Route-specific skeleton mapping
function getRouteSkeleton(pathname: string) {
  if (pathname === '/dashboard' || pathname === '/') return <DashboardSkeleton />;
  if (pathname === '/strategies') return <StrategySkeleton />;
  if (pathname === '/data') return <DataManagerSkeleton />;
  if (pathname === '/analytics' || pathname === '/advanced-analytics') return <AnalyticsSkeleton />;
  if (pathname === '/workflow') return <WorkflowSkeleton />;
  if (pathname === '/marketplace') return <MarketplaceSkeleton />;
  return <GenericPageSkeleton />;
}

// Fast lightweight loading - no heavy animations
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <FastLoader size="lg" text="Loading..." />
    </div>
  );
}

// Mobile gesture wrapper - handles swipe back, haptics etc.
function MobileGestureWrapper({ children }: { children: ReactNode }) {
  return (
    <MobileGestureProvider>
      {children}
    </MobileGestureProvider>
  );
}

function AppRoutes() {
  const location = useLocation();
  
  // Wire secureLogger with current route
  useEffect(() => {
    secureLogger.setRoute(location.pathname);
  }, [location.pathname]);
  
  const isPublicRoute = ['/landing', '/login', '/signup', '/forgot-password', '/reset-password', '/about', '/contact', '/privacy', '/terms', '/faq', '/feature-guide', '/onboarding', '/blog', '/backtesting', '/mt5-journal', '/prop-firm-tracker', '/affiliate'].includes(location.pathname) || location.pathname.startsWith('/invite/') || location.pathname.startsWith('/blog/') || location.pathname.startsWith('/compare/') || location.pathname.startsWith('/share/');

  // Public routes (no layout, no auth required)
  if (isPublicRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <MobileGestureWrapper>
          <PageTransitionWrapper>
            <Routes location={location}>
              <Route path="/landing" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/invite/:token" element={<InviteAccept />} />
              <Route path="/feature-guide" element={<FeatureGuide />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/auth" element={<Login />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/compare/projournx" element={<CompareProJournX />} />
              <Route path="/compare/tradezella" element={<CompareTradezella />} />
              <Route path="/backtesting" element={<SEOBacktesting />} />
              <Route path="/mt5-journal" element={<SEOMT5Journal />} />
              <Route path="/prop-firm-tracker" element={<SEOPropFirm />} />
              <Route path="/share/:userId" element={<ShareStats />} />
              <Route path="/affiliate" element={<Affiliate />} />
            </Routes>
          </PageTransitionWrapper>
        </MobileGestureWrapper>
      </Suspense>
    );
  }

  // Get appropriate skeleton for current route
  const routeSkeleton = getRouteSkeleton(location.pathname);

  // Protected routes with layout
  return (
    <ProtectedRoute>
      <AppLayout>
        <Suspense fallback={routeSkeleton}>
          <MobileGestureWrapper>
            <PageTransitionWrapper>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/sentinel" element={<Sentinel />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workflow" element={<Workflow />} />
                <Route path="/data" element={<DataManager />} />
                <Route path="/strategies" element={<StrategyLibrary />} />
                <Route path="/optimizer" element={<Optimizer />} />
                <Route path="/walk-forward" element={<WalkForward />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
                <Route path="/portfolio" element={<PortfolioBuilder />} />
                <Route path="/attribution" element={<PerformanceAttribution />} />
                <Route path="/templates" element={<WorkflowTemplates />} />
                <Route path="/journal" element={<TradeJournal />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/trading-dashboard" element={<TradingDashboard />} />
                <Route path="/trade-reports" element={<TradeReportsPage />} />
                <Route path="/playbook" element={<AIPlaybook />} />
                <Route path="/pre-trade-check" element={<PreTradeCheckPage />} />
                <Route path="/growth-roadmap" element={<GrowthRoadmap />} />
                <Route path="/live-tracker" element={<LiveTracker />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/ea-manager" element={<EAManager />} />
                <Route path="/desktop-settings" element={<DesktopSettings />} />
                <Route path="/system-check" element={<SystemCheck />} />
                <Route path="/help/offline" element={<HelpOffline />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/quick-compare" element={<QuickCompare />} />
                <Route path="/position-sizing" element={<PositionSizing />} />
                <Route path="/stress-testing" element={<StressTesting />} />
                <Route path="/risk-dashboard" element={<RiskDashboard />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/paper-trading" element={<PaperTrading />} />
                <Route path="/patterns" element={<PatternRecognition />} />
                <Route path="/pattern-recognition" element={<PatternRecognition />} />
                <Route path="/tutorials" element={<Tutorials />} />
                <Route path="/academy" element={<Academy />} />
                <Route path="/advanced-optimizer" element={<AdvancedOptimizer />} />
                <Route path="/reports" element={<ReportGenerator />} />
                <Route path="/execution" element={<ExecutionBridge />} />
                <Route path="/cloud-sync" element={<CloudSync />} />
                <Route path="/saved-results" element={<SavedResults />} />
                <Route path="/cloud-dashboard" element={<CloudDashboard />} />
                <Route path="/strategy-versions" element={<StrategyVersioning />} />
                <Route path="/workspace-settings" element={<WorkspaceSettings />} />
                <Route path="/workspace" element={<WorkspaceDashboard />} />
                <Route path="/guide" element={<AppGuide />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/marketplace" element={<StrategyMarketplace />} />
                <Route path="/admin" element={<AdminRoute><AdminSettings /></AdminRoute>} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/tearsheet" element={<Tearsheet />} />
                <Route path="/copilot-qa" element={<CopilotQA />} />
                <Route path="/ai-features" element={<AIFeatures />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/export-center" element={<ExportCenter />} />
                <Route path="/bulk-tester" element={<BulkTester />} />
                <Route path="/feature-registry" element={<FeatureRegistry />} />
                <Route path="/calculators" element={<Calculators />} />
                <Route path="/parity" element={<ParityDashboard />} />
                <Route path="/notebook" element={<TradingNotebook />} />
                <Route path="/broker-directory" element={<BrokerDirectory />} />
                <Route path="/dev-tools" element={<DevTools />} />
                <Route path="/simulators" element={<Simulators />} />
                <Route path="/trades" element={<Trades />} />
                <Route path="/prop-firm" element={<PropFirmTracker />} />
                <Route path="/risk-tools" element={<RiskTools />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/diagnostics" element={<BehavioralDiagnostics />} />
                <Route path="/ai-copilot" element={<AICopilotChat />} />
                <Route path="/mt5-hub" element={<MT5Hub />} />
                <Route path="/mt5-sync" element={<MT5Sync />} />
                <Route path="/runners" element={<RunnerDashboard />} />
                <Route path="/run-console" element={<RunConsole />} />
                <Route path="/ai" element={<AIInsightsDrilldown />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/referral" element={<Referral />} />
                <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
                <Route path="/investor/goal" element={<InvestorGoalWizard />} />
                <Route path="/investor/recommendations" element={<InvestorRecommendations />} />
                <Route path="/investor/strategy-detail" element={<InvestorStrategyDetail />} />
                <Route path="/investor/console" element={<InvestorConsole />} />
                <Route path="/investor/reports" element={<InvestorReports />} />
                <Route path="/factory/strategies" element={<FactoryStrategyLibrary />} />
                <Route path="/factory/backtests" element={<FactoryBacktestFactory />} />
                <Route path="/factory/leaderboard" element={<FactoryLeaderboard />} />
                <Route path="/factory/portfolio" element={<FactoryPortfolioBuilder />} />
                <Route path="/factory/deployments" element={<FactoryDeployments />} />
                <Route path="/factory/monitoring" element={<FactoryMonitoring />} />
                <Route path="/strategy-intelligence" element={<StrategyIntelligenceLibrary />} />
                <Route path="/strategy-intelligence/:id" element={<StrategyIntelligenceProfile />} />
                <Route path="/command-center" element={<TradingCommandCenter />} />
                <Route path="/auto-selection" element={<StrategyAutoSelection />} />
                <Route path="/regime-control" element={<RegimeControlCenter />} />
                <Route path="/risk-guardian" element={<RiskGuardian />} />
                <Route path="/prop-intelligence" element={<PropFirmIntelligence />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransitionWrapper>
          </MobileGestureWrapper>
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}

const App = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile for conditional rendering of desktop-only features
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Prefetch common routes after initial load
    prefetchCommonRoutes();

    // Log performance metrics on page hide
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        performanceMonitor.reportToAnalytics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <HelmetProvider>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppInitializer />
              {!isMobile && (
                <Suspense fallback={null}>
                  <CommandPalette />
                  <KeyboardShortcuts />
                </Suspense>
              )}
              <Suspense fallback={null}>
                <SupportBot />
              </Suspense>
              <SpotlightSearch />
              <AppRoutes />
              <PhoneRequiredModalWrapper />
              {import.meta.env.DEV && <LayoutDebugger />}
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
    </HelmetProvider>
  );
};

// App initializer that must be inside AuthProvider
function AppInitializer() {
  useAppInit({ logPerformance: true, preloadRoutes: true });
  return null;
}

// Wrapper component to use auth context for phone modal
function PhoneRequiredModalWrapper() {
  const { user, phoneRequired, onPhoneUpdated } = useAuth();
  
  if (!user || !phoneRequired) return null;
  
  return (
    <PhoneRequiredModal 
      open={phoneRequired} 
      userId={user.id} 
      onComplete={onPhoneUpdated} 
    />
  );
}

export default App;
