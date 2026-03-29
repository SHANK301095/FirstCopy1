import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import mmcLogo from '@/assets/mmc-logo.png';

const ADDRESS = "308 Kusum Vihar, Jagatpura, Jaipur, Rajasthan 302017, India";

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    value: 'Sha8955591038@gmail.com',
    description: 'Send us an email anytime',
  },
  {
    icon: Phone,
    title: 'Phone',
    value: '+91-8955591038',
    description: 'Available Mon-Sat, 10am-7pm IST',
  },
  {
    icon: MapPin,
    title: 'Office',
    value: '308 Kusum Vihar, Jagatpura',
    description: 'Jaipur, Rajasthan, India',
  },
  {
    icon: Clock,
    title: 'Business Hours',
    value: 'Monday - Saturday',
    description: '10:00 AM - 7:00 PM IST',
  },
];

const Contact = forwardRef<HTMLDivElement>(function Contact(_, ref) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours.",
    });
    
    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <div ref={ref} className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/60 backdrop-blur-xl">
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

      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Contact Us</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about MMC? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <Card variant="glass" className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Send a Message</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="How can we help?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more about your inquiry..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>
              
              <Button type="submit" variant="default" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
            
            <div className="grid gap-4">
              {contactInfo.map((info) => (
                <Card key={info.title} variant="glass" className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <info.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{info.title}</h3>
                      <p className="text-foreground/90 font-medium">{info.value}</p>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* FAQ Link */}
            <Card variant="glass" className="p-6 mt-6">
              <h3 className="font-semibold mb-2">Looking for quick answers?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Check out our FAQ section for commonly asked questions.
              </p>
              <Button variant="outline" asChild>
                <Link to="/faq">Visit FAQ</Link>
              </Button>
            </Card>
          </div>
        </div>

        {/* Location Section - No external embed for self-contained app */}
        <div className="mt-16 max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-center">Find Us</h2>
          <Card variant="glass" className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <MapPin className="h-12 w-12 text-primary" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Our Office Location</h3>
                <p className="text-muted-foreground">{ADDRESS}</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(ADDRESS);
                    toast({ title: 'Copied!', description: 'Address copied to clipboard' });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Maps
                </Button>
              </div>
            </div>
            <Alert className="mt-4">
              <AlertDescription className="text-sm text-center">
                Maps are not embedded to keep the app self-contained and reliable offline.
              </AlertDescription>
            </Alert>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MMC Trading Intelligence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
});

export default Contact;
