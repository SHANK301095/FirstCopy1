/**
 * Phase 5: Chart Zoom/Pan Component
 * Adds zoom/pan controls to any Recharts chart
 * Supports mouse wheel zoom, drag pan, pinch zoom on mobile
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartZoomPanProps {
  children: React.ReactNode;
  dataLength: number;
  className?: string;
  minZoom?: number; // Minimum visible data points
  showControls?: boolean;
  onRangeChange?: (start: number, end: number) => void;
}

interface ZoomState {
  start: number;
  end: number;
}

export function ChartZoomPan({
  children,
  dataLength,
  className,
  minZoom = 10,
  showControls = true,
  onRangeChange,
}: ChartZoomPanProps) {
  const [zoom, setZoom] = useState<ZoomState>({ start: 0, end: dataLength });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef(0);

  // Reset zoom when data changes
  useEffect(() => {
    setZoom({ start: 0, end: dataLength });
  }, [dataLength]);

  // Notify parent of range changes
  useEffect(() => {
    onRangeChange?.(zoom.start, zoom.end);
  }, [zoom.start, zoom.end, onRangeChange]);

  const visibleRange = zoom.end - zoom.start;

  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const range = prev.end - prev.start;
      if (range <= minZoom) return prev;
      const center = (prev.start + prev.end) / 2;
      const newRange = Math.max(minZoom, range * 0.7);
      return {
        start: Math.max(0, Math.floor(center - newRange / 2)),
        end: Math.min(dataLength, Math.ceil(center + newRange / 2)),
      };
    });
  }, [dataLength, minZoom]);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const range = prev.end - prev.start;
      const center = (prev.start + prev.end) / 2;
      const newRange = Math.min(dataLength, range * 1.4);
      return {
        start: Math.max(0, Math.floor(center - newRange / 2)),
        end: Math.min(dataLength, Math.ceil(center + newRange / 2)),
      };
    });
  }, [dataLength]);

  const resetZoom = useCallback(() => {
    setZoom({ start: 0, end: dataLength });
  }, [dataLength]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, [zoomIn, zoomOut]);

  // Drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const dx = e.clientX - dragStart;
    const dataShift = Math.round((dx / containerWidth) * visibleRange * -1);
    
    if (dataShift === 0) return;

    setZoom(prev => {
      const newStart = Math.max(0, prev.start + dataShift);
      const newEnd = Math.min(dataLength, prev.end + dataShift);
      if (newStart === prev.start && newEnd === prev.end) return prev;
      // Keep range constant during pan
      if (newStart === 0) return { start: 0, end: Math.min(dataLength, visibleRange) };
      if (newEnd === dataLength) return { start: Math.max(0, dataLength - visibleRange), end: dataLength };
      return { start: newStart, end: newEnd };
    });
    setDragStart(e.clientX);
  }, [isDragging, dragStart, visibleRange, dataLength]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (lastTouchDistance.current > 0) {
        const scale = distance / lastTouchDistance.current;
        if (scale > 1.05) zoomIn();
        else if (scale < 0.95) zoomOut();
      }
      lastTouchDistance.current = distance;
    }
  }, [zoomIn, zoomOut]);

  const zoomPercent = Math.round((visibleRange / dataLength) * 100);

  return (
    <div className={cn('relative group', className)}>
      {/* Zoom controls */}
      {showControls && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border/50">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} title="Zoom In">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} title="Zoom Out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom} title="Reset">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground px-1 font-mono">
            {zoomPercent}%
          </span>
        </div>
      )}

      {/* Chart container with zoom/pan handlers */}
      <div
        ref={containerRef}
        className={cn('select-none', isDragging && 'cursor-grabbing')}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onDoubleClick={resetZoom}
      >
        {children}
      </div>

      {/* Range indicator */}
      {visibleRange < dataLength && (
        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/50 rounded-full transition-all"
            style={{
              width: `${zoomPercent}%`,
              marginLeft: `${(zoom.start / dataLength) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Hook to slice data based on zoom range
 */
export function useZoomedData<T>(data: T[], start: number, end: number): T[] {
  return React.useMemo(
    () => data.slice(Math.max(0, start), Math.min(data.length, end)),
    [data, start, end]
  );
}
