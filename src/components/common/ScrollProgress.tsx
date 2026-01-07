import { useState, useEffect } from 'react';

const ScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const calculateScrollProgress = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement?.scrollHeight;
      const scrollTop = window.scrollY;
      const trackLength = documentHeight - windowHeight;
      const progress = (scrollTop / trackLength) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    const handleScroll = () => {
      requestAnimationFrame(calculateScrollProgress);
    };

    window.addEventListener('scroll', handleScroll);
    calculateScrollProgress();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed left-0 top-20 z-[99] h-1 w-full bg-muted">
      <div
        className="h-full bg-accent transition-all duration-250 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};

export default ScrollProgress;
