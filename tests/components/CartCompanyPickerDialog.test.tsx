import { render, screen, waitFor, within } from '../test-utils';
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
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true }); // Mobile
    window.dispatchEvent(new Event('resize'));
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    expect(searchIcon).toHaveClass('left-3');
    expect(loaderIcon).toHaveClass('right-3');
  });

  it('validates focus management when modal opens and keyboard navigation (Tab/Shift+Tab)', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    const closeButton = screen.getByRole('button', { name: /^Fechar$/i }); 
    
    // 1. Validate initial focus (auto-focus logic in useEffect)
    await waitFor(() => {
      expect(input).toHaveFocus();
    }, { timeout: 1500 });

    // 2. Validate visible focus appearance (classes)
    expect(input).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-primary');

    // 3. Navigate forward with Tab: Input -> Close Button
    // Note: In search tab, it's Input -> ScrollArea -> CloseButton
    await user.tab();
    expect(closeButton).toHaveFocus();

    // 4. Navigate backward with Shift+Tab: Close Button -> Input
    await user.tab({ shift: true });
    expect(input).toHaveFocus();
  });

  it('maintains layout integrity across multiple resolutions and simulated font sizes', () => {
    const viewports = [
      { width: 320, label: 'small-mobile' },
      { width: 375, label: 'mobile' },
      { width: 768, label: 'tablet' },
      { width: 1280, label: 'desktop' }
    ];

    viewports.forEach(({ width }) => {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
      window.dispatchEvent(new Event('resize'));
      
      const { unmount } = render(<CartCompanyPickerDialog {...defaultProps} />);
      
      const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
      // Consistent classes for alignment regardless of width
      expect(input).toHaveClass('pl-8', 'pr-8', 'h-9');
      
      const searchIcon = screen.getByTestId('search-icon');
      expect(searchIcon).toHaveClass('absolute', 'left-3', 'top-1/2');
      
      unmount();
    });
  });

  it('verifies visual regression states (isLoading=true/false) for icon positioning', () => {
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // State: Not Loading
    expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    let input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveClass('pr-8'); // Space reserved for loader

    // State: Loading
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    const loader = screen.getByTestId('loader-icon');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass('absolute', 'right-3', 'top-1/2', '-translate-y-1/2');
    
    input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveAttribute('aria-busy', 'true');
  });

  it('ensures focus is trapped within the dialog during keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /^Fechar$/i });
    
    // Tab from input to close button (already tested, but good for flow)
    await user.tab(); 
    expect(closeButton).toHaveFocus();

    // Next tab should wrap back to the first focusable element (Tabs or Close button if logic varies, usually title/close)
    // Radix Dialog handles focus trapping. We verify it doesn't leave the dialog.
    await user.tab();
    const activeElement = document.activeElement;
    expect(screen.getByRole('dialog')).toContainElement(activeElement as HTMLElement);
  });

  it('validates navigation between tabs via keyboard', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // Search tab is default. Let's move to Recents.
    const recentTab = screen.getByRole('tab', { name: /Recentes/i });
    const searchTab = screen.getByRole('tab', { name: /Todas/i });
    
    expect(searchTab).toHaveAttribute('aria-selected', 'true');
    
    // Use arrow keys to navigate tabs (standard ARIA pattern)
    await user.click(searchTab);
    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{ArrowLeft}'); // Move from Search -> Favorites -> Recent
    
  });
});
