import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';
import AdminConexoesPage from '@/pages/admin/AdminConexoesPage';
import AdminUsuariosPage from '@/pages/admin/AdminUsuariosPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);

describe('Admin Module Structural Comparison', () => {
  it('Conexoes and Usuarios should share identical container hierarchy', () => {
    const { container: conexoes } = render(<AdminConexoesPage />, { wrapper });
    const { container: usuarios } = render(<AdminUsuariosPage />, { wrapper });
    
    const findStandardDiv = (root: HTMLElement) => 
      Array.from(root.querySelectorAll('div')).find(d => d.className.includes('max-w-[1920px]'));

    const conexoesDiv = findStandardDiv(conexoes);
    const usuariosDiv = findStandardDiv(usuarios);

    expect(conexoesDiv, 'Conexoes missing standardized container').not.toBeUndefined();
    expect(usuariosDiv, 'Usuarios missing standardized container').not.toBeUndefined();
    
    // Compare classes directly - should be exactly the same
    expect(conexoesDiv?.className).toBe(usuariosDiv?.className);
    
    // Check key design system tokens in classes
    const classes = conexoesDiv?.className || '';
    expect(classes).toContain('mx-auto');
    expect(classes).toContain('px-3');
    expect(classes).toContain('lg:px-6');
    expect(classes).toContain('animate-fade-in');
  });
});
