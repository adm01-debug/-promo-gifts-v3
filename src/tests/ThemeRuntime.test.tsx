import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTheme } from '../contexts/ThemeContext';
import React from 'react';

// Mock component that uses useTheme
const ThemeConsumer = () => {
  const theme = useTheme();
  return <div data-testid="theme-value">{theme.actualTheme}</div>;
};

describe('Theme Runtime Safety', () => {
  it('should not crash when useTheme is used outside of ThemeProvider', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // This should not throw anymore
    expect(() => {
      render(<ThemeConsumer />);
    }).not.toThrow();
    
    expect(screen.getByTestId('theme-value')).toBeDefined();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('useTheme must be used within a ThemeProvider'));
    
    spy.mockRestore();
  });
});
