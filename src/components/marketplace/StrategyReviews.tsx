/**
 * Phase 15: Strategy Marketplace Reviews UI
 * Shows ratings, reviews, and allows users to submit reviews
 */

import { useState } from 'react';
import { Star, ThumbsUp, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  userId: string;
  displayName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

interface StrategyReviewsProps {
  strategyId: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onSubmitReview?: (rating: number, comment: string) => Promise<void>;
  className?: string;
}

function StarRating({ rating, onChange, size = 'sm' }: { rating: number; onChange?: (r: number) => void; size?: 'sm' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', lg: 'h-6 w-6' };
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            sizes[size],
            i <= rating ? 'fill-chart-4 text-chart-4' : 'text-muted-foreground/30',
            onChange && 'cursor-pointer hover:text-chart-4'
          )}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  );
}

function RatingBreakdown({ reviews }: { reviews: Review[] }) {
  const counts = [0, 0, 0, 0, 0];
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++; });
  const total = reviews.length || 1;

  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map(star => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="w-3 text-muted-foreground">{star}</span>
          <Star className="h-3 w-3 fill-chart-4 text-chart-4" />
          <Progress value={(counts[star - 1] / total) * 100} className="h-1.5 flex-1" />
          <span className="w-6 text-right text-muted-foreground">{counts[star - 1]}</span>
        </div>
      ))}
    </div>
  );
}

export function StrategyReviews({
  strategyId,
  reviews,
  averageRating,
  totalReviews,
  onSubmitReview,
  className,
}: StrategyReviewsProps) {
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async () => {
    if (newRating === 0 || !onSubmitReview) return;
    setSubmitting(true);
    try {
      await onSubmitReview(newRating, newComment);
      setNewRating(0);
      setNewComment('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Reviews ({totalReviews})</span>
          {onSubmitReview && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
              Write Review
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
            <StarRating rating={Math.round(averageRating)} />
            <div className="text-xs text-muted-foreground mt-1">{totalReviews} reviews</div>
          </div>
          <div className="flex-1">
            <RatingBreakdown reviews={reviews} />
          </div>
        </div>

        {/* Submit form */}
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm">Your rating:</span>
              <StarRating rating={newRating} onChange={setNewRating} size="lg" />
            </div>
            <Textarea
              placeholder="Share your experience with this strategy..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={newRating === 0 || submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        )}

        {/* Review list */}
        <div className="space-y-3">
          {reviews.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
          )}
          {reviews.map(review => (
            <div key={review.id} className="border-b border-border/50 pb-3 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{review.displayName}</span>
                  <StarRating rating={review.rating} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground ml-6">{review.comment}</p>
              )}
              <div className="ml-6 mt-1">
                <Button size="sm" variant="ghost" className="h-5 text-[10px] gap-1 text-muted-foreground">
                  <ThumbsUp className="h-3 w-3" /> {review.helpful}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
