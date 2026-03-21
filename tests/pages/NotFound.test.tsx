import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '@/pages/NotFound';

describe('NotFound Page', () => {
  const renderNotFound = (route = '/unknown') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <NotFound />
      </MemoryRouter>
    );
  };

  it('renders 404 heading', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderNotFound();
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders return to home link', () => {
    renderNotFound();
    const link = screen.getByText(/return to home/i);
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });

  it('has full screen height', () => {
    const { container } = renderNotFound();
    expect(container.firstChild).toHaveClass('min-h-screen');
  });

  it('logs 404 error on mount', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderNotFound('/bad-route');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('404'),
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });
});
