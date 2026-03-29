import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function TestimonialForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [statsText, setStatsText] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !content.trim() || !consent) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('testimonials').insert({
        user_id: user.id,
        content: content.trim(),
        stats_text: statsText.trim() || null,
      });
      
      if (error) throw error;
      
      toast({ title: 'Thank you! 🙏', description: 'Your testimonial has been submitted for review.' });
      setContent('');
      setStatsText('');
      setConsent(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Share Your Success Story
        </CardTitle>
        <CardDescription>Tell us how MMCai helped your trading journey</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>How has MMCai helped your trading?</Label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. MMCai ka AI copilot mera game changer hai..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            maxLength={500}
          />
        </div>
        
        <div className="space-y-2">
          <Label>P&L Improvement (optional)</Label>
          <Input
            value={statsText}
            onChange={(e) => setStatsText(e.target.value)}
            placeholder="e.g. +₹5L / Win rate from 45% to 72%"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
          />
          <label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer">
            I allow MMCai to display this testimonial publicly
          </label>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim() || !consent}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Submitting...' : 'Submit Testimonial'}
        </Button>
      </CardContent>
    </Card>
  );
}
