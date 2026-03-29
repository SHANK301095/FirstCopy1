/**
 * Copy to Clipboard Hook
 * Easy clipboard operations with toast feedback
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseCopyToClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  timeout?: number;
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const {
    successMessage = 'Copied to clipboard',
    errorMessage = 'Failed to copy',
    timeout = 2000,
  } = options;
  
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      const err = new Error('Clipboard not supported');
      setError(err);
      toast({
        title: errorMessage,
        description: 'Your browser does not support clipboard operations.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setError(null);
      
      toast({
        title: successMessage,
        duration: 2000,
      });

      // Reset after timeout
      setTimeout(() => {
        setIsCopied(false);
      }, timeout);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Copy failed');
      setError(error);
      setIsCopied(false);
      
      toast({
        title: errorMessage,
        description: error.message,
        variant: 'destructive',
      });

      return false;
    }
  }, [toast, successMessage, errorMessage, timeout]);

  const reset = useCallback(() => {
    setIsCopied(false);
    setError(null);
  }, []);

  return {
    copy,
    isCopied,
    error,
    reset,
  };
}
