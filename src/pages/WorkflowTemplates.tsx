/**
 * Workflow Templates Page
 * Save, load, and manage reusable backtest workflow configurations
 */

import { useState, useEffect, useRef } from 'react';
import {
  Bookmark,
  Plus,
  Play,
  Trash2,
  Copy,
  Edit3,
  Check,
  X,
  FolderOpen,
  Save,
  Star,
  Clock,
  ArrowRight,
  Sparkles,
  Download,
  Upload,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { useBacktestStore } from '@/lib/backtestStore';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { TemplateWizard } from '@/components/workflow/TemplateWizard';
import { PageTitle } from '@/components/ui/PageTitle';
import { secureLogger } from '@/lib/secureLogger';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'quick' | 'advanced' | 'custom';
  isFavorite: boolean;
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
  config: {
    dataSource?: string;
    symbol?: string;
    timeframe?: string;
    strategyType?: string;
    dateRange?: { start: string; end: string };
    slippage?: number;
    commission?: number;
    positionSizing?: { mode: string; value: number };
  };
  tags: string[];
}

// No preset templates - users create their own
const PRESET_TEMPLATES: WorkflowTemplate[] = [];

export default function WorkflowTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as 'quick' | 'advanced' | 'custom',
    timeframe: '15m',
    slippage: 0.1,
    commission: 0.02,
    tags: '',
  });

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('workflow-templates');
    if (saved) {
      const parsed = JSON.parse(saved);
      setTemplates([...PRESET_TEMPLATES, ...parsed]);
    } else {
      setTemplates(PRESET_TEMPLATES);
    }
  }, []);

  // Save custom templates
  const saveTemplates = (newTemplates: WorkflowTemplate[]) => {
    const customOnly = newTemplates.filter(t => !t.id.startsWith('preset-'));
    localStorage.setItem('workflow-templates', JSON.stringify(customOnly));
    setTemplates([...PRESET_TEMPLATES, ...customOnly]);
  };

  const createTemplate = () => {
    const newTemplate: WorkflowTemplate = {
      id: `custom-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      isFavorite: false,
      createdAt: Date.now(),
      usageCount: 0,
      config: {
        timeframe: formData.timeframe,
        slippage: formData.slippage,
        commission: formData.commission,
      },
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    saveTemplates([...templates, newTemplate]);
    setIsCreateOpen(false);
    resetForm();
    toast.success('Template created', { description: formData.name });
  };

  // Create template from wizard
  const createFromWizard = (wizardData: {
    name: string;
    description: string;
    category: WorkflowTemplate['category'];
    timeframe: string;
    slippage: number;
    commission: number;
    positionSizingMode: 'fixed' | 'percent' | 'risk';
    positionSizingValue: number;
    tags: string[];
  }) => {
    const newTemplate: WorkflowTemplate = {
      id: `custom-${Date.now()}`,
      name: wizardData.name,
      description: wizardData.description,
      category: wizardData.category,
      isFavorite: false,
      createdAt: Date.now(),
      usageCount: 0,
      config: {
        timeframe: wizardData.timeframe,
        slippage: wizardData.slippage,
        commission: wizardData.commission,
        positionSizing: {
          mode: wizardData.positionSizingMode,
          value: wizardData.positionSizingValue,
        },
      },
      tags: wizardData.tags,
    };

    saveTemplates([...templates, newTemplate]);
    toast.success('Template created', { description: wizardData.name });
  };

  // Export templates as JSON
  const exportTemplates = () => {
    const customTemplates = templates.filter(t => !t.id.startsWith('preset-'));
    if (customTemplates.length === 0) {
      toast.error('No templates to export', { description: 'Create some templates first' });
      return;
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: customTemplates.map(t => ({
        name: t.name,
        description: t.description,
        category: t.category,
        config: t.config,
        tags: t.tags,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Templates exported', { description: `${customTemplates.length} templates saved to file` });
  };

  // Import templates from JSON
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.templates || !Array.isArray(data.templates)) {
          throw new Error('Invalid template file format');
        }

        let imported = 0;
        const newTemplates: WorkflowTemplate[] = [];

        for (const t of data.templates) {
          if (!t.name) continue;

          newTemplates.push({
            id: `custom-${Date.now()}-${imported}`,
            name: t.name,
            description: t.description || '',
            category: t.category || 'custom',
            isFavorite: false,
            createdAt: Date.now(),
            usageCount: 0,
            config: t.config || {},
            tags: t.tags || [],
          });
          imported++;
        }

        if (imported > 0) {
          saveTemplates([...templates, ...newTemplates]);
          toast.success('Templates imported', { description: `${imported} templates added` });
        } else {
          toast.error('No valid templates found');
        }
      } catch (error) {
        secureLogger.warn('workflow', 'Template import failed', { error: String(error) });
        toast.error('Import failed', { description: 'Invalid JSON file format' });
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateTemplate = () => {
    if (!editingTemplate) return;

    const updated = templates.map(t => 
      t.id === editingTemplate.id
        ? {
            ...t,
            name: formData.name,
            description: formData.description,
            config: {
              ...t.config,
              timeframe: formData.timeframe,
              slippage: formData.slippage,
              commission: formData.commission,
            },
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          }
        : t
    );

    saveTemplates(updated);
    setEditingTemplate(null);
    resetForm();
    toast.success('Template updated');
  };

  const deleteTemplate = (id: string) => {
    if (id.startsWith('preset-')) {
      toast.error('Cannot delete preset templates');
      return;
    }
    saveTemplates(templates.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const duplicateTemplate = (template: WorkflowTemplate) => {
    const duplicate: WorkflowTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: Date.now(),
      usageCount: 0,
      isFavorite: false,
    };
    saveTemplates([...templates, duplicate]);
    toast.success('Template duplicated');
  };

  const toggleFavorite = (id: string) => {
    const updated = templates.map(t => 
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    );
    saveTemplates(updated);
  };

  const useTemplate = (template: WorkflowTemplate) => {
    // Update usage stats
    const updated = templates.map(t => 
      t.id === template.id
        ? { ...t, lastUsed: Date.now(), usageCount: t.usageCount + 1 }
        : t
    );
    saveTemplates(updated);

    // Store config for workflow page
    localStorage.setItem('active-workflow-config', JSON.stringify(template.config));
    toast.success('Template loaded', { description: 'Navigate to Workflow to use it' });
    navigate('/workflow');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      timeframe: '15m',
      slippage: 0.1,
      commission: 0.02,
      tags: '',
    });
  };

  const startEditing = (template: WorkflowTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      timeframe: template.config.timeframe || '15m',
      slippage: template.config.slippage || 0.1,
      commission: template.config.commission || 0.02,
      tags: template.tags.join(', '),
    });
    setEditingTemplate(template);
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const favoriteTemplates = filteredTemplates.filter(t => t.isFavorite);
  const otherTemplates = filteredTemplates.filter(t => !t.isFavorite);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Template Wizard */}
      <TemplateWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onComplete={createFromWizard}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle 
          title="Workflow Templates" 
          subtitle="Save and reuse common backtest configurations"
        />

        <div className="flex items-center gap-2">
          {/* Import/Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Import/Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import from JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportTemplates}>
                <Download className="h-4 w-4 mr-2" />
                Export to JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Wizard Button */}
          <Button variant="outline" className="gap-2" onClick={() => setIsWizardOpen(true)}>
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">Wizard</span>
          </Button>

          {/* Quick Create */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Custom Workflow"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when to use this template..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Select
                    value={formData.timeframe}
                    onValueChange={v => setFormData(prev => ({ ...prev, timeframe: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1H">1 Hour</SelectItem>
                      <SelectItem value="4H">4 Hours</SelectItem>
                      <SelectItem value="1D">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Slippage (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.slippage}
                    onChange={e => setFormData(prev => ({ ...prev, slippage: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="intraday, nifty, scalping"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={createTemplate} disabled={!formData.name}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="quick">Quick Start</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Favorites Section */}
      {favoriteTemplates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            Favorites
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={useTemplate}
                onEdit={startEditing}
                onDelete={deleteTemplate}
                onDuplicate={duplicateTemplate}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {favoriteTemplates.length > 0 ? 'All Templates' : 'Templates'}
        </h2>
        {otherTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No templates found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create your first template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={useTemplate}
                onEdit={startEditing}
                onDelete={deleteTemplate}
                onDuplicate={duplicateTemplate}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={formData.tags}
                onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button onClick={updateTemplate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onUse,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
}: {
  template: WorkflowTemplate;
  onUse: (t: WorkflowTemplate) => void;
  onEdit: (t: WorkflowTemplate) => void;
  onDelete: (id: string) => void;
  onDuplicate: (t: WorkflowTemplate) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const isPreset = template.id.startsWith('preset-');

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50">
      {/* Favorite button */}
      <button
        onClick={() => onToggleFavorite(template.id)}
        className="absolute top-3 right-3 z-10 opacity-60 hover:opacity-100 transition-opacity"
      >
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            template.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
          )}
        />
      </button>

      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {template.name}
              {isPreset && (
                <Badge variant="secondary" className="text-[10px]">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  Preset
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Config badges */}
        <div className="flex flex-wrap gap-1.5">
          {template.config.timeframe && (
            <Badge variant="outline" className="text-xs">
              {template.config.timeframe}
            </Badge>
          )}
          {template.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Usage stats */}
        {template.usageCount > 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Used {template.usageCount} times
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" className="flex-1 gap-1" onClick={() => onUse(template)}>
            <Play className="h-3 w-3" />
            Use Template
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="px-2"
            onClick={() => onDuplicate(template)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {!isPreset && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="px-2"
                onClick={() => onEdit(template)}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-2 text-destructive hover:text-destructive"
                onClick={() => onDelete(template.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
