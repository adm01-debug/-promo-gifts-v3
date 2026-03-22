import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithProviders } from '../components/render-helpers';
import NotFound from '@/pages/NotFound';

describe('NotFound Page', () => {
  it('renders 404 heading', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders return to home link', () => {
    renderWithProviders(<NotFound />);
    const link = screen.getByText(/return to home/i);
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });

  it('has full screen height', () => {
    const { container } = renderWithProviders(<NotFound />);
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
  });

  it('logs 404 error on mount', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderWithProviders(<NotFound />, { route: '/bad-route' });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('404'),
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });
});
