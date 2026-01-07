import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/AppIcon';



const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const navigationItems = [
    { label: 'How It Works', anchor: '#solution', description: 'AI coaching demo' },
    { label: 'Pricing', anchor: '#pricing', description: 'Trial options' },
    { label: 'Blog', href: '/blog', description: 'Interview insights and career tips' },
    { label: 'Contact', href: '/contact', description: 'Get in touch' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);

      const sections = navigationItems
        .filter(item => item.anchor)
        .map(item => item.anchor!.substring(1));
      const scrollPosition = window.scrollY + 100;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetBottom = offsetTop + element.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
            setActiveSection(`#${sectionId}`);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (anchor: string) => {
    const element = document.getElementById(anchor.substring(1));
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth',
      });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-[100] w-full transition-all duration-250 ease-out ${
        isScrolled ? 'bg-card shadow-card' : 'bg-card'
      }`}
    >
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between pr-8 pl-8">
        <Link
          to="/"
          className="flex items-center space-x-3 transition-opacity duration-250 ease-out hover:opacity-80"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 4L8 8V14C8 19.55 11.84 24.74 16 26C20.16 24.74 24 19.55 24 14V8L16 4Z"
                fill="currentColor"
                className="text-primary-foreground"
              />
              <path
                d="M14 18L11 15L12.41 13.59L14 15.17L19.59 9.58L21 11L14 18Z"
                fill="currentColor"
                className="text-accent"
              />
            </svg>
          </div>
          <span className="font-headline text-2xl font-semibold text-primary">
            Interview Copilot
          </span>
        </Link>

        <div className="hidden items-center space-x-8 md:flex">
          {navigationItems.map((item) => (
            item.href ? (
              <Link
                key={item.href}
                to={item.href}
                className="font-body text-base font-medium transition-colors duration-250 ease-out hover:text-primary text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.anchor}
                onClick={() => handleNavClick(item.anchor!)}
                className={`font-body text-base font-medium transition-colors duration-250 ease-out hover:text-primary ${
                  activeSection === item.anchor ? 'text-primary' : 'text-foreground'
                }`}
                aria-label={item.description}
              >
                {item.label}
              </button>
            )
          ))}
          <Link
            to="/login"
            className="font-cta rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-cta transition-all duration-250 ease-out hover:bg-accent/90 hover:shadow-lg"
          >
            Start Free Trial
          </Link>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center justify-center md:hidden"
          aria-label="Toggle mobile menu"
        >
          <Icon
            name={isMobileMenuOpen ? 'XMarkIcon' : 'Bars3Icon'}
            size={28}
            className="text-primary"
          />
        </button>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-[200] bg-card md:hidden">
          <div className="flex h-full flex-col space-y-6 p-8">
            {navigationItems.map((item) => (
              item.href ? (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-body text-left text-lg font-medium transition-colors duration-250 ease-out hover:text-primary text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.anchor}
                  onClick={() => handleNavClick(item.anchor!)}
                  className={`font-body text-left text-lg font-medium transition-colors duration-250 ease-out hover:text-primary ${
                    activeSection === item.anchor ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              )
            ))}
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="font-cta mt-4 rounded-lg bg-accent px-6 py-4 text-lg font-semibold text-accent-foreground shadow-cta transition-all duration-250 ease-out hover:bg-accent/90 text-center"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
