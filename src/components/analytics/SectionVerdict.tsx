/**
 * SectionVerdict — 5-point summary card for analytics sections
 */
import { CheckCircle, XCircle, Ban, Play, FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SectionVerdictProps {
  strength: string;
  weakness: string;
  stop: string;
  cont: string;
  test: string;
}

const items = [
  { key: 'strength', label: 'Strength', color: 'text-emerald-400', Icon: CheckCircle },
  { key: 'weakness', label: 'Weakness', color: 'text-red-400', Icon: XCircle },
  { key: 'stop', label: 'Stop', color: 'text-amber-400', Icon: Ban },
  { key: 'cont', label: 'Continue', color: 'text-blue-400', Icon: Play },
  { key: 'test', label: 'Test', color: 'text-purple-400', Icon: FlaskConical },
] as const;

export function SectionVerdict(props: SectionVerdictProps) {
  return (
    <Card className="border-primary/10 bg-primary/[0.02]">
      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        {items.map(({ key, label, color, Icon }) => (
          <div key={key}>
            <span className={`${color} font-semibold flex items-center gap-1`}>
              <Icon className="h-3 w-3" /> {label}
            </span>
            <p className="text-muted-foreground mt-0.5">{props[key]}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
