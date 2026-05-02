import { describe, it, expect, vi } from 'vitest';
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

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

describe('Admin Visual Consistency Snapshot', () => {
  it('Conexoes and Usuarios should have matching container structure', () => {
    const { container: conexoesContainer } = render(<AdminConexoesPage />, { wrapper });
    const { container: usuariosContainer } = render(<AdminUsuariosPage />, { wrapper });
    
    const conexoesMain = conexoesContainer.querySelector('main');
    const usuariosMain = usuariosContainer.querySelector('main');
    
    // Check main container classes
    expect(conexoesMain?.className).toBe(usuariosMain?.className);
    
    // Check first div inside main (the container we padronized)
    const conexoesInner = conexoesMain?.firstElementChild;
    const usuariosInner = usuariosMain?.firstElementChild;
    
    // We used a shared standard class string in our implementation
    const standardClasses = "w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in";
    
    expect(conexoesInner?.className).toContain('mx-auto');
    expect(conexoesInner?.className).toContain('max-w-[1920px]');
    expect(usuariosInner?.className).toBe(conexoesInner?.className);
  });
});
