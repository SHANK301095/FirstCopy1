/**
 * EA Manager Page
 * Spec: Import, compile, and manage EA presets
 */

import { useState, useEffect } from 'react';
import {
  Upload,
  FileCode,
  Settings2,
  Play,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FolderOpen,
  Plus,
  Search,
  Tag,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as eaStore from '@/desktop/mt5/ea-store';
import type { EAInfo, CompileResult } from '@/types/electron-api.d.ts';

// Check if running in Electron
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!window.electronAPI;
};

export default function EAManager() {
  const [eas, setEas] = useState<EAInfo[]>([]);
  const [selectedEA, setSelectedEA] = useState<EAInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCompiling, setIsCompiling] = useState<string | null>(null);
  const [compileResults, setCompileResults] = useState<Record<string, CompileResult>>({});
  const [expandedEAs, setExpandedEAs] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const inDesktopMode = isElectron();

  // Load EAs on mount
  useEffect(() => {
    loadEAs();
  }, []);

  const loadEAs = async () => {
    const loaded = await eaStore.listEAs();
    setEas(loaded);
    
    // Load compile results for each EA
    const results: Record<string, CompileResult> = {};
    for (const ea of loaded) {
      const result = await eaStore.getCompileResult(ea.id);
      if (result) {
        results[ea.id] = result;
      }
    }
    setCompileResults(results);
  };

  const handleImportEA = async () => {
    if (!inDesktopMode) {
      toast.error('EA import requires desktop mode');
      return;
    }

    setIsImporting(true);
    try {
      const files = await window.electronAPI?.selectFile({
        filters: [{ name: 'MQL5 Files', extensions: ['mq5'] }],
        multiple: false,
      });

      if (files && files.length > 0) {
        const filePath = files[0];
        const fileName = filePath.split(/[\\/]/).pop()?.replace('.mq5', '') || 'Unknown EA';
        
        const newEA = await eaStore.addEA({
          name: fileName,
          path: filePath,
          version: '1.0.0',
          compiled: false,
          tags: [],
          presets: [],
        });

        setEas(prev => [...prev, newEA]);
        setSelectedEA(newEA);
        toast.success(`Imported ${fileName}`);
      }
    } catch (error) {
      toast.error('Failed to import EA');
    } finally {
      setIsImporting(false);
      setImportDialogOpen(false);
    }
  };

  const handleCompileEA = async (ea: EAInfo) => {
    if (!inDesktopMode) {
      toast.error('Compilation requires desktop mode');
      return;
    }

    setIsCompiling(ea.id);
    try {
      const result = await window.electronAPI?.compileEA(ea.path);
      
      if (result) {
        await eaStore.saveCompileResult(ea.id, result);
        setCompileResults(prev => ({ ...prev, [ea.id]: result }));
        
        if (result.success) {
          toast.success(`${ea.name} compiled successfully`);
          await eaStore.updateEA(ea.id, { compiled: true, lastCompiled: Date.now() });
          loadEAs();
        } else {
          toast.error(`Compilation failed: ${result.errors.length} errors`);
        }
      }
    } catch (error) {
      toast.error('Compilation failed');
    } finally {
      setIsCompiling(null);
    }
  };

  const handleCompileAll = async () => {
    const uncompiled = eas.filter(ea => !ea.compiled);
    for (const ea of uncompiled) {
      await handleCompileEA(ea);
    }
  };

  const handleDeleteEA = async (ea: EAInfo) => {
    await eaStore.deleteEA(ea.id);
    setEas(prev => prev.filter(e => e.id !== ea.id));
    if (selectedEA?.id === ea.id) {
      setSelectedEA(null);
    }
    toast.success(`Deleted ${ea.name}`);
  };

  const handleImportPreset = async (ea: EAInfo) => {
    if (!inDesktopMode) {
      toast.error('Preset import requires desktop mode');
      return;
    }

    try {
      const files = await window.electronAPI?.selectFile({
        filters: [{ name: 'MT5 Preset Files', extensions: ['set'] }],
        multiple: false,
      });

      if (files && files.length > 0) {
        const filePath = files[0];
        const content = await window.electronAPI?.readFile(filePath);
        const params = eaStore.parseSetFile(content || '');
        const presetName = filePath.split(/[\\/]/).pop()?.replace('.set', '') || 'Preset';

        const preset = await eaStore.addPreset(ea.id, {
          name: presetName,
          setFilePath: filePath,
          params,
        });

        await eaStore.updateEA(ea.id, {
          presets: [...(ea.presets || []), preset],
        });

        loadEAs();
        toast.success(`Imported preset: ${presetName}`);
      }
    } catch (error) {
      toast.error('Failed to import preset');
    }
  };

  const handleDeletePreset = async (ea: EAInfo, presetId: string) => {
    await eaStore.deletePreset(ea.id, presetId);
    loadEAs();
    toast.success('Preset deleted');
  };

  const toggleExpanded = (eaId: string) => {
    setExpandedEAs(prev => {
      const next = new Set(prev);
      if (next.has(eaId)) {
        next.delete(eaId);
      } else {
        next.add(eaId);
      }
      return next;
    });
  };

  const filteredEAs = eas.filter(
    ea =>
      ea.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ea.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCompileStatusIcon = (ea: EAInfo) => {
    const result = compileResults[ea.id];
    if (isCompiling === ea.id) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (result?.success) {
      return <CheckCircle className="h-4 w-4 text-chart-2" />;
    }
    if (result && !result.success) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return <AlertTriangle className="h-4 w-4 text-chart-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EA Manager</h1>
          <p className="text-muted-foreground">
            Import, compile, and manage Expert Advisors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCompileAll}
            disabled={!inDesktopMode || eas.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Compile All
          </Button>

          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!inDesktopMode}>
                <Plus className="h-4 w-4 mr-2" />
                Import EA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Expert Advisor</DialogTitle>
                <DialogDescription>
                  Select an .mq5 file to import into the EA library
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <Button
                  variant="outline"
                  className="w-full h-32 border-dashed"
                  onClick={handleImportEA}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to browse for .mq5 files
                      </span>
                    </div>
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Desktop mode warning */}
      {!inDesktopMode && (
        <Card className="border-chart-4 bg-chart-4/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-chart-4" />
            <div>
              <p className="font-medium">Desktop Mode Required</p>
              <p className="text-sm text-muted-foreground">
                EA import and compilation features require the desktop app with MT5 integration.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EA List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expert Advisors</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search EAs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {filteredEAs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileCode className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No EAs imported yet</p>
                  <p className="text-xs">Import an .mq5 file to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEAs.map(ea => (
                    <Collapsible
                      key={ea.id}
                      open={expandedEAs.has(ea.id)}
                      onOpenChange={() => toggleExpanded(ea.id)}
                    >
                      <div
                        className={cn(
                          'rounded-lg border p-3 transition-colors cursor-pointer',
                          selectedEA?.id === ea.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                        onClick={() => setSelectedEA(ea)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                {expandedEAs.has(ea.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <FileCode className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{ea.name}</span>
                          </div>
                          {getCompileStatusIcon(ea)}
                        </div>

                        <div className="ml-7 mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            v{ea.version}
                          </Badge>
                          {ea.presets.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {ea.presets.length} presets
                            </Badge>
                          )}
                        </div>

                        <CollapsibleContent className="mt-2 ml-7 space-y-1">
                          {ea.presets.map(preset => (
                            <div
                              key={preset.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                <Settings2 className="h-3 w-3" />
                                {preset.name}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeletePreset(ea, preset.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* EA Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedEA ? selectedEA.name : 'Select an EA'}
            </CardTitle>
            {selectedEA && (
              <CardDescription>
                Version {selectedEA.version} • {selectedEA.compiled ? 'Compiled' : 'Not compiled'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedEA ? (
              <Tabs defaultValue="info" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="presets">Presets</TabsTrigger>
                  <TabsTrigger value="compile">Compile Log</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">File Path</p>
                      <p className="text-sm font-mono truncate" title={selectedEA.path}>
                        {selectedEA.path}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Last Compiled</p>
                      <p className="text-sm">
                        {selectedEA.lastCompiled
                          ? new Date(selectedEA.lastCompiled).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEA.tags.length > 0 ? (
                        selectedEA.tags.map(tag => (
                          <Badge key={tag} variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No tags</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCompileEA(selectedEA)}
                      disabled={isCompiling === selectedEA.id || !inDesktopMode}
                    >
                      {isCompiling === selectedEA.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Compile
                    </Button>

                    <Button variant="outline" onClick={() => handleImportPreset(selectedEA)} disabled={!inDesktopMode}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Preset
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete EA?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {selectedEA.name} and all its presets. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteEA(selectedEA)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TabsContent>

                <TabsContent value="presets" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedEA.presets.length} preset{selectedEA.presets.length !== 1 && 's'}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => handleImportPreset(selectedEA)} disabled={!inDesktopMode}>
                      <Plus className="h-4 w-4 mr-1" />
                      Import .set
                    </Button>
                  </div>

                  {selectedEA.presets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed">
                      <Settings2 className="h-10 w-10 mb-3 opacity-50" />
                      <p className="text-sm">No presets yet</p>
                      <p className="text-xs">Import a .set file to add presets</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEA.presets.map(preset => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Settings2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{preset.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {Object.keys(preset.params).length} parameters
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(preset.createdAt).toLocaleDateString()}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeletePreset(selectedEA, preset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="compile" className="space-y-4">
                  {compileResults[selectedEA.id] ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {compileResults[selectedEA.id].success ? (
                          <Badge className="bg-chart-2 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Compiled Successfully
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Compilation Failed
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Duration: {compileResults[selectedEA.id].duration}ms
                        </span>
                      </div>

                      {compileResults[selectedEA.id].errors.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-destructive">
                            Errors ({compileResults[selectedEA.id].errors.length})
                          </p>
                          <div className="space-y-1 max-h-40 overflow-auto">
                            {compileResults[selectedEA.id].errors.map((err, i) => (
                              <div
                                key={i}
                                className="text-xs font-mono p-2 rounded bg-destructive/10 text-destructive"
                              >
                                Line {err.line}: {err.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {compileResults[selectedEA.id].warnings.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-chart-4">
                            Warnings ({compileResults[selectedEA.id].warnings.length})
                          </p>
                          <div className="space-y-1 max-h-40 overflow-auto">
                            {compileResults[selectedEA.id].warnings.map((warn, i) => (
                              <div
                                key={i}
                                className="text-xs font-mono p-2 rounded bg-chart-4/10 text-chart-4"
                              >
                                Line {warn.line}: {warn.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Full Log</p>
                        <ScrollArea className="h-48 rounded border bg-muted/50 p-3">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {compileResults[selectedEA.id].logContent || 'No log available'}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileCode className="h-10 w-10 mb-3 opacity-50" />
                      <p className="text-sm">No compile logs yet</p>
                      <p className="text-xs">Compile the EA to see logs</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FileCode className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg">Select an EA to view details</p>
                <p className="text-sm">Or import a new one to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
