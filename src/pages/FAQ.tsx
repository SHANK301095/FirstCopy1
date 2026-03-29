import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import mmcLogo from '@/assets/mmc-logo.png';

const faqCategories = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'What is MMC AI Intelligence?',
        answer: 'MMC AI Intelligence is an AI-powered trading intelligence platform designed to help traders build, test, execute, automate, and optimize trading strategies. It provides advanced backtesting, analytics, portfolio management, execution bridge, and collaboration features for individual traders and teams.',
      },
      {
        question: 'How do I create an account?',
        answer: 'Click the "Get Started" or "Sign Up" button on our landing page. Enter your email address and create a password. You can also sign up using Google authentication for faster access.',
      },
      {
        question: 'Is there a free trial available?',
        answer: 'Yes! We offer a free tier with 5 backtests per day and 1 strategy slot. This allows you to explore the platform and its capabilities before committing to a paid plan.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise plans. All payments are processed securely.',
      },
    ],
  },
  {
    category: 'Backtesting & Strategies',
    questions: [
      {
        question: 'What assets can I backtest?',
        answer: 'MMC supports a wide range of assets including stocks, forex pairs, cryptocurrencies, options, futures, and custom instruments. You can import your own historical data in CSV format.',
      },
      {
        question: 'How accurate are the backtesting results?',
        answer: 'Our backtesting engine achieves 99.99% accuracy by using tick-level data simulation, accounting for slippage, commissions, and market impact. We also provide Monte Carlo simulations to stress-test results.',
      },
      {
        question: 'Can I import my existing strategies?',
        answer: 'Yes, you can import strategies in multiple formats including Python scripts, MQL files, and our proprietary format. Our team can also help with custom integrations for enterprise clients.',
      },
      {
        question: 'What is Walk-Forward Analysis?',
        answer: 'Walk-Forward Analysis is an advanced testing method that divides your data into segments, optimizing on one segment and testing on the next. This helps validate strategy robustness and avoid overfitting.',
      },
    ],
  },
  {
    category: 'AI Features',
    questions: [
      {
        question: 'How does the AI-powered analysis work?',
        answer: 'Our AI engine uses GPT-5 technology to analyze your strategies, detect anomalies, suggest optimizations, and provide predictive analytics. It learns from your trading patterns to offer personalized insights.',
      },
      {
        question: 'Can AI help me create new strategies?',
        answer: 'Yes! The AI can suggest strategy templates based on your goals, help optimize parameters, and identify market patterns you might have missed. It serves as an intelligent assistant throughout your trading workflow.',
      },
      {
        question: 'Is my data used to train the AI?',
        answer: 'No, your trading data is never used to train our AI models. Your strategies and backtesting results remain completely private and are only used to provide personalized insights to you.',
      },
    ],
  },
  {
    category: 'Collaboration & Teams',
    questions: [
      {
        question: 'How does team collaboration work?',
        answer: 'Team plans allow multiple users to share workspaces, strategies, and results. You can see real-time presence, collaborate on strategies, and manage permissions for different team members.',
      },
      {
        question: 'Can I control what team members can access?',
        answer: 'Yes, we offer granular access controls. You can set permissions at the workspace, project, and strategy level. Roles include Owner, Admin, Editor, and Viewer.',
      },
      {
        question: 'Is there an activity log?',
        answer: 'Yes, all changes are tracked in an activity feed. You can see who made changes, when they were made, and review version history for strategies.',
      },
    ],
  },
  {
    category: 'Security & Privacy',
    questions: [
      {
        question: 'How is my data protected?',
        answer: 'We use end-to-end encryption for all data in transit and at rest. Our infrastructure is SOC 2 Type II compliant, and we undergo regular security audits and penetration testing.',
      },
      {
        question: 'Can I export my data?',
        answer: 'Yes, you can export all your data including strategies, backtesting results, and analytics at any time. We support multiple formats including CSV, JSON, and PDF reports.',
      },
      {
        question: 'Do you share my data with third parties?',
        answer: 'No, we do not sell or share your personal data or trading information with third parties. Please review our Privacy Policy for complete details on data handling.',
      },
    ],
  },
  {
    category: 'Billing & Subscriptions',
    questions: [
      {
        question: 'How do I upgrade my plan?',
        answer: 'Go to Settings > Subscription to view and upgrade your plan. Changes take effect immediately, and you will be charged a prorated amount for the remainder of your billing cycle.',
      },
      {
        question: 'Can I cancel my subscription?',
        answer: 'Yes, you can cancel at any time from your account settings. Your access will continue until the end of your current billing period. We do not offer prorated refunds for partial months.',
      },
      {
        question: 'Are there discounts for annual billing?',
        answer: 'Yes, we offer a 20% discount when you choose annual billing. This is applied automatically when you select the yearly option during checkout.',
      },
    ],
  },
];

const FAQ = forwardRef<HTMLDivElement>(function FAQ(_, ref) {
  return (
    <div ref={ref} className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={mmcLogo} alt="MMC Logo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold text-primary">MMC</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/landing">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Frequently Asked Questions</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about MMC AI Intelligence. Can't find what you're looking for? Contact our support team.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqCategories.map((category) => (
            <Card key={category.category} variant="glass" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">{category.category}</h2>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq, index) => (
                  <AccordionItem key={index} value={`${category.category}-${index}`}>
                    <AccordionTrigger className="text-left hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          ))}
        </div>

        {/* Contact CTA */}
        <Card variant="glass" className="p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Our support team is here to help you with any questions you might have.
          </p>
          <Button variant="default" asChild>
            <Link to="/contact">Contact Support</Link>
          </Button>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
          </div>
          <p>© {new Date().getFullYear()} MMC Trading Intelligence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
});

export default FAQ;
