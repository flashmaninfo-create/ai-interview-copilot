import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/AppIcon';
import { useAuth } from '../../contexts/AuthContext';



const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navigationItems = [
    { label: 'How It Works', href: '/#how-it-works', description: 'AI coaching demo' },
    { label: 'Pricing', href: '/#pricing', description: 'Trial options' },
    { label: 'Contact', href: '/#contact', description: 'Get in touch' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);

      const sections = navigationItems
        .filter(item => item.href.includes('#'))
        .map(item => item.href.split('#')[1]);
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
          <img
            src="/assets/images/XTROONE.svg"
            alt="Xtroone"
            className="w-32"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center space-x-8 md:flex">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`font-body text-base font-medium transition-colors duration-250 ease-out hover:text-primary ${
                activeSection === item.href.split('/').pop() ? 'text-primary' : 'text-foreground'
              }`}
              aria-label={item.description}
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className="font-body text-base font-medium transition-colors duration-250 ease-out hover:text-primary text-foreground"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="font-body text-base font-medium transition-colors duration-250 ease-out hover:text-primary text-foreground"
              >
                Logout
              </button>
            </>
          )}
          {!isAuthenticated && (
            <Link
              to="/login"
              className="font-cta rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-cta transition-all duration-250 ease-out hover:bg-accent/90 hover:shadow-lg"
            >
              Start Free Trial
            </Link>
          )}
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

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-[200] bg-card md:hidden">
          <div className="flex h-full flex-col space-y-6 p-8">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`font-body text-left text-lg font-medium transition-colors duration-250 ease-out hover:text-primary ${
                  activeSection === item.href.split('/').pop() ? 'text-primary' : 'text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-body text-left text-lg font-medium transition-colors duration-250 ease-out hover:text-primary text-foreground"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="font-body text-left text-lg font-medium transition-colors duration-250 ease-out hover:text-primary text-foreground"
                >
                  Logout
                </button>
              </>
            )}
            {!isAuthenticated && (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-cta mt-4 rounded-lg bg-accent px-6 py-4 text-lg font-semibold text-accent-foreground shadow-cta transition-all duration-250 ease-out hover:bg-accent/90 text-center"
              >
                Start Free Trial
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
