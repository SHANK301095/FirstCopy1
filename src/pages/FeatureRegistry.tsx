/**
 * Feature Registry Page
 * Lists all 600+ platform features with status tracking
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  featureRegistry, 
  getFeatureStats, 
  getCategories,
  getSubcategories,
  Feature,
  FeatureStatus,
  getEffectiveFeatureStatus,
  setFeatureStatusOverride
} from '@/lib/featureRegistry';
import { cn } from '@/lib/utils';

export default function FeatureRegistry() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const stats = getFeatureStats();
  const categories = getCategories();
  
  const filteredFeatures = useMemo(() => {
    return featureRegistry.filter(feature => {
      const matchesSearch = 
        feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || getEffectiveFeatureStatus(feature.id) === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, selectedCategory, selectedStatus]);

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, Feature[]> = {};
    filteredFeatures.forEach(feature => {
      const key = feature.category;
      if (!groups[key]) groups[key] = [];
      groups[key].push(feature);
    });
    return groups;
  }, [filteredFeatures]);

  const getStatusIcon = (status: FeatureStatus) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle2 className="h-4 w-4 text-profit" />;
      case 'stubbed':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: FeatureStatus) => {
    switch (status) {
      case 'implemented':
        return <Badge variant="default" className="bg-profit/20 text-profit border-profit/30">Implemented</Badge>;
      case 'stubbed':
        return <Badge variant="default" className="bg-warning/20 text-warning border-warning/30">Stubbed</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  const getPriorityBadge = (priority: Feature['priority']) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case 'important':
        return <Badge variant="default" className="text-xs bg-primary/20 text-primary border-primary/30">Important</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Nice to have</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Feature Registry</h1>
        <p className="text-muted-foreground">
          Comprehensive tracking of all {stats.total} platform features
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-profit">{stats.implemented}</div>
            <div className="text-sm text-muted-foreground">Implemented</div>
            <Progress value={stats.implementedPct} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.stubbed}</div>
            <div className="text-sm text-muted-foreground">Stubbed</div>
            <Progress value={stats.stubbedPct} className="mt-2 h-1 [&>div]:bg-warning" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</div>
            <div className="text-sm text-muted-foreground">Not Started</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Features</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features by name, ID, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="implemented">Implemented</SelectItem>
                <SelectItem value="stubbed">Stubbed</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredFeatures.length} of {stats.total} features
      </div>

      {/* Feature List */}
      <ScrollArea className="h-[calc(100vh-450px)]">
        {viewMode === 'list' ? (
          <div className="space-y-6">
            {Object.entries(groupedFeatures).map(([category, features]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{category}</CardTitle>
                  <CardDescription>{features.length} features</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {features.map(feature => {
                      const effectiveStatus = getEffectiveFeatureStatus(feature.id);
                      return (
                        <div
                          key={feature.id}
                          className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                        >
                          {getStatusIcon(effectiveStatus)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">
                                {feature.id}
                              </span>
                              <span className="font-medium">{feature.name}</span>
                              {feature.subcategory && (
                                <Badge variant="outline" className="text-xs">
                                  {feature.subcategory}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {feature.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getPriorityBadge(feature.priority)}
                            {getStatusBadge(effectiveStatus)}
                            
                            {feature.uiPath && (
                              <Button variant="ghost" size="icon" asChild>
                                <Link to={feature.uiPath}>
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map(feature => {
              const effectiveStatus = getEffectiveFeatureStatus(feature.id);
              return (
                <Card 
                  key={feature.id}
                  className={cn(
                    "hover:border-primary/50 transition-colors",
                    effectiveStatus === 'implemented' && "border-profit/30",
                    effectiveStatus === 'stubbed' && "border-warning/30"
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(effectiveStatus)}
                        <span className="font-mono text-xs text-muted-foreground">
                          {feature.id}
                        </span>
                      </div>
                      {getPriorityBadge(feature.priority)}
                    </div>
                    
                    <div>
                      <h3 className="font-medium">{feature.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {feature.category}
                        </Badge>
                        {feature.subcategory && (
                          <Badge variant="outline" className="text-xs">
                            {feature.subcategory}
                          </Badge>
                        )}
                      </div>
                      
                      {feature.uiPath && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={feature.uiPath} className="flex items-center gap-1">
                            Open <ChevronRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
