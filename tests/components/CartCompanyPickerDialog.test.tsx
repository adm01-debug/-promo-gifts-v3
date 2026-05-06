import { render, screen } from '../test-utils';
import { CartCompanyPickerDialog } from '@/components/cart/CartCompanyPickerDialog';
import { describe, it, expect, vi } from 'vitest';
import { SellerCartProvider } from '@/contexts/SellerCartContext';

// Mocking required contexts and modules
vi.mock('@/lib/crm-db', () => ({
  selectCrm: vi.fn().mockResolvedValue([]),
  searchCrm: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/contexts/SellerCartContext', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useSellerCartContext: () => ({
      createCart: vi.fn(),
      canCreateCart: true,
    }),
    SellerCartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

describe('CartCompanyPickerDialog - UI & Accessibility', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  it('renders search input with correct accessibility labels', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // Check for SR-only label
    const label = screen.getByLabelText(/Buscar empresa por nome, CNPJ ou segmento/i);
    expect(label).toBeInTheDocument();
    
    // Check for correct placeholder
    const input = screen.getByPlaceholderText(/Nome, CNPJ ou segmento.../i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'company-search-input');
  });

  it('maintains visual layout structure for search icons', () => {
    const { container } = render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // The Search icon should have specific alignment classes
    const searchIcon = screen.getByTestId('search-icon');
    expect(searchIcon).toHaveClass('absolute', 'left-3', 'top-1/2', '-translate-y-1/2');
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    // Input should have padding to accommodate icons
    expect(input).toHaveClass('pl-8', 'pr-8');
  });

  it('has visible focus states for keyboard navigation', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');
  });
});
