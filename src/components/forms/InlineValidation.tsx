/**
 * Inline Validation Feedback - P1 Forms
 */

import { useState, useEffect, type ReactNode, type InputHTMLAttributes } from 'react';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ValidationRule {
  test: (value: string) => boolean | Promise<boolean>;
  message: string;
}

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  rules?: ValidationRule[];
  onValidationChange?: (isValid: boolean) => void;
  showSuccessIcon?: boolean;
  debounceMs?: number;
}

export function ValidatedInput({
  label,
  rules = [],
  onValidationChange,
  showSuccessIcon = true,
  debounceMs = 300,
  className,
  ...props
}: ValidatedInputProps) {
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [value, setValue] = useState(props.defaultValue?.toString() || '');

  useEffect(() => {
    if (!value || rules.length === 0) {
      setStatus('idle');
      setErrorMessage('');
      return;
    }

    const timer = setTimeout(async () => {
      setStatus('validating');

      for (const rule of rules) {
        const result = await rule.test(value);
        if (!result) {
          setStatus('invalid');
          setErrorMessage(rule.message);
          onValidationChange?.(false);
          return;
        }
      }

      setStatus('valid');
      setErrorMessage('');
      onValidationChange?.(true);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, rules, debounceMs, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    props.onChange?.(e);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="flex items-center gap-1">
          {label}
          {props.required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          {...props}
          value={value}
          onChange={handleChange}
          className={cn(
            "pr-8",
            status === 'invalid' && "border-destructive focus-visible:ring-destructive",
            status === 'valid' && "border-profit focus-visible:ring-profit",
            className
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {status === 'validating' && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {status === 'valid' && showSuccessIcon && (
            <Check className="h-4 w-4 text-profit" />
          )}
          {status === 'invalid' && (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      {status === 'invalid' && errorMessage && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * Required Field Indicator
 */
interface RequiredFieldProps {
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export function RequiredField({ children, required = true, className }: RequiredFieldProps) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {children}
      {required && <span className="text-destructive font-medium">*</span>}
    </span>
  );
}

/**
 * Autosave Indicator
 */
interface AutosaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  className?: string;
}

export function AutosaveIndicator({ status, lastSaved, className }: AutosaveIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-profit" />
          <span className="text-muted-foreground">
            Saved {lastSaved ? `at ${lastSaved.toLocaleTimeString()}` : ''}
          </span>
        </>
      )}
      {status === 'error' && (
        <>
          <X className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  );
}
