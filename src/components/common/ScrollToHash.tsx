import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToHash = () => {
  const { hash, pathname } = useLocation();
  const lastHash = useRef('');
  const lastPathname = useRef('');

  useEffect(() => {
    // Scroll to top when pathname changes (new page navigation)
    if (pathname !== lastPathname.current) {
      lastPathname.current = pathname;
      
      // Only scroll to top if there's no hash to scroll to
      if (!hash) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (hash && hash !== '#') {
      // Ignore auth hashes from Supabase/OAuth
      if (
        hash.startsWith('#access_token') ||
        hash.startsWith('#refresh_token') ||
        hash.startsWith('#error') ||
        hash.startsWith('#type=recovery')
      ) {
        return;
      }

      lastHash.current = hash;
      const scrollToElement = () => {
        try {
          // Validate selector to prevent crashes with invalid hashes like "#123" (if IDs don't start with letter)
          // or complex auth strings that might technically be valid selectors but not intended elements
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            return true;
          }
        } catch (e) {
          // Ignore invalid selector errors
          console.warn('ScrollToHash: Invalid selector:', hash);
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
  }, [hash, pathname]);

  return null;
};

export default ScrollToHash;
