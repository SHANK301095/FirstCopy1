/**
 * Breadcrumb Navigation Component
 * UX Phase: Navigation improvements
 */

import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// Route to label mapping
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  workflow: 'Workflow',
  data: 'Data Manager',
  import: 'Import',
  'strategy-library': 'Strategy Library',
  'strategy-versioning': 'Strategy Versioning',
  optimizer: 'Optimizer',
  'advanced-optimizer': 'Advanced Optimizer',
  'walk-forward': 'Walk-Forward',
  'portfolio-builder': 'Portfolio Builder',
  'risk-dashboard': 'Risk Dashboard',
  analytics: 'Analytics',
  'advanced-analytics': 'Advanced Analytics',
  tearsheet: 'Tearsheet',
  scanner: 'Scanner',
  settings: 'Settings',
  profile: 'Profile',
  backtests: 'Backtests',
  'saved-results': 'Saved Results',
  sentinel: 'Sentinel AI',
  'cloud-dashboard': 'Cloud Dashboard',
  'workspace-dashboard': 'Workspace',
  logs: 'Logs',
  tutorials: 'Tutorials',
  faq: 'FAQ',
  about: 'About',
};

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from path if not provided
  const breadcrumbItems: BreadcrumbItem[] = items || (() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    return pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      return { label, href: index === pathSegments.length - 1 ? undefined : href };
    });
  })();

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1.5">
        {showHome && (
          <>
            <li>
              <Link 
                to="/dashboard" 
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            {breadcrumbItems.length > 0 && (
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </li>
            )}
          </>
        )}
        
        {breadcrumbItems.map((item, index) => (
          <Fragment key={index}>
            <li>
              {item.href ? (
                <Link 
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span 
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
            {index < breadcrumbItems.length - 1 && (
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
