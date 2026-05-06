import { render, screen, waitFor } from '../test-utils';
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

  it('validates keyboard navigation and focus management', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    const closeButton = screen.getByRole('button', { name: /^Fechar$/i }); 
    
    // Initial focus (auto-focus logic in useEffect)
    await waitFor(() => {
      expect(input).toHaveFocus();
    }, { timeout: 1000 });

    // Visible focus state (classes)
    expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');

    // Navigate with Tab (Input -> Tabs -> Buttons)
    // In our implementation, input is at the bottom of the "search" tab content.
    // The order is DialogTitle -> Tabs -> Input -> CloseButton
    // Wait for the focus to settle on input
    await user.tab();
    expect(closeButton).toHaveFocus();

    // Shift+Tab back
    await user.tab({ shift: true });
    expect(input).toHaveFocus();
  });

  it('maintains layout integrity across parameterized resolutions and font sizes', () => {
    const viewports = [
      { width: 375, label: 'mobile' },
      { width: 1024, label: 'desktop' }
    ];

    viewports.forEach(({ width }) => {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
      window.dispatchEvent(new Event('resize'));
      
      const { unmount } = render(<CartCompanyPickerDialog {...defaultProps} />);
      
      const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
      expect(input).toHaveClass('h-9', 'text-sm', 'pl-8', 'pr-8');
      
      const searchIcon = screen.getByTestId('search-icon');
      expect(searchIcon).toHaveClass('left-3', 'top-1/2', '-translate-y-1/2');
      
      unmount();
    });
  });

  it('ensures aria-live and aria-busy announce state changes correctly', async () => {
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    let input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    expect(input).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByText(/Carregando empresas.../i)).not.toBeInTheDocument();

    // Transition to loading
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });
    
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveAttribute('aria-busy', 'true');
    
    // Check for aria-live region content
    expect(screen.getByText(/Carregando empresas.../i)).toBeInTheDocument();
  });

  it('verifies visual states for isLoading=true/false (snapshot-like class checks)', () => {
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // State: Ready
    const inputNotLoading = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(inputNotLoading).toHaveClass('pr-8');
    expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();

    // State: Loading
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    const inputLoading = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(inputLoading).toHaveClass('pr-8');
    const loader = screen.getByTestId('loader-icon');
    expect(loader).toHaveClass('right-3', 'animate-spin');
  });
});
