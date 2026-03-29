/**
 * Trade Screenshot Upload - before/after chart screenshots for trade journal
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TradeScreenshotUploadProps {
  tradeId: string;
  existingSetup?: string | null;
  existingResult?: string | null;
  onUpload?: (type: 'setup' | 'result', url: string) => void;
  onDelete?: (type: 'setup' | 'result') => void;
  compact?: boolean;
}

export function TradeScreenshotUpload({
  tradeId,
  existingSetup,
  existingResult,
  onUpload,
  onDelete,
  compact = false,
}: TradeScreenshotUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<'setup' | 'result' | null>(null);
  const [setupUrl, setSetupUrl] = useState(existingSetup ?? null);
  const [resultUrl, setResultUrl] = useState(existingResult ?? null);

  const handleUpload = useCallback(async (type: 'setup' | 'result', file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.');
      return;
    }

    setUploading(type);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/${tradeId}/${type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('trade-screenshots')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(path);

      // Since bucket is private, use createSignedUrl instead
      const { data: signedData, error: signedError } = await supabase.storage
        .from('trade-screenshots')
        .createSignedUrl(path, 3600 * 24 * 365); // 1 year

      const url = signedData?.signedUrl || urlData.publicUrl;

      if (type === 'setup') setSetupUrl(url);
      else setResultUrl(url);

      onUpload?.(type, url);
      toast.success(`${type === 'setup' ? 'Setup' : 'Result'} screenshot uploaded`);
    } catch (err: any) {
      toast.error('Upload failed', { description: err.message });
    } finally {
      setUploading(null);
    }
  }, [user, tradeId, onUpload]);

  const handleDelete = useCallback(async (type: 'setup' | 'result') => {
    if (!user) return;
    try {
      const path = `${user.id}/${tradeId}/${type}`;
      // Try to delete any extension
      const { data: files } = await supabase.storage
        .from('trade-screenshots')
        .list(`${user.id}/${tradeId}`, { search: type });

      if (files && files.length > 0) {
        await supabase.storage
          .from('trade-screenshots')
          .remove(files.map(f => `${user.id}/${tradeId}/${f.name}`));
      }

      if (type === 'setup') setSetupUrl(null);
      else setResultUrl(null);

      onDelete?.(type);
      toast.success('Screenshot removed');
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    }
  }, [user, tradeId, onDelete]);

  const SlotCard = ({ type, url, label }: { type: 'setup' | 'result'; url: string | null; label: string }) => (
    <div className={cn(
      "relative border border-dashed border-border/50 rounded-lg overflow-hidden",
      compact ? "h-24" : "h-36",
      "hover:border-primary/40 transition-colors group"
    )}>
      {url ? (
        <>
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDelete(type)}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>
          <span className="absolute top-1 left-1 text-[9px] bg-background/70 px-1.5 py-0.5 rounded font-medium">{label}</span>
        </>
      ) : (
        <label className="flex flex-col items-center justify-center h-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(type, file);
            }}
          />
          {uploading === type ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5 mb-1 opacity-50" />
              <span className="text-[10px]">{label}</span>
              <span className="text-[9px] opacity-50">Click to upload</span>
            </>
          )}
        </label>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      <SlotCard type="setup" url={setupUrl} label="Setup (Before)" />
      <SlotCard type="result" url={resultUrl} label="Result (After)" />
    </div>
  );
}
