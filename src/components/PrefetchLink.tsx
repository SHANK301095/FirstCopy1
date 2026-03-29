/**
 * Link component with automatic route prefetching
 * Prefetches route on hover/focus for instant navigation
 */

import { forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { usePrefetch } from '@/hooks/usePrefetch';

interface PrefetchLinkProps extends Omit<LinkProps, 'prefetch'> {
  enablePrefetch?: boolean;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, enablePrefetch = true, children, ...props }, ref) => {
    const { getPrefetchProps } = usePrefetch();
    
    const path = typeof to === 'string' ? to : to.pathname || '';
    const prefetchHandlers = enablePrefetch ? getPrefetchProps(path) : {};
    
    return (
      <Link ref={ref} to={to} {...prefetchHandlers} {...props}>
        {children}
      </Link>
    );
  }
);

PrefetchLink.displayName = 'PrefetchLink';
