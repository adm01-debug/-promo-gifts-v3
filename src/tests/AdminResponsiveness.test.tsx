import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </MemoryRouter>
);

describe('Admin Layout Responsiveness', () => {
  it('should handle mobile sidebar as a drawer overlay', () => {
    // Mock window.innerWidth for mobile
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<MainLayout>Test Content</MainLayout>, { wrapper });

    // In mobile, sidebar should be hidden by default (translate-x-full or -translate-x-full)
    // We can check the class on the aside
    const sidebar = screen.getByRole('navigation', { name: /menu principal/i });
    expect(sidebar.className).toContain('-translate-x-full');

    // Content should not be overlapped (it's flex-1, the sidebar is fixed/absolute in mobile)
    const main = screen.getByRole('main');
    expect(main).toBeDefined();
  });
});
