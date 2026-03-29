/**
 * Template Creation Wizard
 * Step-by-step guide for creating workflow templates
 */

import { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  FileText,
  Settings,
  Tag,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface WizardFormData {
  name: string;
  description: string;
  category: 'quick' | 'advanced' | 'custom';
  timeframe: string;
  slippage: number;
  commission: number;
  positionSizingMode: string;
  positionSizingValue: number;
  tags: string[];
}

interface TemplateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: WizardFormData) => void;
}

const WIZARD_STEPS = [
  { id: 'basics', title: 'Basic Info', icon: FileText, description: 'Name and describe your template' },
  { id: 'config', title: 'Configuration', icon: Settings, description: 'Set trading parameters' },
  { id: 'sizing', title: 'Position Sizing', icon: Zap, description: 'Define risk management' },
  { id: 'tags', title: 'Tags & Review', icon: Tag, description: 'Organize and confirm' },
];

const TIMEFRAME_OPTIONS = [
  { value: '1m', label: '1 Minute', description: 'Ultra-high frequency' },
  { value: '5m', label: '5 Minutes', description: 'Scalping' },
  { value: '15m', label: '15 Minutes', description: 'Intraday' },
  { value: '1H', label: '1 Hour', description: 'Short-term' },
  { value: '4H', label: '4 Hours', description: 'Swing' },
  { value: '1D', label: 'Daily', description: 'Position trading' },
];

const CATEGORY_OPTIONS = [
  { value: 'quick', label: 'Quick Start', description: 'Simple, ready-to-use presets' },
  { value: 'advanced', label: 'Advanced', description: 'Complex multi-step workflows' },
  { value: 'custom', label: 'Custom', description: 'Your personal configurations' },
];

const POSITION_SIZING_OPTIONS = [
  { value: 'fixed', label: 'Fixed Lots', description: 'Use same lot size for all trades' },
  { value: 'risk-percent', label: 'Risk %', description: 'Risk fixed percentage per trade' },
  { value: 'equity-percent', label: 'Equity %', description: 'Use percentage of equity' },
];

const SUGGESTED_TAGS = [
  'intraday', 'swing', 'scalping', 'trend-following', 'mean-reversion',
  'breakout', 'momentum', 'hedging', 'options', 'futures', 'forex', 'crypto',
];

export function TemplateWizard({ open, onOpenChange, onComplete }: TemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    name: '',
    description: '',
    category: 'custom',
    timeframe: '15m',
    slippage: 0.1,
    commission: 0.02,
    positionSizingMode: 'fixed',
    positionSizingValue: 1,
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const step = WIZARD_STEPS[currentStep];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name.trim().length > 0;
      case 1:
        return formData.timeframe && formData.slippage >= 0 && formData.commission >= 0;
      case 2:
        return formData.positionSizingMode && formData.positionSizingValue > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      timeframe: '15m',
      slippage: 0.1,
      commission: 0.02,
      positionSizingMode: 'fixed',
      positionSizingValue: 1,
      tags: [],
    });
    setTagInput('');
    onOpenChange(false);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        {/* Header with Progress */}
        <div className="p-6 pb-0">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Workflow Template
            </DialogTitle>
          </DialogHeader>

          {/* Step Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {WIZARD_STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center gap-2',
                    i <= currentStep ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                      i < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : i === currentStep
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'hidden sm:block w-8 h-0.5 transition-colors',
                        i < currentStep ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-1" />
          </div>

          {/* Step Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 pb-6">
          <div className="min-h-[280px] animate-fade-in" key={currentStep}>
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., My Scalping Setup"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe when and how to use this template..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: opt.value as any }))}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-all',
                          formData.category === opt.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIMEFRAME_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, timeframe: opt.value }))}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-all',
                          formData.timeframe === opt.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Slippage (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.slippage}
                      onChange={e => setFormData(prev => ({ ...prev, slippage: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-muted-foreground">Expected price deviation</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Commission (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.commission}
                      onChange={e => setFormData(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-muted-foreground">Per-trade cost</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Position Sizing Method</Label>
                  <div className="grid gap-2">
                    {POSITION_SIZING_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, positionSizingMode: opt.value }))}
                        className={cn(
                          'p-4 rounded-lg border text-left transition-all flex items-center gap-4',
                          formData.positionSizingMode === opt.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                          formData.positionSizingMode === opt.value
                            ? 'border-primary'
                            : 'border-muted-foreground'
                        )}>
                          {formData.positionSizingMode === opt.value && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{opt.label}</p>
                          <p className="text-sm text-muted-foreground">{opt.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    {formData.positionSizingMode === 'fixed' ? 'Lot Size' : 'Value (%)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={formData.positionSizingValue}
                    onChange={e => setFormData(prev => ({ ...prev, positionSizingValue: parseFloat(e.target.value) || 0.01 }))}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Type a tag and press Enter..."
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">Suggested tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {SUGGESTED_TAGS.filter(t => !formData.tags.includes(t)).slice(0, 8).map(tag => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => addTag(tag)}
                        >
                          + {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Summary */}
                <div className="mt-6 p-4 rounded-xl bg-muted/50 border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    Review Your Template
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{formData.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium capitalize">{formData.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Timeframe</p>
                      <p className="font-medium">{formData.timeframe}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Position Sizing</p>
                      <p className="font-medium">
                        {formData.positionSizingValue} {formData.positionSizingMode === 'fixed' ? 'lots' : '%'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Slippage</p>
                      <p className="font-medium">{formData.slippage}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Commission</p>
                      <p className="font-medium">{formData.commission}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t mt-6">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <div className="flex gap-1.5">
              {WIZARD_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === currentStep ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            <Button onClick={handleNext} disabled={!canProceed()}>
              {currentStep === WIZARD_STEPS.length - 1 ? (
                <>
                  Create Template
                  <Check className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
