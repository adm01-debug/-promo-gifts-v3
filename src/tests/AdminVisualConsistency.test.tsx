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
    
    // MainLayout wraps children in a main element
    expect(conexoesMain).not.toBeNull();
    expect(usuariosMain).not.toBeNull();
    
    // We look for ANY container that has our padronized layout classes.
    // In our implementation, we added: mx-auto max-w-[1920px]...
    const conexoesContainer = conexoesMain?.querySelector('[class*="mx-auto"]');
    const usuariosContainer = usuariosMain?.querySelector('[class*="mx-auto"]');
    
    expect(conexoesContainer, 'Conexoes content should have mx-auto container').not.toBeNull();
    expect(usuariosContainer, 'Usuarios content should have mx-auto container').not.toBeNull();
    
    expect(conexoesContainer?.className).toContain('max-w-');
    expect(usuariosContainer?.className).toBe(conexoesContainer?.className);
  });
});
