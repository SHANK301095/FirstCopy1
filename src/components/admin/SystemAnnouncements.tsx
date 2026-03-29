/**
 * System Announcements Component
 * Create global banners/notifications for all users
 */

import { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Trash2, Edit2, Save, Clock,
  AlertCircle, Info, AlertTriangle, CheckCircle, X,
  Calendar, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
  dismissible: boolean;
  active: boolean;
  scheduledStart?: string;
  scheduledEnd?: string;
  createdAt: string;
  createdBy: string;
}

const STORAGE_KEY = 'mmc-announcements';

const TYPE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: AlertCircle,
};

const TYPE_STYLES = {
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  success: 'bg-green-500/10 border-green-500/30 text-green-500',
  error: 'bg-red-500/10 border-red-500/30 text-red-500',
};

const PRIORITY_BADGES = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-red-500/10 text-red-500',
};

export function SystemAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editDialog, setEditDialog] = useState<{ open: boolean; announcement: Announcement | null }>({ open: false, announcement: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [formData, setFormData] = useState<Partial<Announcement>>({});

  // Load announcements from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAnnouncements(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save to localStorage
  const saveAnnouncements = (data: Announcement[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAnnouncements(data);
  };

  const openAddDialog = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
      dismissible: true,
      active: true,
    });
    setEditDialog({ open: true, announcement: null });
  };

  const openEditDialog = (announcement: Announcement) => {
    setFormData({ ...announcement });
    setEditDialog({ open: true, announcement });
  };

  const handleSave = () => {
    if (!formData.title || !formData.message) {
      toast.error('Title and message are required');
      return;
    }

    if (editDialog.announcement) {
      // Update existing
      const updated = announcements.map(a => 
        a.id === editDialog.announcement!.id 
          ? { ...a, ...formData } 
          : a
      );
      saveAnnouncements(updated);
      toast.success('Announcement updated');
    } else {
      // Create new
      const newAnnouncement: Announcement = {
        id: `ann-${Date.now()}`,
        title: formData.title!,
        message: formData.message!,
        type: formData.type || 'info',
        priority: formData.priority || 'medium',
        dismissible: formData.dismissible ?? true,
        active: formData.active ?? true,
        scheduledStart: formData.scheduledStart,
        scheduledEnd: formData.scheduledEnd,
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
      };
      saveAnnouncements([newAnnouncement, ...announcements]);
      toast.success('Announcement created');
    }
    
    setEditDialog({ open: false, announcement: null });
  };

  const handleDelete = () => {
    const updated = announcements.filter(a => a.id !== deleteDialog.id);
    saveAnnouncements(updated);
    toast.success('Announcement deleted');
    setDeleteDialog({ open: false, id: '' });
  };

  const toggleActive = (id: string) => {
    const updated = announcements.map(a => 
      a.id === id ? { ...a, active: !a.active } : a
    );
    saveAnnouncements(updated);
  };

  const activeCount = announcements.filter(a => a.active).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                System Announcements
              </CardTitle>
              <CardDescription>
                Create banners and notifications visible to all users
              </CardDescription>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <Badge variant="outline">{announcements.length} Total</Badge>
            <Badge variant="default">{activeCount} Active</Badge>
          </div>

          <Separator />

          {/* Announcements List */}
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet</p>
              <p className="text-sm">Create one to notify all users</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => {
                const TypeIcon = TYPE_ICONS[ann.type];
                return (
                  <div
                    key={ann.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      TYPE_STYLES[ann.type],
                      !ann.active && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <TypeIcon className="h-5 w-5 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold">{ann.title}</span>
                            <Badge variant="outline" className={PRIORITY_BADGES[ann.priority]}>
                              {ann.priority}
                            </Badge>
                            {ann.dismissible && (
                              <Badge variant="outline" className="text-xs">Dismissible</Badge>
                            )}
                            {!ann.active && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm opacity-80">{ann.message}</p>
                          <div className="text-xs opacity-60 mt-2 flex items-center gap-3">
                            <span>Created: {format(new Date(ann.createdAt), 'MMM d, yyyy')}</span>
                            {ann.scheduledStart && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(ann.scheduledStart), 'MMM d')} - {ann.scheduledEnd ? format(new Date(ann.scheduledEnd), 'MMM d') : 'No end'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleActive(ann.id)}
                          title={ann.active ? 'Deactivate' : 'Activate'}
                        >
                          {ann.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(ann)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteDialog({ open: true, id: ann.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editDialog.announcement ? 'Edit Announcement' : 'New Announcement'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Announcement message"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.type || 'info'}
                  onValueChange={(v) => setFormData({ ...formData, type: v as Announcement['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority || 'medium'}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as Announcement['priority'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Scheduled Start (optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledStart || ''}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Scheduled End (optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduledEnd || ''}
                  onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.dismissible ?? true}
                  onCheckedChange={(v) => setFormData({ ...formData, dismissible: v })}
                />
                <Label>Allow users to dismiss</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.active ?? true}
                  onCheckedChange={(v) => setFormData({ ...formData, active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, announcement: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
