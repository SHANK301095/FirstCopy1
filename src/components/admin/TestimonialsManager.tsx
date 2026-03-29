import { useState, useEffect } from 'react';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Testimonial {
  id: string;
  user_id: string;
  content: string;
  stats_text: string | null;
  approved: boolean;
  created_at: string;
}

export function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });
    setTestimonials((data as Testimonial[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id: string, approved: boolean) => {
    const { error } = await supabase
      .from('testimonials')
      .update({ approved })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update');
      return;
    }
    toast.success(approved ? 'Approved!' : 'Rejected');
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('testimonials').delete().eq('id', id);
    toast.success('Deleted');
    fetchAll();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Testimonials ({testimonials.length})
        </h3>
      </div>

      {testimonials.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No testimonials yet</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {testimonials.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm mb-2">"{t.content}"</p>
                    {t.stats_text && (
                      <p className="text-xs text-emerald-400 font-medium mb-2">{t.stats_text}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant={t.approved ? 'default' : 'secondary'}>
                        {t.approved ? 'Approved' : 'Pending'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!t.approved && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-400" onClick={() => updateStatus(t.id, true)}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {t.approved && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-400" onClick={() => updateStatus(t.id, false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(t.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
