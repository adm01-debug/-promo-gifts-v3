import { useEffect } from 'react';

export function ThemeDiagnostic() {
  useEffect(() => {
    const check = () => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      const bg = styles.getPropertyValue('--background').trim();
      const primary = styles.getPropertyValue('--primary').trim();
      
      console.log('[ThemeDiagnostic]', {
        classList: Array.from(root.classList),
        '--background': bg,
        '--primary': primary,
        actualBgColor: styles.backgroundColor,
        localStorage: localStorage.getItem('gifts-store-theme-config'),
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth
      });
    };
    
    check();
    const t = setInterval(check, 2000);
    return () => clearInterval(t);
  }, []);
  
  return null;
}
