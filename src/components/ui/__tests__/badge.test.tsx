import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../badge';

describe('Badge Component', () => {
  it('renders correctly with default props', () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText(/new/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-primary');
  });

  it('renders different variants', () => {
    const { rerender } = render(<Badge variant="secondary">Secondary</Badge>);
    expect(screen.getByText(/secondary/i)).toHaveClass('bg-secondary');

    rerender(<Badge variant="destructive">Destructive</Badge>);
    expect(screen.getByText(/destructive/i)).toHaveClass('bg-destructive');

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText(/outline/i)).toHaveClass('border-border-strong');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    expect(screen.getByText(/custom/i)).toHaveClass('custom-badge');
  });

  it('maintains a consistent rounded-lg look', () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText(/test/i)).toHaveClass('rounded-lg');
  });

  it('maintains rounded-lg across all variants', () => {
    const variants = ['default', 'secondary', 'destructive', 'outline', 'gradient'] as const;
    variants.forEach(variant => {
      const { unmount } = render(<Badge variant={variant}>Variant</Badge>);
      expect(screen.getByText(/variant/i)).toHaveClass('rounded-lg');
      unmount();
    });
  });
});
