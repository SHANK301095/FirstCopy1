/**
 * Interactive Tutorials - Phase 9
 * Step-by-step learning with progress tracking
 */

import { useState } from 'react';
import { BookOpen, Play, Check, Lock, Clock, Trophy, ChevronRight, Video, FileText, Code, Zap, Target, BarChart2, Shield, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/ui/PageTitle';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  type: 'video' | 'interactive' | 'quiz' | 'practice';
  completed: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  level: 'beginner' | 'intermediate' | 'advanced';
  lessons: Lesson[];
  unlocked: boolean;
  category: string;
}

const courses: Course[] = [
  {
    id: 'getting_started',
    title: 'Getting Started',
    description: 'Learn the basics of backtesting and the platform interface',
    icon: BookOpen,
    level: 'beginner',
    category: 'Fundamentals',
    unlocked: true,
    lessons: [
      { id: 'gs_1', title: 'Welcome to MMC', description: 'Platform overview and navigation', duration: 5, type: 'video', completed: true },
      { id: 'gs_2', title: 'Your First Backtest', description: 'Run your first strategy backtest', duration: 10, type: 'interactive', completed: true },
      { id: 'gs_3', title: 'Understanding Results', description: 'Reading and interpreting backtest metrics', duration: 8, type: 'video', completed: false },
      { id: 'gs_4', title: 'Knowledge Check', description: 'Test your understanding', duration: 5, type: 'quiz', completed: false },
    ],
  },
  {
    id: 'data_management',
    title: 'Data Management',
    description: 'Import, validate, and manage your market data',
    icon: Layers,
    level: 'beginner',
    category: 'Fundamentals',
    unlocked: true,
    lessons: [
      { id: 'dm_1', title: 'Importing Data', description: 'CSV, MT4, MT5, and TradingView formats', duration: 8, type: 'video', completed: false },
      { id: 'dm_2', title: 'Data Quality', description: 'Detecting and fixing data issues', duration: 10, type: 'interactive', completed: false },
      { id: 'dm_3', title: 'Multi-Timeframe Data', description: 'Working with different timeframes', duration: 7, type: 'video', completed: false },
      { id: 'dm_4', title: 'Practice: Import Your Data', description: 'Hands-on data import exercise', duration: 15, type: 'practice', completed: false },
    ],
  },
  {
    id: 'strategy_basics',
    title: 'Strategy Development',
    description: 'Create and configure trading strategies',
    icon: Code,
    level: 'intermediate',
    category: 'Strategy',
    unlocked: true,
    lessons: [
      { id: 'sb_1', title: 'Strategy Parameters', description: 'Understanding strategy inputs', duration: 10, type: 'video', completed: false },
      { id: 'sb_2', title: 'Entry & Exit Rules', description: 'Defining trade conditions', duration: 12, type: 'interactive', completed: false },
      { id: 'sb_3', title: 'Risk Management', description: 'Stop loss and take profit logic', duration: 10, type: 'video', completed: false },
      { id: 'sb_4', title: 'Build a Simple EA', description: 'Create your own strategy', duration: 20, type: 'practice', completed: false },
    ],
  },
  {
    id: 'optimization',
    title: 'Strategy Optimization',
    description: 'Find optimal parameters for your strategies',
    icon: Target,
    level: 'intermediate',
    category: 'Strategy',
    unlocked: false,
    lessons: [
      { id: 'opt_1', title: 'Grid Optimization', description: 'Systematic parameter search', duration: 10, type: 'video', completed: false },
      { id: 'opt_2', title: 'Avoiding Overfitting', description: 'Robustness and out-of-sample testing', duration: 12, type: 'video', completed: false },
      { id: 'opt_3', title: 'Walk-Forward Analysis', description: 'Rolling window optimization', duration: 15, type: 'interactive', completed: false },
      { id: 'opt_4', title: 'Monte Carlo Validation', description: 'Statistical robustness testing', duration: 10, type: 'video', completed: false },
    ],
  },
  {
    id: 'analytics_deep',
    title: 'Advanced Analytics',
    description: 'Deep dive into performance analysis',
    icon: BarChart2,
    level: 'advanced',
    category: 'Analysis',
    unlocked: false,
    lessons: [
      { id: 'ad_1', title: 'Equity Curve Analysis', description: 'Understanding drawdowns and recovery', duration: 12, type: 'video', completed: false },
      { id: 'ad_2', title: 'Risk-Adjusted Returns', description: 'Sharpe, Sortino, and Calmar ratios', duration: 10, type: 'video', completed: false },
      { id: 'ad_3', title: 'Trade Distribution', description: 'Analyzing winning and losing trades', duration: 8, type: 'interactive', completed: false },
      { id: 'ad_4', title: 'Performance Attribution', description: 'Understanding profit sources', duration: 12, type: 'video', completed: false },
    ],
  },
  {
    id: 'risk_management',
    title: 'Risk Management',
    description: 'Protect your capital with proper risk controls',
    icon: Shield,
    level: 'advanced',
    category: 'Risk',
    unlocked: false,
    lessons: [
      { id: 'rm_1', title: 'Position Sizing', description: 'Kelly criterion and optimal-f', duration: 12, type: 'video', completed: false },
      { id: 'rm_2', title: 'Value at Risk (VaR)', description: 'Measuring potential losses', duration: 10, type: 'video', completed: false },
      { id: 'rm_3', title: 'Stress Testing', description: 'Simulate extreme market conditions', duration: 15, type: 'interactive', completed: false },
      { id: 'rm_4', title: 'Portfolio Correlation', description: 'Diversification and risk reduction', duration: 10, type: 'video', completed: false },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio Construction',
    description: 'Build and manage multi-strategy portfolios',
    icon: Layers,
    level: 'advanced',
    category: 'Portfolio',
    unlocked: false,
    lessons: [
      { id: 'pf_1', title: 'Strategy Correlation', description: 'Finding uncorrelated strategies', duration: 10, type: 'video', completed: false },
      { id: 'pf_2', title: 'Capital Allocation', description: 'Optimal weight distribution', duration: 12, type: 'video', completed: false },
      { id: 'pf_3', title: 'Rebalancing Strategies', description: 'When and how to rebalance', duration: 8, type: 'interactive', completed: false },
      { id: 'pf_4', title: 'Build Your Portfolio', description: 'Create a diversified portfolio', duration: 20, type: 'practice', completed: false },
    ],
  },
];

const levelColors = {
  beginner: 'bg-green-500/10 text-green-500',
  intermediate: 'bg-yellow-500/10 text-yellow-500',
  advanced: 'bg-red-500/10 text-red-500',
};

const typeIcons = {
  video: Video,
  interactive: Zap,
  quiz: FileText,
  practice: Code,
};

export default function Tutorials() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = ['all', ...new Set(courses.map(c => c.category))];
  
  const filteredCourses = selectedCategory === 'all' 
    ? courses 
    : courses.filter(c => c.category === selectedCategory);
  
  const totalLessons = courses.reduce((sum, c) => sum + c.lessons.length, 0);
  const completedLessons = courses.reduce((sum, c) => sum + c.lessons.filter(l => l.completed).length, 0);
  const overallProgress = (completedLessons / totalLessons) * 100;
  
  if (selectedCourse) {
    const courseProgress = (selectedCourse.lessons.filter(l => l.completed).length / selectedCourse.lessons.length) * 100;
    
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Course Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedCourse(null)}>
            ← Back to Courses
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <selectedCourse.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{selectedCourse.title}</CardTitle>
                  <Badge className={levelColors[selectedCourse.level]}>
                    {selectedCourse.level}
                  </Badge>
                </div>
                <CardDescription>{selectedCourse.description}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{courseProgress.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
            <Progress value={courseProgress} className="h-2 mt-4" />
          </CardHeader>
        </Card>
        
        {/* Lessons List */}
        <div className="space-y-3">
          {selectedCourse.lessons.map((lesson, index) => {
            const TypeIcon = typeIcons[lesson.type];
            const isLocked = index > 0 && !selectedCourse.lessons[index - 1].completed && !lesson.completed;
            
            return (
              <Card 
                key={lesson.id}
                className={cn(
                  'transition-all cursor-pointer',
                  isLocked ? 'opacity-60' : 'hover:border-primary/50',
                  lesson.completed && 'border-profit/30 bg-profit/5'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      lesson.completed ? 'bg-profit/20 text-profit' : 'bg-muted text-muted-foreground'
                    )}>
                      {lesson.completed ? (
                        <Check className="h-5 w-5" />
                      ) : isLocked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <span className="font-bold">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-sm text-muted-foreground">{lesson.description}</div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {lesson.type}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {lesson.duration}m
                      </div>
                      {!isLocked && !lesson.completed && (
                        <Button size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {lesson.completed && (
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle 
          title="Interactive Tutorials" 
          subtitle="Master backtesting with step-by-step lessons"
        />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold">{overallProgress.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">{completedLessons}/{totalLessons} lessons</div>
          </div>
          <Trophy className="h-8 w-8 text-yellow-500" />
        </div>
      </div>
      
      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground ml-auto">{completedLessons} of {totalLessons} lessons completed</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>
      
      {/* Category Filter */}
      <div className="flex gap-2">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? 'All Courses' : cat}
          </Button>
        ))}
      </div>
      
      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map(course => {
          const progress = (course.lessons.filter(l => l.completed).length / course.lessons.length) * 100;
          const totalDuration = course.lessons.reduce((sum, l) => sum + l.duration, 0);
          
          return (
            <Card 
              key={course.id}
              className={cn(
                'cursor-pointer transition-all',
                course.unlocked 
                  ? 'hover:border-primary/50 hover:shadow-lg' 
                  : 'opacity-60'
              )}
              onClick={() => course.unlocked && setSelectedCourse(course)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    course.unlocked ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <course.icon className={cn(
                      'h-6 w-6',
                      course.unlocked ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {course.title}
                      {!course.unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </CardTitle>
                    <Badge className={cn('text-xs', levelColors[course.level])}>
                      {course.level}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{course.description}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{course.lessons.length} lessons</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {totalDuration}m
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
                
                {course.unlocked && (
                  <Button className="w-full" variant={progress > 0 ? 'outline' : 'default'}>
                    {progress === 0 ? 'Start Course' : progress === 100 ? 'Review' : 'Continue'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
