/**
 * Chart Controls - P0 Results & Analytics
 * Zoom, screenshot, and legend customization
 */

import { useState, useRef, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Camera, 
  RotateCcw,
  Download,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ChartControlsProps {
  chartRef: React.RefObject<HTMLDivElement>;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  zoomLevel?: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (level: number) => void;
  className?: string;
}

export function ChartControls({
  chartRef,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomLevel = 100,
  minZoom = 50,
  maxZoom = 200,
  onZoomChange,
  className,
}: ChartControlsProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleScreenshot = useCallback(async () => {
    if (!chartRef.current) return;

    setIsCapturing(true);

    try {
      // Dynamic import to avoid loading html2canvas unless needed
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `chart-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [chartRef]);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Zoom Controls */}
      <div className="flex items-center border border-border/50 rounded-md">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-r-none"
          onClick={onZoomOut}
          disabled={zoomLevel <= minZoom}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <div className="px-2 text-xs text-muted-foreground min-w-[3rem] text-center border-x border-border/50">
          {zoomLevel}%
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 rounded-l-none"
          onClick={onZoomIn}
          disabled={zoomLevel >= maxZoom}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Reset Zoom */}
      {zoomLevel !== 100 && onResetZoom && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onResetZoom}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Screenshot */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5"
        onClick={handleScreenshot}
        disabled={isCapturing}
      >
        <Camera className={cn("h-3.5 w-3.5", isCapturing && "animate-pulse")} />
        <span className="hidden sm:inline text-xs">Screenshot</span>
      </Button>
    </div>
  );
}

/**
 * Heatmap Legend Customizer - P0 Results
 */
interface HeatmapLegendProps {
  colors: { min: string; mid: string; max: string };
  onColorsChange: (colors: { min: string; mid: string; max: string }) => void;
  minValue?: number;
  maxValue?: number;
  className?: string;
}

const COLOR_PRESETS = [
  { name: 'Default', min: '#ef4444', mid: '#fbbf24', max: '#22c55e' },
  { name: 'Blue Scale', min: '#1e3a5f', mid: '#3b82f6', max: '#93c5fd' },
  { name: 'Purple', min: '#4c1d95', mid: '#8b5cf6', max: '#c4b5fd' },
  { name: 'Monochrome', min: '#27272a', mid: '#71717a', max: '#e4e4e7' },
];

export function HeatmapLegendCustomizer({
  colors,
  onColorsChange,
  minValue = -100,
  maxValue = 100,
  className,
}: HeatmapLegendProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("h-7 gap-1.5", className)}>
          <Settings2 className="h-3.5 w-3.5" />
          <span className="text-xs">Legend</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
        <DropdownMenuLabel className="text-xs">Color Presets</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLOR_PRESETS.map(preset => (
          <DropdownMenuItem
            key={preset.name}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onColorsChange({ min: preset.min, mid: preset.mid, max: preset.max })}
          >
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.min }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.mid }} />
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.max }} />
            </div>
            <span className="text-xs">{preset.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
