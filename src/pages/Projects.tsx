import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Pencil, Trash2, Check, X, FolderKanban } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageTitle } from '@/components/ui/PageTitle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';
import { useToast } from '@/hooks/use-toast';

const defaultSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'];
const defaultTimeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];

export default function Projects() {
  const { projects, currentProjectId, setCurrentProject, addProject, updateProject, deleteProject, eas, batches, results } = useStore();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    broker: '',
    timezone: 'UTC',
    defaultSymbols: ['EURUSD', 'GBPUSD', 'USDJPY'],
    defaultTimeframes: ['H1', 'H4', 'D1'],
  });

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        broker: project.broker,
        timezone: project.timezone,
        defaultSymbols: project.defaultSymbols,
        defaultTimeframes: project.defaultTimeframes,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        broker: '',
        timezone: 'UTC',
        defaultSymbols: ['EURUSD', 'GBPUSD', 'USDJPY'],
        defaultTimeframes: ['H1', 'H4', 'D1'],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Project name is required', variant: 'destructive' });
      return;
    }

    if (editingProject) {
      updateProject(editingProject.id, formData);
      toast({ title: 'Success', description: 'Project updated' });
    } else {
      const newProject: Project = {
        id: uuidv4(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addProject(newProject);
      setCurrentProject(newProject.id);
      toast({ title: 'Success', description: 'Project created' });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (confirm(`Delete project "${project?.name}"? This will also delete all associated EAs, batches, and results.`)) {
      deleteProject(id);
      toast({ title: 'Deleted', description: 'Project removed' });
    }
  };

  const toggleSymbol = (symbol: string) => {
    setFormData((prev) => ({
      ...prev,
      defaultSymbols: prev.defaultSymbols.includes(symbol)
        ? prev.defaultSymbols.filter((s) => s !== symbol)
        : [...prev.defaultSymbols, symbol],
    }));
  };

  const toggleTimeframe = (tf: string) => {
    setFormData((prev) => ({
      ...prev,
      defaultTimeframes: prev.defaultTimeframes.includes(tf)
        ? prev.defaultTimeframes.filter((t) => t !== tf)
        : [...prev.defaultTimeframes, tf],
    }));
  };

  const getProjectStats = (projectId: string) => {
    const projectEAs = eas.filter((e) => e.projectId === projectId);
    const projectBatches = batches.filter((b) => b.projectId === projectId);
    const projectResults = results.filter((r) => {
      const batch = batches.find((b) => b.id === r.batchId);
      return batch?.projectId === projectId;
    });
    return { eaCount: projectEAs.length, batchCount: projectBatches.length, resultCount: projectResults.length };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Projects" 
          subtitle="Organize your EAs and backtests by project"
        />
        <Button onClick={() => handleOpenDialog()} variant="default">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const stats = getProjectStats(project.id);
          const isSelected = project.id === currentProjectId;

          return (
            <Card
              key={project.id}
              variant={isSelected ? 'stat' : 'stat'}
              className={cn('cursor-pointer', isSelected && 'ring-1 ring-primary')}
              onClick={() => setCurrentProject(project.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'rounded-lg p-2',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{project.broker || 'No broker set'}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                  <span>{stats.eaCount} EAs</span>
                  <span>{stats.batchCount} Batches</span>
                  <span>{stats.resultCount} Results</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.defaultSymbols.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                      {s}
                    </span>
                  ))}
                  {project.defaultSymbols.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{project.defaultSymbols.length - 3}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(project);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty State */}
        {projects.length === 0 && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Create your first project to start organizing your EAs and backtests.
              </p>
              <Button onClick={() => handleOpenDialog()} variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Forex Major Pairs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker">Broker / Notes</Label>
              <Input
                id="broker"
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                placeholder="e.g., IC Markets"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Symbols</Label>
              <div className="flex flex-wrap gap-2">
                {defaultSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => toggleSymbol(symbol)}
                    className={cn(
                      'px-3 py-1 text-sm font-mono rounded-md transition-colors',
                      formData.defaultSymbols.includes(symbol)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Timeframes</Label>
              <div className="flex flex-wrap gap-2">
                {defaultTimeframes.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => toggleTimeframe(tf)}
                    className={cn(
                      'px-3 py-1 text-sm font-mono rounded-md transition-colors',
                      formData.defaultTimeframes.includes(tf)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
