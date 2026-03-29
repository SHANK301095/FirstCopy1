/**
 * Report Builder Component
 * Phase G: Customizable report templates, export options
 */

import { useState } from 'react';
import { 
  FileText, Download, Eye, Settings, Palette,
  BarChart3, Table, PieChart, Image, Type,
  ChevronDown, Loader2, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  REPORT_TEMPLATES,
  type ReportConfig,
  type ReportSection,
} from '@/lib/reportTemplates';

interface ReportBuilderProps {
  resultData?: Record<string, unknown>;
  onExport?: (config: ReportConfig, format: 'pdf' | 'html' | 'excel') => void;
  className?: string;
}

export function ReportBuilder({ resultData, onExport, className }: ReportBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('comprehensive');
  const [config, setConfig] = useState<ReportConfig>(REPORT_TEMPLATES[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'html' | 'excel'>('pdf');
  const [expandedSections, setExpandedSections] = useState<string[]>(['sections']);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setConfig(template);
    }
  };

  const toggleSection = (sectionId: string) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  const updateConfig = <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate export
    onExport?.(config, exportFormat);
    setIsExporting(false);
  };

  const getSectionIcon = (type: ReportSection['type']) => {
    switch (type) {
      case 'equity-chart': 
      case 'drawdown-chart': 
        return <BarChart3 className="h-4 w-4" />;
      case 'trades-table': 
        return <Table className="h-4 w-4" />;
      case 'kpis':
      case 'risk-metrics':
      case 'distribution':
        return <PieChart className="h-4 w-4" />;
      case 'monthly-heatmap':
        return <Image className="h-4 w-4" />;
      case 'summary':
      case 'custom-text':
      case 'annotations':
      case 'comparison':
        return <Type className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const toggleExpandSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Report Builder
        </CardTitle>
        <CardDescription>
          Customize and export professional backtest reports
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Report Template</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TEMPLATES.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <span>{template.name}</span>
                    {template.isPremium && (
                      <Badge variant="secondary" className="text-xs">Pro</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Report Title & Branding */}
        <Collapsible 
          open={expandedSections.includes('branding')} 
          onOpenChange={() => toggleExpandSection('branding')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="font-medium text-sm">Branding & Title</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('branding') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="p-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportTitle">Report Title</Label>
              <Input
                id="reportTitle"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Backtest Performance Report"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.branding?.primaryColor || '#3b82f6'}
                    onChange={(e) => updateConfig('branding', { 
                      ...config.branding, 
                      primaryColor: e.target.value 
                    })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={config.branding?.primaryColor || '#3b82f6'}
                    onChange={(e) => updateConfig('branding', { 
                      ...config.branding, 
                      primaryColor: e.target.value 
                    })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="showLogo" className="text-sm">Include Logo</Label>
                <Switch
                  id="showLogo"
                  checked={config.branding?.showLogo ?? true}
                  onCheckedChange={(v) => updateConfig('branding', {
                    ...config.branding,
                    showLogo: v
                  })}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Sections */}
        <Collapsible 
          open={expandedSections.includes('sections')} 
          onOpenChange={() => toggleExpandSection('sections')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium text-sm">Report Sections</span>
              <Badge variant="outline" className="text-xs">
                {config.sections.filter(s => s.enabled).length}/{config.sections.length}
              </Badge>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.includes('sections') ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[200px] p-2">
              <div className="space-y-1.5">
                {config.sections.map(section => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-all text-left",
                      "hover:bg-muted/50 active:scale-[0.98]",
                      section.enabled 
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-muted/30 border-transparent opacity-60"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded shrink-0 transition-colors",
                      section.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {getSectionIcon(section.type)}
                    </div>
                    <span className="text-sm flex-1 truncate">{section.title}</span>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      section.enabled 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-muted-foreground/50"
                    )}>
                      {section.enabled && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Export Options */}
        <div className="space-y-4">
          <Label>Export Format</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['pdf', 'html', 'excel'] as const).map(format => (
              <Button
                key={format}
                variant={exportFormat === format ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat(format)}
                className="w-full"
              >
                {exportFormat === format && <Check className="h-3 w-3 mr-1" />}
                {format.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={!resultData}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleExport}
            disabled={isExporting || !resultData}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>

        {!resultData && (
          <p className="text-xs text-center text-muted-foreground">
            Run a backtest first to generate reports
          </p>
        )}
      </CardContent>
    </Card>
  );
}
