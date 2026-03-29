/**
 * Optimistic Update Hook
 * Provides instant UI feedback for async operations with automatic rollback
 */

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OptimisticState<T> {
  data: T;
  isOptimistic: boolean;
  error: Error | null;
}

interface UseOptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollbackData: T) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticUpdate<T>(
  initialData: T,
  options: UseOptimisticUpdateOptions<T> = {}
) {
  const { toast } = useToast();
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
    error: null,
  });
  
  const rollbackRef = useRef<T>(initialData);

  const execute = useCallback(async <R>(
    optimisticData: T,
    asyncOperation: () => Promise<R>,
    onOperationSuccess?: (result: R) => T
  ): Promise<R | null> => {
    // Store rollback data
    rollbackRef.current = state.data;
    
    // Apply optimistic update immediately
    setState({
      data: optimisticData,
      isOptimistic: true,
      error: null,
    });

    try {
      const result = await asyncOperation();
      
      // Confirm the update with actual server data if transformer provided
      const confirmedData = onOperationSuccess 
        ? onOperationSuccess(result) 
        : optimisticData;
      
      setState({
        data: confirmedData,
        isOptimistic: false,
        error: null,
      });

      if (options.successMessage) {
        toast({
          title: options.successMessage,
          variant: 'default',
        });
      }

      options.onSuccess?.(confirmedData);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Operation failed');
      
      // Rollback to previous state
      setState({
        data: rollbackRef.current,
        isOptimistic: false,
        error: err,
      });

      toast({
        title: options.errorMessage || 'Operation failed',
        description: err.message,
        variant: 'destructive',
      });

      options.onError?.(err, rollbackRef.current);
      return null;
    }
  }, [state.data, toast, options]);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data, isOptimistic: false }));
  }, []);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isOptimistic: false,
      error: null,
    });
  }, [initialData]);

  return {
    data: state.data,
    isOptimistic: state.isOptimistic,
    error: state.error,
    execute,
    setData,
    reset,
  };
}

/**
 * Hook for optimistic list operations (add, update, delete)
 */
export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  options: UseOptimisticUpdateOptions<T[]> = {}
) {
  const { toast } = useToast();
  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const rollbackRef = useRef<T[]>(initialItems);

  const addItem = useCallback(async (
    item: T,
    asyncOperation: () => Promise<T>
  ): Promise<T | null> => {
    rollbackRef.current = items;
    
    // Optimistically add
    setItems(prev => [item, ...prev]);
    setPendingIds(prev => new Set(prev).add(item.id));

    try {
      const result = await asyncOperation();
      
      // Replace optimistic item with server result
      setItems(prev => prev.map(i => i.id === item.id ? result : i));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      if (options.successMessage) {
        toast({ title: options.successMessage });
      }

      return result;
    } catch (error) {
      // Rollback
      setItems(rollbackRef.current);
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      const err = error instanceof Error ? error : new Error('Failed to add item');
      toast({
        title: options.errorMessage || 'Failed to add item',
        description: err.message,
        variant: 'destructive',
      });

      return null;
    }
  }, [items, toast, options]);

  const updateItem = useCallback(async (
    id: string,
    updates: Partial<T>,
    asyncOperation: () => Promise<T>
  ): Promise<T | null> => {
    rollbackRef.current = items;
    
    // Optimistically update
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    setPendingIds(prev => new Set(prev).add(id));

    try {
      const result = await asyncOperation();
      
      setItems(prev => prev.map(i => i.id === id ? result : i));
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (options.successMessage) {
        toast({ title: options.successMessage });
      }

      return result;
    } catch (error) {
      // Rollback
      setItems(rollbackRef.current);
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const err = error instanceof Error ? error : new Error('Failed to update item');
      toast({
        title: options.errorMessage || 'Failed to update',
        description: err.message,
        variant: 'destructive',
      });

      return null;
    }
  }, [items, toast, options]);

  const deleteItem = useCallback(async (
    id: string,
    asyncOperation: () => Promise<void>
  ): Promise<boolean> => {
    rollbackRef.current = items;
    
    // Optimistically remove
    setItems(prev => prev.filter(i => i.id !== id));
    setPendingIds(prev => new Set(prev).add(id));

    try {
      await asyncOperation();
      
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (options.successMessage) {
        toast({ title: options.successMessage });
      }

      return true;
    } catch (error) {
      // Rollback
      setItems(rollbackRef.current);
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const err = error instanceof Error ? error : new Error('Failed to delete item');
      toast({
        title: options.errorMessage || 'Failed to delete',
        description: err.message,
        variant: 'destructive',
      });

      return false;
    }
  }, [items, toast, options]);

  const deleteItems = useCallback(async (
    ids: string[],
    asyncOperation: () => Promise<void>
  ): Promise<boolean> => {
    rollbackRef.current = items;
    const idsSet = new Set(ids);
    
    // Optimistically remove all
    setItems(prev => prev.filter(i => !idsSet.has(i.id)));
    setPendingIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });

    try {
      await asyncOperation();
      
      setPendingIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });

      toast({ title: `${ids.length} items deleted` });
      return true;
    } catch (error) {
      // Rollback
      setItems(rollbackRef.current);
      setPendingIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });

      const err = error instanceof Error ? error : new Error('Failed to delete items');
      toast({
        title: 'Failed to delete items',
        description: err.message,
        variant: 'destructive',
      });

      return false;
    }
  }, [items, toast]);

  return {
    items,
    setItems,
    pendingIds,
    isPending: (id: string) => pendingIds.has(id),
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
  };
}
