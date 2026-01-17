import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/ui/AppIcon';

const Footer = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentYear, setCurrentYear] = useState(2026);

  useEffect(() => {
    setIsHydrated(true);
    setCurrentYear(new Date().getFullYear());
  }, []);

  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'How It Works', href: '#how-it-works' }
    ],
    company: [
      { label: 'About Us', href: '/about-us' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '#faq' }
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Responsible Use', href: '/responsible-ai-use' }
    ]
  };

  const socialLinks = [
    { name: 'Instagram', icon: 'CameraIcon', href: 'https://instagram.com' },
    { name: 'LinkedIn', icon: 'BuildingOfficeIcon', href: 'https://linkedin.com' },
    { name: 'YouTube', icon: 'PlayCircleIcon', href: 'https://youtube.com' }
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col items-center text-center gap-10 mb-10">
          {/* Brand & Social Section */}
          <div className="flex flex-col items-center max-w-4xl">
            <div className="flex items-center space-x-3 mb-6">
              <img
                src="/assets/images/XTROONE.svg"
                alt="Xtroone"
                className="w-32 "
              />
            </div>
            <p className="text-primary-foreground/80 mb-6 text-center">
              Real-time AI assistance for live interviews. Privacy-first, user-controlled, and designed for professional preparation.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-accent transition-colors duration-250 flex items-center justify-center"
                  aria-label={social.name}
                >
                  <Icon name={social.icon as any} size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Links Section */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
              {footerLinks.product.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-primary-foreground/80 hover:text-accent transition-colors duration-250 font-medium"
                  >
                    {link.label}
                  </a>
              ))}
              {footerLinks.company.map((link) => (
                <Link
                    key={link.label}
                    to={link.href}
                    className="text-primary-foreground/80 hover:text-accent transition-colors duration-250 font-medium"
                  >
                    {link.label}
                  </Link>
              ))}
              {footerLinks.legal.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="text-primary-foreground/80 hover:text-accent transition-colors duration-250 font-medium"
                  >
                    {link.label}
                  </Link>
              ))}
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-primary-foreground/70 text-sm">
              {isHydrated ? (
                <>© {currentYear} Xtroone. All rights reserved.</>
              ) : (
                <>© 2026 Xtroone. All rights reserved.</>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Icon name="ShieldCheckIcon" size={16} variant="solid" />
                <span className="text-primary-foreground/70">Privacy-First</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="LockClosedIcon" size={16} variant="solid" />
                <span className="text-primary-foreground/70">No Data Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="HandRaisedIcon" size={16} />
                <span className="text-primary-foreground/70">User Controlled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
