import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StockBadge, getStockStatus } from '../StockBadge';
import { TooltipProvider } from '@/components/ui/tooltip';

const renderWithTooltip = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('StockBadge Component', () => {
  it('renders correctly for in-stock status', () => {
    renderWithTooltip(<StockBadge status="in-stock" />);
    expect(screen.getByText(/disponível/i)).toBeInTheDocument();
  });

  it('renders correctly for low-stock status', () => {
    renderWithTooltip(<StockBadge status="low-stock" />);
    expect(screen.getByText(/baixo/i)).toBeInTheDocument();
  });

  it('renders quantity when showQuantity is true', () => {
    renderWithTooltip(<StockBadge status="in-stock" quantity={150} showQuantity={true} />);
    expect(screen.getByText(/150 un\./i)).toBeInTheDocument();
  });

  it('formats quantity correctly (thousands)', () => {
    renderWithTooltip(<StockBadge status="in-stock" quantity={1500} showQuantity={true} />);
    expect(screen.getByText(/1\.5k un\./i)).toBeInTheDocument();
  });

  it('returns correct stock status based on quantity', () => {
    expect(getStockStatus(0)).toBe('out-of-stock');
    expect(getStockStatus(20)).toBe('low-stock');
    expect(getStockStatus(100)).toBe('in-stock');
  });

  it('shows icon by default', () => {
    const { container } = renderWithTooltip(<StockBadge status="in-stock" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
