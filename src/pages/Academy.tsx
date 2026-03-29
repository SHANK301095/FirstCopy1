/**
 * Academy — Structured learning: Basics → Applied → Mastery
 * With contextual learning links from Analytics, Risk, and Strategies
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, BookOpen, Target, Trophy, ChevronRight,
  BarChart3, Shield, FlaskConical, Play, CheckCircle, Clock,
  Lightbulb, TrendingUp, Brain, Zap, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';

// ── Course Data ──
interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed?: boolean;
  link?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  tier: 'basics' | 'applied' | 'mastery';
  icon: typeof BookOpen;
  lessons: Lesson[];
  contextLinks?: { label: string; path: string }[];
}

const COURSES: Course[] = [
  // ── BASICS ──
  {
    id: 'trading-101', title: 'Trading Fundamentals', tier: 'basics',
    description: 'Core concepts every trader must know before risking capital.',
    icon: BookOpen,
    lessons: [
      { id: 'b1', title: 'What is Risk Management?', duration: '5 min' },
      { id: 'b2', title: 'Understanding Position Sizing', duration: '8 min' },
      { id: 'b3', title: 'Reading a P&L Statement', duration: '6 min' },
      { id: 'b4', title: 'Win Rate vs Expectancy', duration: '7 min' },
      { id: 'b5', title: 'The Role of Drawdown', duration: '5 min' },
    ],
  },
  {
    id: 'journal-101', title: 'Journal Like a Pro', tier: 'basics',
    description: 'How to build a journaling habit that actually improves performance.',
    icon: BookOpen,
    lessons: [
      { id: 'j1', title: 'Why Journaling Matters', duration: '4 min' },
      { id: 'j2', title: 'Fast vs Full Entry Mode', duration: '5 min' },
      { id: 'j3', title: 'Tagging Emotions & Setups', duration: '6 min' },
      { id: 'j4', title: 'Weekly Review Process', duration: '8 min' },
    ],
    contextLinks: [{ label: 'Open Journal', path: '/journal' }],
  },
  // ── APPLIED ──
  {
    id: 'analytics-applied', title: 'Reading Your Analytics', tier: 'applied',
    description: 'Extract actionable insights from your performance data.',
    icon: BarChart3,
    lessons: [
      { id: 'a1', title: 'Equity Curve Interpretation', duration: '6 min' },
      { id: 'a2', title: 'Identifying Behavioral Patterns', duration: '8 min' },
      { id: 'a3', title: 'Setup Performance Analysis', duration: '7 min' },
      { id: 'a4', title: 'Using Compare Mode', duration: '5 min' },
      { id: 'a5', title: 'AI Summary Interpretation', duration: '4 min' },
    ],
    contextLinks: [{ label: 'View Analytics', path: '/analytics' }],
  },
  {
    id: 'risk-applied', title: 'Risk Guardian Mastery', tier: 'applied',
    description: 'Use the Risk Guardian to protect and grow your capital.',
    icon: Shield,
    lessons: [
      { id: 'r1', title: 'Understanding Risk States', duration: '5 min' },
      { id: 'r2', title: 'Position Size Advisory', duration: '7 min' },
      { id: 'r3', title: 'Breach Simulation', duration: '6 min' },
      { id: 'r4', title: 'Session Guardrails', duration: '5 min' },
      { id: 'r5', title: 'Setting Daily Limits', duration: '4 min' },
    ],
    contextLinks: [{ label: 'Open Risk Guardian', path: '/risk-guardian' }],
  },
  {
    id: 'strategy-applied', title: 'Strategy Research Workflow', tier: 'applied',
    description: 'Build, test, and validate strategies the institutional way.',
    icon: FlaskConical,
    lessons: [
      { id: 's1', title: 'Creating a Strategy', duration: '8 min' },
      { id: 's2', title: 'Backtesting Best Practices', duration: '10 min' },
      { id: 's3', title: 'Walk-Forward Validation', duration: '8 min' },
      { id: 's4', title: 'Monte Carlo Analysis', duration: '7 min' },
      { id: 's5', title: 'Deployment Readiness Check', duration: '6 min' },
    ],
    contextLinks: [
      { label: 'Strategy Library', path: '/strategies' },
      { label: 'Backtest', path: '/workflow' },
    ],
  },
  // ── MASTERY ──
  {
    id: 'behavioral-mastery', title: 'Behavioral Edge', tier: 'mastery',
    description: 'Advanced behavioral finance concepts for consistent trading.',
    icon: Brain,
    lessons: [
      { id: 'm1', title: 'Revenge Trading Pattern', duration: '8 min' },
      { id: 'm2', title: 'FOMO Detection & Prevention', duration: '7 min' },
      { id: 'm3', title: 'Overtrading Analysis', duration: '6 min' },
      { id: 'm4', title: 'Building a Discipline Score', duration: '8 min' },
      { id: 'm5', title: 'The Consistency Mindset', duration: '10 min' },
    ],
    contextLinks: [{ label: 'Behavioral Analytics', path: '/analytics' }],
  },
  {
    id: 'prop-mastery', title: 'Prop Firm Success', tier: 'mastery',
    description: 'Pass challenges consistently with data-driven approaches.',
    icon: Trophy,
    lessons: [
      { id: 'p1', title: 'Challenge Selection Framework', duration: '8 min' },
      { id: 'p2', title: 'Risk Budgeting for Challenges', duration: '10 min' },
      { id: 'p3', title: 'Breach Avoidance Strategies', duration: '7 min' },
      { id: 'p4', title: 'Scaling Funded Accounts', duration: '8 min' },
    ],
    contextLinks: [{ label: 'Prop Intelligence', path: '/prop-intelligence' }],
  },
];

const tierConfig = {
  basics: { label: 'Basics', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: BookOpen },
  applied: { label: 'Applied', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Target },
  mastery: { label: 'Mastery', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30', icon: Trophy },
};

function CourseCard({ course }: { course: Course }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = course.icon;
  const completedLessons = course.lessons.filter(l => l.completed).length;
  const progressPct = (completedLessons / course.lessons.length) * 100;
  const tier = tierConfig[course.tier];

  return (
    <Card className="hover:border-primary/20 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg border", tier.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold">{course.title}</h3>
              <Badge variant="outline" className={cn("text-[9px]", tier.color)}>{tier.label}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{course.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground font-mono">{completedLessons}/{course.lessons.length}</span>
        </div>

        {/* Lessons */}
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide Lessons' : `View ${course.lessons.length} Lessons`}
          <ChevronRight className={cn("h-3 w-3 ml-1 transition-transform", expanded && "rotate-90")} />
        </Button>

        {expanded && (
          <div className="space-y-1 pt-1">
            {course.lessons.map((lesson, i) => (
              <div key={lesson.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                <div className={cn(
                  "h-5 w-5 rounded-full border flex items-center justify-center text-[10px] shrink-0",
                  lesson.completed ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-border/30 text-muted-foreground"
                )}>
                  {lesson.completed ? <CheckCircle className="h-3 w-3" /> : i + 1}
                </div>
                <span className="text-xs flex-1">{lesson.title}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {lesson.duration}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Context Links */}
        {course.contextLinks && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {course.contextLinks.map(link => (
              <Button key={link.path} variant="outline" size="sm" className="text-[10px] h-6" asChild>
                <Link to={link.path}>{link.label} <ArrowRight className="h-3 w-3 ml-0.5" /></Link>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Academy() {
  const basicsCourses = COURSES.filter(c => c.tier === 'basics');
  const appliedCourses = COURSES.filter(c => c.tier === 'applied');
  const masteryCourses = COURSES.filter(c => c.tier === 'mastery');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Academy" subtitle="Structured learning path from basics to mastery" />

      {/* Progress Overview */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(tierConfig).map(([key, config]) => {
          const courses = COURSES.filter(c => c.tier === key);
          const totalLessons = courses.reduce((s, c) => s + c.lessons.length, 0);
          const TierIcon = config.icon;
          return (
            <Card key={key} className="bg-card border-border/50">
              <CardContent className="p-3 text-center">
                <TierIcon className={cn("h-5 w-5 mx-auto mb-1", config.color.split(' ')[1])} />
                <div className="text-lg font-bold">{courses.length}</div>
                <div className="text-[10px] text-muted-foreground">{config.label} Courses</div>
                <div className="text-[10px] text-muted-foreground">{totalLessons} lessons</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="basics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basics">🟢 Basics</TabsTrigger>
          <TabsTrigger value="applied">🔵 Applied</TabsTrigger>
          <TabsTrigger value="mastery">🟣 Mastery</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {basicsCourses.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </TabsContent>

        <TabsContent value="applied" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {appliedCourses.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </TabsContent>

        <TabsContent value="mastery" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {masteryCourses.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contextual Learning Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold">Contextual Learning</h4>
              <p className="text-[11px] text-muted-foreground">
                Look for the 💡 icon inside Analytics, Risk Guardian, and Strategy pages — it links to relevant lessons from the Academy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
