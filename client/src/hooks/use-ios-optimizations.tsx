
import { useEffect } from 'react';

export function useMobileOptimizations() {
  useEffect(() => {
    // Detect mobile platforms
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(navigator.userAgent);
    
    if (isMobile) {
      // Prevent elastic scrolling on body
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      
      // Create scrollable container
      const scrollContainer = document.createElement('div');
      scrollContainer.id = 'ios-scroll-container';
      scrollContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      `;
      
      // Move all body content to scroll container
      const bodyContent = Array.from(document.body.children);
      bodyContent.forEach(child => {
        if (child.id !== 'ios-scroll-container') {
          scrollContainer.appendChild(child);
        }
      });
      
      document.body.appendChild(scrollContainer);
      
      // Prevent viewport changes on keyboard show/hide
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }
      
      // Android-specific keyboard handling
      if (isAndroid) {
        const handleResize = () => {
          // Handle Android keyboard appearance
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call
        
        // Android back button handling
        const handlePopState = (e: PopStateEvent) => {
          // Prevent default Android back behavior if needed
          if (document.activeElement?.tagName === 'INPUT' || 
              document.activeElement?.tagName === 'TEXTAREA') {
            document.activeElement.blur();
            e.preventDefault();
          }
        };
        
        window.addEventListener('popstate', handlePopState);
      }
      
      // Handle orientation changes (both iOS and Android)
      const handleOrientationChange = () => {
        setTimeout(() => {
          window.scrollTo(0, 0);
          // Recalculate viewport height for Android
          if (isAndroid) {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
          }
        }, 100);
      };
      
      window.addEventListener('orientationchange', handleOrientationChange);
      
      return () => {
        window.removeEventListener('orientationchange', handleOrientationChange);
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.overflow = '';
        
        const container = document.getElementById('ios-scroll-container');
        if (container) {
          const content = Array.from(container.children);
          content.forEach(child => document.body.appendChild(child));
          container.remove();
        }
      };
    }
  }, []);
  
  // Prevent zoom on double tap
  useEffect(() => {
    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    document.addEventListener('touchend', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchend', preventZoom);
    };
  }, []);
}
