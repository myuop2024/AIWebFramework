
import { useEffect } from 'react';

export function useAndroidOptimizations() {
  useEffect(() => {
    // Detect Android
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isAndroid) {
      // Handle Android viewport height issues
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      
      // Handle Android keyboard behavior
      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          setTimeout(() => {
            target.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 300);
        }
      };
      
      const handleFocusOut = () => {
        setTimeout(() => {
          setViewportHeight();
          window.scrollTo(0, 0);
        }, 300);
      };
      
      document.addEventListener('focusin', handleFocusIn);
      document.addEventListener('focusout', handleFocusOut);
      
      // Android-specific pull-to-refresh prevention
      let startY = 0;
      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0].clientY;
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        const currentY = e.touches[0].clientY;
        if (startY < currentY && window.scrollY === 0) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        window.removeEventListener('resize', setViewportHeight);
        document.removeEventListener('focusin', handleFocusIn);
        document.removeEventListener('focusout', handleFocusOut);
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, []);
}
