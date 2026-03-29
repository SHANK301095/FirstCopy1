import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhoneRequiredModalProps {
  open: boolean;
  userId: string;
  onComplete: () => void;
}

export function PhoneRequiredModal({ open, userId, onComplete }: PhoneRequiredModalProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const validatePhone = (value: string) => {
    // Remove all non-digits for validation
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return 'Phone number must be at least 10 digits';
    }
    if (digitsOnly.length > 15) {
      return 'Phone number is too long';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validatePhone(phone);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profile_private_data')
        .upsert({ user_id: userId, phone: phone.trim() });

      if (updateError) throw updateError;

      toast({
        title: 'Phone number saved',
        description: 'Your phone number has been updated successfully.',
      });
      onComplete();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save phone number. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md cyber-auth-card"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl cyber-title-glow">Phone Number Required</DialogTitle>
          <DialogDescription>
            Please provide your mobile number to continue using MMC. This helps us secure your account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium cyber-label">Mobile Number</Label>
            <div className="relative group cyber-input-wrapper">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-11 h-12 cyber-input"
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive animate-fade-in">{error}</p>}
            <p className="text-xs text-muted-foreground">Enter your mobile number with country code</p>
          </div>
          
          <Button 
            type="submit" 
            variant="default"
            className="w-full h-12 gap-2 text-base"
            disabled={loading || !phone.trim()}
          >
            {loading ? (
              <>
                <span className="cyber-spinner h-4 w-4" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
