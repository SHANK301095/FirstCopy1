/**
 * URL State Persistence Hook - P0 UX
 * Persists filters/sorts in URL for shareable states
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type URLStateValue = string | number | boolean | string[] | null;

export function useURLState<T extends Record<string, URLStateValue>>(
  defaults: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const result = { ...defaults } as T;
    
    for (const key in defaults) {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        const defaultValue = defaults[key];
        
        if (typeof defaultValue === 'boolean') {
          (result as any)[key] = urlValue === 'true';
        } else if (typeof defaultValue === 'number') {
          const num = parseFloat(urlValue);
          (result as any)[key] = isNaN(num) ? defaultValue : num;
        } else if (Array.isArray(defaultValue)) {
          (result as any)[key] = urlValue.split(',').filter(Boolean);
        } else {
          (result as any)[key] = urlValue;
        }
      }
    }
    
    return result;
  }, [searchParams, defaults]);

  const setState = useCallback((updates: Partial<T>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      
      for (const key in updates) {
        const value = updates[key];
        const defaultValue = defaults[key];
        
        if (value === null || value === defaultValue || value === '') {
          newParams.delete(key);
        } else if (Array.isArray(value)) {
          if (value.length > 0) {
            newParams.set(key, value.join(','));
          } else {
            newParams.delete(key);
          }
        } else {
          newParams.set(key, String(value));
        }
      }
      
      return newParams;
    }, { replace: true });
  }, [setSearchParams, defaults]);

  const resetState = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return [state, setState, resetState];
}
