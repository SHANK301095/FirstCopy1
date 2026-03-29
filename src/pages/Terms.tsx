import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import mmcLogo from '@/assets/mmc-logo.png';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using MMC AI Intelligence ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.

These Terms apply to all visitors, users, and others who access or use the Service. By using the Service, you represent that you are at least 18 years old and have the legal capacity to enter into this agreement.`,
  },
  {
    title: '2. Description of Service',
    content: `MMC provides a trading intelligence platform that enables users to:

• Create and manage trading strategies
• Perform backtesting and optimization
• Analyze trading performance with advanced analytics
• Execute trades via broker integrations (Execution Bridge)
• Automate trading workflows and signal generation
• Collaborate with team members
• Access AI-powered insights and recommendations

The Service is provided "as is" and we reserve the right to modify, suspend, or discontinue any aspect of the Service at any time.`,
  },
  {
    title: '3. User Accounts',
    content: `To access certain features, you must create an account. You agree to:

• Provide accurate and complete registration information
• Maintain the security of your password and account
• Promptly update any changes to your information
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized use

We reserve the right to suspend or terminate accounts that violate these Terms or for any other reason at our discretion.`,
  },
  {
    title: '4. Subscription and Payment',
    content: `Some features require a paid subscription. By subscribing, you agree to:

• Pay all applicable fees as described at signup
• Provide valid payment information
• Authorize automatic recurring charges
• Accept that fees are non-refundable unless otherwise stated

We may change pricing with 30 days' notice. Continued use after price changes constitutes acceptance of new pricing.`,
  },
  {
    title: '5. User Content and Data',
    content: `You retain ownership of content you create using our Service, including:

• Trading strategies and configurations
• Backtesting results and analytics
• Notes, comments, and documentation

By using the Service, you grant us a license to store, process, and display your content as necessary to provide the Service. You are responsible for ensuring you have the right to use any data you upload.`,
  },
  {
    title: '6. Intellectual Property',
    content: `The Service and its original content, features, and functionality are owned by MMC AI Intelligence and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

You may not:
• Copy, modify, or distribute our software
• Reverse engineer or decompile any part of the Service
• Use our trademarks without written permission
• Create derivative works based on our Service`,
  },
  {
    title: '7. Prohibited Activities',
    content: `You agree not to:

• Use the Service for any illegal purpose
• Violate any applicable laws or regulations
• Transmit malware, viruses, or harmful code
• Attempt to gain unauthorized access to systems
• Interfere with or disrupt the Service
• Scrape or collect data without permission
• Share account credentials with others
• Use automated systems to access the Service
• Engage in market manipulation or fraud`,
  },
  {
    title: '8. Execution Bridge & Live Trading Disclaimer',
    content: `The Execution Bridge feature allows connection to third-party brokers for live trade execution. By using this feature, you acknowledge and agree:

• MMC acts solely as a technology provider and is NOT a broker, dealer, or financial advisor
• All trades are executed through your chosen third-party broker under their terms and conditions
• You are solely responsible for verifying order accuracy before execution
• MMC does not guarantee order execution, fill prices, or trade outcomes
• Technical issues, latency, or connectivity problems may affect trade execution
• You must maintain sufficient funds and margin with your broker
• Past backtest performance does NOT guarantee future live trading results
• You accept full responsibility for all trading decisions and resulting profits or losses

LIVE TRADING CARRIES SUBSTANTIAL RISK OF LOSS. Only trade with capital you can afford to lose. We strongly recommend paper trading before using real funds.`,
  },
  {
    title: '9. Disclaimer of Warranties',
    content: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

We do not warrant that:
• The Service will be uninterrupted or error-free
• Results obtained will be accurate or reliable
• Trade execution will occur without delays or errors
• Defects will be corrected
• The Service is free of viruses or harmful components

TRADING INVOLVES SUBSTANTIAL RISK. Past performance is not indicative of future results. The Service is for educational and informational purposes only and does not constitute financial advice.`,
  },
  {
    title: '10. Limitation of Liability',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, MMC SHALL NOT BE LIABLE FOR:

• Any indirect, incidental, special, consequential, or punitive damages
• Loss of profits, data, use, or goodwill
• Trading losses or investment decisions
• Losses arising from trade execution, including slippage, partial fills, or failed orders
• Damages resulting from broker connectivity issues or API failures
• Financial losses from automated trading systems or signals
• Damages arising from use of the Service

Our total liability shall not exceed the amount you paid us in the twelve months preceding the claim.`,
  },
  {
    title: '11. Indemnification',
    content: `You agree to indemnify, defend, and hold harmless MMC and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:

• Your use of the Service
• Your violation of these Terms
• Your violation of any third-party rights
• Your trading activities or investment decisions
• Losses arising from trades executed through the Execution Bridge`,
  },
  {
    title: '12. Termination',
    content: `We may terminate or suspend your account immediately, without prior notice, for:

• Violation of these Terms
• Conduct that we determine is harmful
• Requests by law enforcement
• Extended periods of inactivity
• Any other reason at our discretion

Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination will remain in effect.`,
  },
  {
    title: '13. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the State of New York, United States, without regard to its conflict of law provisions.

Any disputes arising from these Terms or the Service shall be resolved in the courts of New York County, New York.`,
  },
  {
    title: '14. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. We will notify users of material changes by:

• Posting notice on our website
• Sending email notification
• Displaying in-app notifications

Continued use of the Service after changes constitutes acceptance of the modified Terms.`,
  },
  {
    title: '15. Contact Information',
    content: `For questions about these Terms, please contact us at:

Email: legal@mmc-trading.com
Address: 123 Trading Street, New York, NY 10001
Phone: +1 (555) 123-4567`,
  },
];

const Terms = forwardRef<HTMLDivElement>(function Terms(_, ref) {
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
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Terms of Service</span>
          </h1>
          <p className="text-muted-foreground">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Introduction */}
        <Card variant="glass" className="p-6 mb-8">
          <p className="text-foreground/90 leading-relaxed">
            Welcome to MMC AI Intelligence. These Terms of Service govern your access to and use of our trading intelligence platform, including any content, functionality, and services offered. Please read these Terms carefully before using our Service.
          </p>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.title} variant="glass" className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">{section.title}</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line">{section.content}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
          <p>© {new Date().getFullYear()} MMC AI Intelligence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
});

export default Terms;
