import { Link } from 'react-router-dom';
import { Sparkles, Github, Twitter, Linkedin } from 'lucide-react';

import { cn } from '../../lib/utils';

interface FooterProps {
  variant?: 'light' | 'dark';
}

export function Footer({ variant = 'dark' }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const isLight = variant === 'light';

  return (
    <footer className={cn("pt-16 pb-8 border-t", isLight ? "bg-slate-50 border-slate-200" : "bg-[#0F172A] border-slate-800")}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-5 h-5 fill-white/20" />
              </div>
              <span className={cn("font-bold text-lg", isLight ? "text-slate-900" : "text-white")}>Xtroone</span>
            </Link>
            <p className={cn("text-sm leading-relaxed mb-6", isLight ? "text-slate-600" : "text-slate-400")}>
              Ace your next interview with real-time AI assistance.
              Privacy-focused, secure, and undetectable.
            </p>
            <div className="flex gap-4">
              <a href="#" className={cn("transition-colors", isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-white")}>
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className={cn("transition-colors", isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-white")}>
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className={cn("transition-colors", isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-white")}>
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className={cn("font-semibold mb-6", isLight ? "text-slate-900" : "text-white")}>Product</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/features" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Features</Link></li>
              <li><Link to="/pricing" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Pricing</Link></li>
              <li><Link to="/how-it-works" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>How it Works</Link></li>
              <li><Link to="/extension" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Chrome Extension</Link></li>
            </ul>
          </div>

          <div>
            <h4 className={cn("font-semibold mb-6", isLight ? "text-slate-900" : "text-white")}>Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>About Us</Link></li>
              <li><Link to="/blog" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Blog</Link></li>
              <li><Link to="/careers" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Careers</Link></li>
              <li><Link to="/#contact" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className={cn("font-semibold mb-6", isLight ? "text-slate-900" : "text-white")}>Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/privacy" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Privacy Policy</Link></li>
              <li><Link to="/terms" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Terms of Service</Link></li>
              <li><Link to="/cookie" className={cn("transition-colors", isLight ? "text-slate-600 hover:text-primary" : "text-slate-400 hover:text-primary")}>Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className={cn("pt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t", isLight ? "border-slate-200" : "border-white/5")}>
          <p className="text-slate-500 text-sm">
            © {currentYear} Xtroone. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Operational
          </div>
        </div>
      </div>
    </footer>
  );
}

