import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import mmcLogo from '@/assets/mmc-logo.png';

// Build ID injected at build time via Vite define (fallback to timestamp if not set)
const BUILD_ID = import.meta.env.VITE_BUILD_ID || `dev-${Date.now()}`;

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  return (
    <footer ref={ref} className="py-12 border-t border-primary/20 bg-gradient-to-b from-background to-[hsl(230_25%_4%)] cyber-footer">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Company */}
          <div className="cyber-footer-section">
            <h3 className="font-semibold text-foreground mb-4 cyber-footer-title">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="cyber-footer-link">About Us</Link></li>
              <li><Link to="/contact" className="cyber-footer-link">Contact</Link></li>
              <li><a href="#" className="cyber-footer-link">Careers</a></li>
              <li><a href="#" className="cyber-footer-link">Blog</a></li>
            </ul>
          </div>
          
          {/* Product */}
          <div className="cyber-footer-section">
            <h3 className="font-semibold text-foreground mb-4 cyber-footer-title">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/workflow" className="cyber-footer-link">Features</Link></li>
              <li><a href="#" className="cyber-footer-link">Pricing</a></li>
              <li><a href="#" className="cyber-footer-link">What's New</a></li>
              <li><a href="#" className="cyber-footer-link">Integrations</a></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="cyber-footer-section">
            <h3 className="font-semibold text-foreground mb-4 cyber-footer-title">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/faq" className="cyber-footer-link">FAQ</Link></li>
              <li><Link to="/guide" className="cyber-footer-link">Documentation</Link></li>
              <li><Link to="/tutorials" className="cyber-footer-link">API Reference</Link></li>
              <li><a href="#" className="cyber-footer-link">Community</a></li>
            </ul>
          </div>
          
          {/* Legal */}
          <div className="cyber-footer-section">
            <h3 className="font-semibold text-foreground mb-4 cyber-footer-title">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="cyber-footer-link">Privacy Policy</Link></li>
              <li><Link to="/terms" className="cyber-footer-link">Terms of Service</Link></li>
              <li><a href="#" className="cyber-footer-link">Cookie Policy</a></li>
              <li><a href="#" className="cyber-footer-link">Security</a></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-6 pt-8 border-t border-primary/10">
          {/* Tagline */}
          <p className="text-lg md:text-xl font-semibold text-primary/90 tracking-wide">
            Build your edge. Own your process.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
            <div className="flex items-center gap-2 cyber-footer-logo">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
                <img src={mmcLogo} alt="MMC Logo" className="h-6 w-6 object-contain relative" />
              </div>
              <span className="font-bold text-primary cyber-brand-glow">MMC</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} MMC AI Intelligence. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/50 font-mono">
              Build: {BUILD_ID.slice(0, 12)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Cyber decorative line */}
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </footer>
  );
});

Footer.displayName = 'Footer';
