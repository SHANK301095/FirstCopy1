import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import mmcLogo from '@/assets/mmc-logo.png';

const sections = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include:
    
• Personal Information: Name, email address, phone number, and billing information
• Account Data: Username, password, and profile preferences
• Trading Data: Strategies, backtesting results, and analytics data you create
• Usage Information: How you interact with our platform, features used, and performance metrics
• Device Information: Browser type, operating system, and IP address`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:

• Provide, maintain, and improve our services
• Process transactions and send related information
• Send technical notices, updates, and security alerts
• Respond to your comments, questions, and customer service requests
• Monitor and analyze trends, usage, and activities
• Detect, investigate, and prevent fraudulent transactions and abuse
• Personalize and improve your experience`,
  },
  {
    title: '3. Information Sharing',
    content: `We do not sell, trade, or rent your personal information to third parties. We may share information in the following circumstances:

• With service providers who assist in our operations
• To comply with legal obligations or court orders
• To protect our rights, privacy, safety, or property
• In connection with a merger, acquisition, or sale of assets
• With your consent or at your direction`,
  },
  {
    title: '4. Data Security',
    content: `We implement industry-standard security measures to protect your data:

• End-to-end encryption for data in transit and at rest
• Regular security audits and penetration testing
• SOC 2 Type II compliance
• Multi-factor authentication options
• Secure data centers with 24/7 monitoring

While we strive to protect your information, no method of transmission over the Internet is 100% secure.`,
  },
  {
    title: '5. Data Retention',
    content: `We retain your personal information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to:

• Comply with our legal obligations
• Resolve disputes
• Enforce our agreements

You may request deletion of your account and associated data at any time.`,
  },
  {
    title: '6. Your Rights',
    content: `Depending on your location, you may have the following rights:

• Access: Request a copy of your personal data
• Correction: Request correction of inaccurate data
• Deletion: Request deletion of your data
• Portability: Request transfer of your data
• Objection: Object to certain processing activities
• Restriction: Request restriction of processing

To exercise these rights, please contact us at privacy@mmc-trading.com.`,
  },
  {
    title: '7. Cookies and Tracking',
    content: `We use cookies and similar technologies to:

• Keep you logged in
• Remember your preferences
• Analyze platform usage
• Improve our services

You can control cookies through your browser settings. Disabling cookies may affect platform functionality.`,
  },
  {
    title: '8. International Transfers',
    content: `Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with applicable laws.`,
  },
  {
    title: '9. Children\'s Privacy',
    content: `Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected such information, we will promptly delete it.`,
  },
  {
    title: '10. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '11. Contact Us',
    content: `If you have questions about this Privacy Policy, please contact us at:

Email: privacy@mmc-trading.com
Address: 123 Trading Street, New York, NY 10001
Phone: +1 (555) 123-4567`,
  },
];

const PrivacyPolicy = forwardRef<HTMLDivElement>(function PrivacyPolicy(_, ref) {
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
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Introduction */}
        <Card className="p-6 mb-8">
          <p className="text-muted-foreground leading-relaxed">
            At MMC AI Intelligence ("MMC", "we", "us", or "our"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our trading intelligence platform and related services.
          </p>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.title} className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
          <p>© {new Date().getFullYear()} MMC AI Intelligence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
});

export default PrivacyPolicy;
