import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  </HelmetProvider>
);

describe('Admin Layout Responsiveness', () => {
  it('should handle mobile sidebar as a drawer overlay', () => {
    // Mock window.innerWidth for mobile
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<MainLayout>Test Content</MainLayout>, { wrapper });

    // We check the actual SidebarReorganized or the desktop class hiding
    // In mobile, SidebarReorganized should have lg:sticky and fixed inset-0 overlay
    const sidebar = screen.getByRole('navigation', { name: /menu principal/i });
    expect(sidebar.className).toContain('fixed');
    expect(sidebar.className).toContain('lg:sticky');

    // In mobile by default, it should be translated out of view
    expect(sidebar.className).toContain('-translate-x-full');

    // Content should not be overlapped (it's flex-1, the sidebar is fixed/absolute in mobile)
    const main = screen.getByRole('main');
    expect(main).toBeDefined();
  });
});
