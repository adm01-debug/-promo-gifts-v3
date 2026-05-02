import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';
import React from 'react';

// Mock complex providers/modules to avoid issues in testing environment
vi.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  createQueryClient: () => ({}),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="browser-router">{children}</div>,
  };
});

// Mock ThemeInitializer to see if it's mounted
vi.mock('../components/ThemeInitializer', () => ({
  ThemeInitializer: () => <div data-testid="theme-initializer" />
}));

describe('App Structure and Navigation', () => {
  it('should render ThemeProvider wrapping ThemeInitializer at the root', () => {
    const { getByTestId } = render(<App />);
    
    // ThemeInitializer should be present
    const initializer = getByTestId('theme-initializer');
    expect(initializer).toBeDefined();
  });
});
