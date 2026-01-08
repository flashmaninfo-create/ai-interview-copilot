import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToHash = () => {
  const { hash } = useLocation();
  const lastHash = useRef('');

  useEffect(() => {
    if (hash) {
      lastHash.current = hash;
      const scrollToElement = () => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          return true;
        }
        return false;
      };

      // Attempt immediate scroll
      if (!scrollToElement()) {
        // Retry logic: check every 100ms for up to 2 seconds
        let attempts = 0;
        const interval = setInterval(() => {
          if (scrollToElement() || attempts > 20) {
            clearInterval(interval);
          }
          attempts++;
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, [hash]);

  return null;
};

export default ScrollToHash;
