import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarLogo } from './AvatarLogo';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('AvatarLogo', () => {
  it('renders correctly with a valid logoUrl', () => {
    render(<AvatarLogo logoUrl="https://example.com/logo.png" name="Acme Corp" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
    expect(img).toHaveAttribute('alt', 'Acme Corp');
  });

  it('renders fallback with name initials when logoUrl is missing', () => {
    render(<AvatarLogo name="Acme Corp" />);
    expect(screen.getByText('AC')).toBeInTheDocument();
  });

  it('renders Building2 icon when both logoUrl and name are missing', () => {
    const { container } = render(<AvatarLogo />);
    // Building2 is a lucide icon, it should be an svg
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<AvatarLogo size="sm" name="A" />);
    expect(screen.getByText('A').parentElement).toHaveClass('w-7 h-7');

    rerender(<AvatarLogo size="xl" name="A" />);
    expect(screen.getByText('A').parentElement).toHaveClass('w-12 h-12');
  });

  it('is accessible', async () => {
    const { container } = render(<AvatarLogo logoUrl="https://example.com/logo.png" name="Acme Corp" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('is accessible with fallback', async () => {
    const { container } = render(<AvatarLogo name="Acme Corp" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
