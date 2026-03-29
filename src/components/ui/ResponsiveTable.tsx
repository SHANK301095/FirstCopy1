/**
 * Responsive Table Wrapper
 * Prevents page-level overflow with proper containment
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for tables that may be wide.
 * Ensures table scrolls internally, not the page.
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn('w-full max-w-full overflow-x-auto rounded-md border', className)}>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}

interface TruncatedCellProps {
  value: string;
  maxWidth?: string;
  copyable?: boolean;
  className?: string;
}

/**
 * Cell that truncates long text with tooltip + optional copy button
 */
export function TruncatedCell({ 
  value, 
  maxWidth = '150px', 
  copyable = false,
  className 
}: TruncatedCellProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const content = (
    <span 
      className={cn('block truncate min-w-0', className)} 
      style={{ maxWidth }}
    >
      {value}
    </span>
  );

  if (!value || value.length < 20) {
    return content;
  }

  return (
    <div className="flex items-center gap-1 min-w-0">
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs break-all bg-popover text-popover-foreground z-50"
        >
          {value}
        </TooltipContent>
      </Tooltip>
      {copyable && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 opacity-60 hover:opacity-100"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}

interface ResponsiveTableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Table header cell with responsive visibility
 */
export function ResponsiveTableHead({ 
  priority = 'high', 
  className,
  ...props 
}: ResponsiveTableHeadProps) {
  return (
    <th
      className={cn(
        'px-3 py-2 text-left text-xs font-medium text-muted-foreground',
        priority === 'low' && 'hidden xl:table-cell',
        priority === 'medium' && 'hidden lg:table-cell',
        className
      )}
      {...props}
    />
  );
}

/**
 * Table data cell with responsive visibility
 */
export function ResponsiveTableCell({ 
  priority = 'high', 
  className,
  ...props 
}: ResponsiveTableHeadProps) {
  return (
    <td
      className={cn(
        'px-3 py-2 text-sm min-w-0',
        priority === 'low' && 'hidden xl:table-cell',
        priority === 'medium' && 'hidden lg:table-cell',
        className
      )}
      {...props}
    />
  );
}
