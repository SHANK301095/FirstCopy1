import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Target,
  Zap,
  Shield,
  Brain,
  Layers,
  CheckCircle2,
  Cpu,
  TrendingUp,
  BarChart3,
  Bot,
  Workflow
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTitle } from '@/components/ui/PageTitle';
import mmcLogo from '@/assets/mmc-logo.png';

const missionPoints = [
  { text: 'Build strategies based on logic, data, and evidence' },
  { text: 'Rigorously test ideas before risking capital' },
  { text: 'Automate execution to remove emotional bias' },
  { text: 'Use AI to continuously analyze, refine, and improve performance' },
];

const platformFeatures = [
  {
    icon: Brain,
    title: 'Strategy Design & Experimentation',
    description: 'Create and iterate on trading strategies with powerful design tools',
  },
  {
    icon: Zap,
    title: 'High-Performance Backtesting',
    description: 'Run thousands of backtests per minute with our optimized engine',
  },
  {
    icon: Workflow,
    title: 'Automated Trading Workflows',
    description: 'Rule-based execution that removes emotion from trading',
  },
  {
    icon: Bot,
    title: 'AI-Powered Insights',
    description: 'Intelligent analysis that highlights patterns, risks, and opportunities',
  },
];

const philosophyPoints = [
  { title: 'Data beats intuition', icon: BarChart3 },
  { title: 'Systems outperform emotions', icon: Cpu },
  { title: 'Repeatability matters more than prediction', icon: TrendingUp },
];

const milestones = [
  { 
    year: '2019', 
    title: 'MMC Founded',
    description: 'Founded with the goal of bringing institutional-level trading research tools to independent traders'
  },
  { 
    year: '2020', 
    title: 'First Production Release',
    description: 'Launched with a performance-focused architecture built for serious analysis'
  },
  { 
    year: '2021', 
    title: '10,000+ Active Users',
    description: 'Crossed 10,000 active users, validating the demand for systematic trading tools'
  },
  { 
    year: '2022', 
    title: 'Collaboration Features',
    description: 'Expanded capabilities with collaboration and multi-workflow support'
  },
  { 
    year: '2023', 
    title: 'AI-Powered Intelligence',
    description: 'Introduced AI-powered intelligence, unlocking deeper insights from backtest and trade data'
  },
  { 
    year: '2024', 
    title: 'Version 3.0 Released',
    description: 'Released Version 3.0, featuring a dramatically faster engine and a fully integrated trading workflow'
  },
];

const About = forwardRef<HTMLDivElement>(function About(_, ref) {
  return (
    <div ref={ref} className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[hsl(250_80%_60%/0.1)] rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/landing">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <img src={mmcLogo} alt="MMC Logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-bold text-primary">MMC</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">About MMC</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Engineering the Future
              <br />
              <span className="text-primary">of Trading</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              MMC was created with a clear vision: to empower traders with institutional-grade 
              trading intelligence, without forcing them to rely on fragmented tools, complex 
              infrastructure, or opaque systems.
            </p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <Card variant="glass" className="p-8 md:p-10">
              <p className="text-lg md:text-xl text-foreground/90 leading-relaxed text-center">
                What began as a focused research platform has evolved into a{' '}
                <span className="text-primary font-semibold">fully engineered trading intelligence system</span>, 
                built to support everything from strategy research and deep backtesting to 
                automated execution and AI-driven analysis.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                We believe that professional-grade trading capabilities should not be limited 
                to large institutions or elite funds. MMC exists to give traders a{' '}
                <span className="text-foreground font-medium">systematic, data-driven edge</span>—helping 
                them design, validate, and execute strategies with confidence.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {missionPoints.map((point, index) => (
                <Card key={index} variant="glass" className="p-5 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{point.text}</p>
                </Card>
              ))}
            </div>
            
            <p className="text-center text-muted-foreground mt-8 max-w-2xl mx-auto">
              All while maintaining full control, transparency, and trust in your trading process.
            </p>
          </div>
        </div>
      </section>

      {/* What Makes MMC Different */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">What Makes Us Different</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                MMC is not just software
              </h2>
              <p className="text-xl text-muted-foreground">
                It is a <span className="text-primary font-semibold">trading operating system</span>.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {platformFeatures.map((feature) => (
                <Card key={feature.title} variant="glass" className="p-6 hover:border-primary/30 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <Card variant="glass" className="p-6 mt-8 text-center">
              <p className="text-lg text-foreground/90">
                The result is a <span className="text-primary font-medium">single, cohesive platform</span> where 
                traders can move seamlessly from research to execution.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Journey */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Our Journey</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Building the future,
              <span className="text-primary"> step by step</span>
            </h2>
            </div>
            
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
              
              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <div 
                    key={milestone.year} 
                    className={`relative flex items-start gap-8 ${
                      index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background -translate-x-1/2 mt-2" />
                    
                    {/* Content */}
                    <div className={`ml-16 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                      <Card variant="glass" className="p-5 inline-block text-left">
                        <Badge variant="outline" className="mb-2">{milestone.year}</Badge>
                        <h3 className="font-semibold text-lg mb-1">{milestone.title}</h3>
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      </Card>
                    </div>
                    
                    {/* Spacer for alternating layout */}
                    <div className="hidden md:block md:w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">Our Philosophy</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Markets reward discipline,
              <span className="text-primary"> consistency, and evidence</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              MMC is built on the belief that:
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {philosophyPoints.map((point) => (
                <Card key={point.title} variant="glass" className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <point.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{point.title}</h3>
                </Card>
              ))}
            </div>
            
            <Card variant="glass" className="p-6 max-w-2xl mx-auto">
              <p className="text-lg text-foreground/90">
                We are building MMC for traders who treat trading as a{' '}
                <span className="text-primary font-semibold">process</span>, not a gamble.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card variant="stat" className="relative overflow-hidden max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-[hsl(250_80%_60%/0.2)] to-primary/20" />
            <div className="relative p-8 md:p-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <img src={mmcLogo} alt="MMC Logo" className="h-12 w-12 object-contain" />
                <span className="text-3xl font-bold text-primary">MMC</span>
              </div>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                An AI-engineered trading intelligence platform — built to{' '}
                <span className="text-foreground font-medium">build, test, execute, automate, and optimize</span>{' '}
                trading systems with precision.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="default" size="lg" asChild>
                  <Link to="/signup">Start Trading Smarter</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={mmcLogo} alt="MMC Logo" className="h-6 w-6 object-contain" />
              <span className="font-bold text-primary">MMC</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MMC AI Intelligence. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});

export default About;
