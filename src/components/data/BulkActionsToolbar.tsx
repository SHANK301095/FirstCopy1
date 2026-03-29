/**
 * Bulk Actions Toolbar - P1 Data Manager
 */

import { useState } from 'react';
import { 
  Trash2, 
  Tag, 
  Download, 
  MoreHorizontal,
  CheckSquare,
  Square,
  FolderArchive,
  Merge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';

interface BulkActionsToolbarProps<T> {
  selectedItems: T[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete?: (items: T[]) => Promise<void>;
  onExport?: (items: T[]) => void;
  onTag?: (items: T[], tag: string) => void;
  onArchive?: (items: T[]) => void;
  className?: string;
}

export function BulkActionsToolbar<T extends { id: string }>({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onExport,
  onTag,
  onArchive,
  className,
}: BulkActionsToolbarProps<T>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedCount = selectedItems.length;
  const allSelected = selectedCount === totalItems && totalItems > 0;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(selectedItems);
      onDeselectAll();
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className={cn(
        "flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg animate-fade-in",
        className
      )}>
        {/* Selection toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {allSelected ? 'Deselect' : 'Select All'}
        </Button>

        <div className="h-4 w-px bg-border" />

        {/* Selection count */}
        <Badge variant="secondary" className="text-xs">
          {selectedCount} selected
        </Badge>

        <div className="flex-1" />

        {/* Action buttons */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onExport(selectedItems)}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        )}

        {onTag && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tag
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['Verified', 'Needs Review', 'High Quality', 'Test Data'].map(tag => (
                <DropdownMenuItem key={tag} onClick={() => onTag(selectedItems, tag)}>
                  {tag}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onArchive && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onArchive(selectedItems)}
          >
            <FolderArchive className="h-3.5 w-3.5" />
            Archive
          </Button>
        )}

        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Merge className="h-4 w-4 mr-2" />
              Merge Datasets
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeselectAll}>
              Clear Selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
