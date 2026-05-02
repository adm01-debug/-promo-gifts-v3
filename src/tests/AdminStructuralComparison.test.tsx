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
  it('Conexoes and Usuarios should share matching container hierarchy', () => {
    const { container: conexoes } = render(<AdminConexoesPage />, { wrapper });
    const { container: usuarios } = render(<AdminUsuariosPage />, { wrapper });
    
    // Select the standardized inner container (first div inside main)
    const conexoesInner = conexoes.querySelector('main > div');
    const usuariosInner = usuarios.querySelector('main > div');

    expect(conexoesInner, 'Conexoes missing inner container').not.toBeNull();
    expect(usuariosInner, 'Usuarios missing inner container').not.toBeNull();
    
    // Check core layout tokens for max-width and auto-centering
    expect(conexoesInner?.className).toContain('mx-auto');
    expect(conexoesInner?.className).toContain('max-w-');
    
    // Compare structural equivalence
    expect(usuariosInner?.className).toBe(conexoesInner?.className);
  });
});
