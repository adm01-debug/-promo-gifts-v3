import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatCard } from '../StockStatCard';
import { Package } from 'lucide-react';

describe('StatCard Component', () => {
  it('renders correctly with required props', () => {
    render(<StatCard title="Total items" value={100} icon={<Package data-testid="icon" />} />);
    expect(screen.getByText(/total items/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('animates numeric values', async () => {
    render(<StatCard title="Count" value={50} icon={<Package />} />);
    // The animated value starts at target or 0? 
    // useCountUp(isNumeric ? numericValue : 0) -> target = 50.
    // It should eventually show 50.
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<StatCard title="Clickable" value="10" icon={<Package />} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('renders different variants', () => {
    const { rerender } = render(<StatCard title="Success" value={10} icon={<Package />} variant="success" />);
    expect(screen.getByRole('button')).toHaveClass('bg-success/5');

    rerender(<StatCard title="Error" value={10} icon={<Package />} variant="error" />);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive/5');
  });

  it('renders trend information', () => {
    render(
      <StatCard 
        title="Trend" 
        value={10} 
        icon={<Package />} 
        trend={{ value: 5, label: "+5% vs last month" }} 
      />
    );
    expect(screen.getByText(/\+5% vs last month/i)).toBeInTheDocument();
    expect(screen.getByText(/\+5% vs last month/i).closest('p')).toHaveClass('text-success');
  });

  it('has rounded-lg class for design system consistency', () => {
    render(<StatCard title="Test" value={1} icon={<Package />} />);
    expect(screen.getByRole('button')).toHaveClass('rounded-lg');
  });
});
