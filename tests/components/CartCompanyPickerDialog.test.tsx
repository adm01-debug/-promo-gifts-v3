import { render, screen, fireEvent, waitFor } from '../test-utils';
import { CartCompanyPickerDialog } from '@/components/cart/CartCompanyPickerDialog';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSellerCartContext } from '@/contexts/SellerCartContext';
import * as reactQuery from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Mocking required contexts and modules
vi.mock('@/lib/crm-db', () => ({
  selectCrm: vi.fn().mockResolvedValue([]),
  searchCrm: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/contexts/SellerCartContext', () => ({
  useSellerCartContext: vi.fn(),
  SellerCartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

describe('CartCompanyPickerDialog - UI, Accessibility & Regression', () => {
  const mockCreateCart = vi.fn();
  const mockOnOpenChange = vi.fn();
  
  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSellerCartContext as any).mockReturnValue({
      createCart: mockCreateCart,
      canCreateCart: true,
    });
    // Default mock for useQuery (not loading)
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('renders search input with correct accessibility labels', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const label = screen.getByLabelText(/Buscar empresa por nome, CNPJ ou segmento/i);
    expect(label).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText(/Nome, CNPJ ou segmento.../i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'company-search-input');
  });

  it('validates alignment and classes of Search and Loader2 icons', () => {
    // Force loading state to see Loader2
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const searchIcon = screen.getByTestId('search-icon');
    expect(searchIcon).toHaveClass('absolute', 'left-3', 'top-1/2', '-translate-y-1/2');
    
    const loaderIcon = screen.getByTestId('loader-icon');
    expect(loaderIcon).toHaveClass('absolute', 'right-3', 'top-1/2', '-translate-y-1/2', 'animate-spin');
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveClass('pl-8', 'pr-8');
    expect(input).toHaveAttribute('aria-busy', 'true');
  });

  it('handles keyboard navigation and focus correctly', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    // Test initial focus (it has a useEffect that focuses the input)
    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    // Test visual focus classes
    expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');

    // Simulate Tab out
    await user.tab();
    expect(input).not.toHaveFocus();

    // Tab back in (Shift+Tab)
    await user.tab({ shift: true });
    expect(input).toHaveFocus();
  });

  it('validates responsive and typography scaling properties', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // DialogContent is usually rendered in a portal
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('sm:max-w-[520px]');

    // Verify relative sizes for typography consistency
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveClass('h-9', 'text-sm'); // Uses standard shadcn/ui sizes which are responsive
  });

  it('toggles aria-busy correctly based on loading state', () => {
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    let input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveAttribute('aria-busy', 'false');

    // Simulate loading
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });
    
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveAttribute('aria-busy', 'true');
  });
});
