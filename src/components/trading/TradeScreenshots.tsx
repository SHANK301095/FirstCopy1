/**
 * Trade Screenshots - Upload before/after chart images for a trade
 */
import { useState, useEffect, useCallback } from 'react';
import { Image, Upload, Trash2, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Screenshot {
  id: string;
  storage_path: string;
  type: string;
  caption: string | null;
  file_size: number | null;
  created_at: string;
  url?: string;
}

interface TradeScreenshotsProps {
  tradeId: string;
  compact?: boolean;
}

export function TradeScreenshots({ tradeId, compact }: TradeScreenshotsProps) {
  const { user } = useAuth();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const fetchScreenshots = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trade_screenshots')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true });
    if (error) return;
    
    // Get public URLs
    const withUrls = (data || []).map((s: any) => ({
      ...s,
      url: supabase.storage.from('trade-screenshots').getPublicUrl(s.storage_path).data.publicUrl,
    }));
    setScreenshots(withUrls);
  }, [user, tradeId]);

  useEffect(() => { fetchScreenshots(); }, [fetchScreenshots]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB per image'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${tradeId}/${type}-${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('trade-screenshots')
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('trade_screenshots')
        .insert({
          trade_id: tradeId,
          user_id: user.id,
          storage_path: path,
          type,
          file_size: file.size,
        } as any);
      if (dbError) throw dbError;

      toast.success(`${type} screenshot uploaded`);
      fetchScreenshots();
    } catch (err: any) {
      toast.error('Upload failed', { description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (ss: Screenshot) => {
    try {
      await supabase.storage.from('trade-screenshots').remove([ss.storage_path]);
      await supabase.from('trade_screenshots').delete().eq('id', ss.id);
      toast.success('Deleted');
      fetchScreenshots();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{screenshots.length} screenshots</span>
        {screenshots.length > 0 && (
          <div className="flex -space-x-2">
            {screenshots.slice(0, 3).map(ss => (
              <img
                key={ss.id}
                src={ss.url}
                alt={ss.type}
                className="h-6 w-6 rounded border-2 border-background object-cover cursor-pointer"
                onClick={() => setLightbox(ss.url || null)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Image className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Screenshots</span>
        <Badge variant="secondary" className="text-[10px]">{screenshots.length}</Badge>
      </div>

      {/* Upload buttons */}
      <div className="flex gap-2">
        {['before', 'after'].map(type => (
          <label key={type} className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed cursor-pointer text-xs",
            "hover:border-primary hover:bg-primary/5 transition-all",
            uploading && "opacity-50 pointer-events-none"
          )}>
            <Upload className="h-3 w-3" />
            {type.charAt(0).toUpperCase() + type.slice(1)}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleUpload(e, type)}
            />
          </label>
        ))}
      </div>

      {/* Gallery */}
      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {screenshots.map(ss => (
            <div key={ss.id} className="relative group rounded-lg overflow-hidden border">
              <img
                src={ss.url}
                alt={ss.type}
                className="w-full h-24 object-cover cursor-pointer"
                onClick={() => setLightbox(ss.url || null)}
              />
              <Badge className="absolute top-1 left-1 text-[9px]" variant="secondary">
                {ss.type}
              </Badge>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(ss)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader><DialogTitle className="sr-only">Screenshot</DialogTitle></DialogHeader>
          {lightbox && <img src={lightbox} alt="Trade screenshot" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
