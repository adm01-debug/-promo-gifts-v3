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
    
    // Reset window width
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    window.dispatchEvent(new Event('resize'));
  });

  it('renders search input with robust accessibility labels and attributes', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const label = screen.getByLabelText(/Buscar empresa por nome, CNPJ ou segmento/i);
    expect(label).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText(/Nome, CNPJ ou segmento.../i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'company-search-input');
    expect(input).toHaveAttribute('type', 'text');
    
    // Icons should be hidden from screen readers
    const searchIcon = screen.getByTestId('search-icon');
    expect(searchIcon).toHaveAttribute('aria-hidden', 'true');
  });

  it('validates alignment and classes of Search and Loader2 icons in different states', () => {
    // Force loading state to see Loader2
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const searchIcon = screen.getByTestId('search-icon');
    const loaderIcon = screen.getByTestId('loader-icon');
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });

    // Check absolute alignment classes
    expect(searchIcon).toHaveClass('absolute', 'left-3', 'top-1/2', '-translate-y-1/2');
    expect(loaderIcon).toHaveClass('absolute', 'right-3', 'top-1/2', '-translate-y-1/2', 'animate-spin');
    expect(input).toHaveClass('pl-8', 'pr-8'); // Padding ensures text doesn't overlap icons

    // Verify loading indicator accessibility
    expect(loaderIcon).toHaveAttribute('aria-hidden', 'true');
    expect(input).toHaveAttribute('aria-busy', 'true');

    // Simulate different screen widths (classes should remain consistent as they are responsive via Tailwind)
    Object.defineProperty(window, 'innerWidth', { value: 375 }); // Mobile
    window.dispatchEvent(new Event('resize'));
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    expect(searchIcon).toHaveClass('left-3');
    expect(loaderIcon).toHaveClass('right-3');
  });

  it('validates keyboard navigation (Tab/Shift+Tab) and focus visibility', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    // Use getAllByRole or be more specific for the footer button
    const footerCloseButton = screen.getByRole('button', { name: /^Fechar$/i }); 
    
    // 1. Initial focus (managed by useEffect)
    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    // 2. Visible focus classes
    expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');

    // 3. Navigation with Tab (to TabsTriggers first, then Input, etc. - order depends on DOM)
    // Actually, in our Dialog, the focus starts at the input because of useEffect.
    // Tabbing out should move to the next focusable element (Buttons or Tabs).
    await user.tab();
    expect(input).not.toHaveFocus();

    // 4. Shift+Tab back to input
    await user.tab({ shift: true });
    expect(input).toHaveFocus();
  });

  it('maintains layout integrity across different "simulated" resolutions and font sizes', () => {
    // In JSDOM, we test "integrity" by ensuring the correct utility classes are present 
    // that handle these scenarios (rem-based units).
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    // Ensure height and text size use standard responsive units
    expect(input).toHaveClass('h-9', 'text-sm'); 
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('sm:max-w-[520px]'); // Responsive max-width
  });

  it('ensures aria-busy and accessibility attributes are consistent during state transitions', async () => {
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    let input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    // Initial state: not loading
    expect(input).toHaveAttribute('aria-busy', 'false');

    // Transition to loading
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });
    
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveAttribute('aria-busy', 'true');
    
    // Ensure Loader2 is present and correctly identified as decorative
    const loaderIcon = screen.getByTestId('loader-icon');
    expect(loaderIcon).toBeInTheDocument();
    expect(loaderIcon).toHaveAttribute('aria-hidden', 'true');
  });
});
