/**
 * Layout Debug Toggle
 * Highlights overflow-causing elements + logs scrollWidth deltas
 */

import { useState, useEffect, useCallback } from 'react';
import { Bug, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUIPreferencesStore } from '@/store/uiPreferencesStore';

interface OverflowElement {
  element: HTMLElement;
  scrollWidth: number;
  clientWidth: number;
  delta: number;
  tagName: string;
  className: string;
}

export function LayoutDebugger() {
  const { layoutDebugMode, setLayoutDebugMode } = useUIPreferencesStore();
  const [overflowElements, setOverflowElements] = useState<OverflowElement[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanForOverflow = useCallback(() => {
    if (!layoutDebugMode) return;
    
    setIsScanning(true);
    const found: OverflowElement[] = [];
    
    // Walk all elements
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const scrollWidth = htmlEl.scrollWidth;
      const clientWidth = htmlEl.clientWidth;
      const delta = scrollWidth - clientWidth;
      
      // Element is overflowing if scrollWidth > clientWidth by more than 1px
      if (delta > 1 && htmlEl.offsetWidth > 0) {
        found.push({
          element: htmlEl,
          scrollWidth,
          clientWidth,
          delta,
          tagName: htmlEl.tagName.toLowerCase(),
          className: htmlEl.className?.toString().slice(0, 60) || '',
        });
        
        // Add debug outline
        htmlEl.style.outline = '2px solid hsl(0 100% 50% / 0.7)';
        htmlEl.style.outlineOffset = '-1px';
      }
    });
    
    // Also check document overflow
    const docDelta = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (docDelta > 1) {
      console.warn('[LayoutDebug] Document overflow detected:', {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        delta: docDelta,
      });
    }
    
    setOverflowElements(found);
    setIsScanning(false);
    
    // Log to console
    if (found.length > 0) {
      console.group('[LayoutDebug] Overflow Elements Found');
      found.forEach((item, i) => {
        console.log(`${i + 1}. <${item.tagName}> delta: ${item.delta}px`, {
          element: item.element,
          scrollWidth: item.scrollWidth,
          clientWidth: item.clientWidth,
          class: item.className,
        });
      });
      console.groupEnd();
    } else {
      console.log('[LayoutDebug] ✓ No overflow detected');
    }
  }, [layoutDebugMode]);

  // Clear highlights when debug mode is turned off
  useEffect(() => {
    if (!layoutDebugMode) {
      document.querySelectorAll('*').forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style.outline?.includes('hsl(0 100% 50%')) {
          htmlEl.style.outline = '';
          htmlEl.style.outlineOffset = '';
        }
      });
      setOverflowElements([]);
    }
  }, [layoutDebugMode]);

  // Rescan on route change or resize
  useEffect(() => {
    if (!layoutDebugMode) return;
    
    const timer = setTimeout(scanForOverflow, 500);
    
    const handleResize = () => {
      setTimeout(scanForOverflow, 200);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [layoutDebugMode, scanForOverflow]);

  if (!layoutDebugMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Results Panel */}
      {overflowElements.length > 0 && (
        <div className="bg-destructive/95 text-destructive-foreground rounded-lg shadow-lg p-3 max-w-xs text-xs backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">⚠️ Overflow Detected</span>
            <Badge variant="secondary" className="text-[10px]">
              {overflowElements.length} elements
            </Badge>
          </div>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {overflowElements.slice(0, 5).map((item, i) => (
              <li key={i} className="truncate">
                &lt;{item.tagName}&gt; +{item.delta}px
              </li>
            ))}
            {overflowElements.length > 5 && (
              <li className="text-muted-foreground">
                +{overflowElements.length - 5} more (see console)
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center gap-2 bg-background/95 border border-border rounded-lg p-2 shadow-lg backdrop-blur-sm">
        <Badge variant={overflowElements.length > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
          {isScanning ? 'Scanning...' : overflowElements.length > 0 ? `${overflowElements.length} issues` : '✓ Clean'}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={scanForOverflow}
          disabled={isScanning}
        >
          <Bug className="h-3 w-3 mr-1" />
          Rescan
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setLayoutDebugMode(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
