import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardContent } from '@/components/ui/card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><CardContent>Content</CardContent></Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
  
  it('applies className', () => {
    const { container } = render(<Card className="custom"><CardContent>Content</CardContent></Card>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
