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
    expect(input).toHaveAttribute('aria-controls', 'company-search-results');
    
    // Icons should be hidden from screen readers
    const searchIcon = screen.getByTestId('search-icon');
    expect(searchIcon).toHaveAttribute('aria-hidden', 'true');
    
    // Check results container existence
    expect(document.getElementById('company-search-results')).toBeInTheDocument();
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

  it('validates typography and spacing consistency for font-size regression', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // Header typography
    const title = screen.getByText(/Vincular a uma empresa/i);
    expect(title).toHaveClass('text-lg', 'font-display');
    
    const description = screen.getByText(/Escolha uma empresa para criar o carrinho/i);
    expect(description).toHaveClass('text-xs');
    
    // Tabs typography
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toHaveClass('text-xs');
    });
    
    // Search input typography
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    expect(input).toHaveClass('text-sm');
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
    
    // Initial focus on input
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    await waitFor(() => expect(input).toHaveFocus());

    // Tab multiple times to reach the end and check wrapping/trapping
    // The exact path depends on Radix implementation, but it must stay inside the dialog
    await user.tab(); // Might go to tab content or buttons
    await user.tab(); 
    await user.tab();
    
    const activeElement = document.activeElement;
    expect(screen.getByRole('dialog')).toContainElement(activeElement as HTMLElement);
  });

  it('validates navigation between tabs via keyboard and focus return', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // 1. Initial tab state
    const searchTab = screen.getByRole('tab', { name: /Todas/i });
    expect(searchTab).toHaveAttribute('aria-selected', 'true');
    
    // 2. Click another tab and check selection
    const recentTab = screen.getByRole('tab', { name: /Recentes/i });
    await user.click(recentTab);
    expect(recentTab).toHaveAttribute('aria-selected', 'true');
    expect(searchTab).toHaveAttribute('aria-selected', 'false');

    // 3. Arrow key navigation (Standard Radix/WUI behavior)
    await user.keyboard('{ArrowRight}'); 
    const favoritesTab = screen.getByRole('tab', { name: /Favoritas/i });
    expect(favoritesTab).toHaveAttribute('aria-selected', 'true');
  });

  it('verifies visual alignment of placeholder and text-overflow in search input', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    // Check for standard spacing and typography classes
    expect(input).toHaveClass('text-sm', 'bg-muted/20', 'h-9');
    expect(input).toHaveAttribute('placeholder', 'Nome, CNPJ ou segmento...');
  });

  it('announces search results and empty states to screen readers', async () => {
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    // 1. Loading results
    (reactQuery.useQuery as any).mockReturnValue({
      data: [
        { id: '1', name: 'Company A', razao_social: 'A', nome_fantasia: 'A', ramo: 'Tech', logo_url: null },
      ],
      isLoading: false,
    });
    await user.type(input, 'Comp');
    
    const announcement = document.getElementById('search-announcement');
    expect(announcement).toHaveTextContent(/1 empresas encontradas/i);
    
    // 2. Empty results
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
    });
    // Trigger rerender with new mock data
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    expect(announcement).toHaveTextContent(/Nenhuma empresa encontrada/i);
  });

  it('validates keyboard accessibility for the favorite button', async () => {
    (reactQuery.useQuery as any).mockReturnValue({
      data: [{ id: '1', name: 'Company A', razao_social: 'A', nome_fantasia: 'A', ramo: 'Tech', logo_url: null }],
      isLoading: false,
    });
    
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    await waitFor(() => expect(input).toHaveFocus());
    
    // Tab sequence: Input -> Select Button -> Favorite Button
    await user.tab();
    const selectBtn = screen.getByTestId('cart-company-picker-select');
    expect(selectBtn).toHaveFocus();
    
    await user.tab();
    const favoriteBtn = screen.getByRole('button', { name: /Adicionar aos favoritos/i });
    expect(favoriteBtn).toHaveFocus();
    
    // Verify favorite button is visible when focused (it has focus-visible:opacity-100)
    expect(favoriteBtn).toHaveClass('focus-visible:opacity-100');
  });

  it('verifies critical layout classes that prevent visual regressions', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const searchIcon = screen.getByTestId('search-icon');
    // translate-y-1/2 combined with top-1/2 is the standard centering trick
    expect(searchIcon).toHaveClass('-translate-y-1/2', 'top-1/2', 'pointer-events-none');
    
    const dialogContent = screen.getByRole('dialog');
    // Ensure the dialog has the expected max-width on larger screens (simulated by checking the class)
    expect(dialogContent).toHaveClass('sm:max-w-[520px]');
    
    // Check padding on the tabs container
    const tabsList = screen.getByRole('tablist').parentElement;
    expect(tabsList).toHaveClass('px-5');
  });

  it('displays correct empty state messages for each tab', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);

    // Tab 'Todas' (Search) - default
    expect(screen.getByText(/Nenhuma empresa encontrada/i)).toBeInTheDocument();

    // Tab 'Recentes'
    const recentTab = screen.getByRole('tab', { name: /Recentes/i });
    await user.click(recentTab);
    expect(screen.getByText(/Sem empresas recentes ainda/i)).toBeInTheDocument();

    // Tab 'Favoritas'
    const favoriteTab = screen.getByRole('tab', { name: /Favoritas/i });
    await user.click(favoriteTab);
    expect(screen.getByText(/Marque empresas como favoritas usando a estrela/i)).toBeInTheDocument();
  });

  it('closes the dialog when the Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    // The dialog should be open initially
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Press Escape
    await user.keyboard('{Escape}');
    
    // Verify onOpenChange was called with false
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('verifies that the search container has the correct ARIA role', () => {
    render(<CartCompanyPickerDialog {...defaultProps} />);
    const searchContainer = screen.getByRole('search');
    expect(searchContainer).toBeInTheDocument();
  });

  it('validates alignment classes for long search terms (text-overflow)', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    // Type a very long term
    await user.type(input, 'This is a very long search term that might cause overflow if not handled correctly by padding');
    
    // Input should still have padding-right to avoid overlapping the loader (if it were there)
    expect(input).toHaveClass('pr-8', 'pl-8');
  });

  it('verifies that the search announcement is cleared when the search term is empty', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    
    // Type something
    await user.type(input, 'abc');
    const announcement = document.getElementById('search-announcement');
    
    // Mock results found
    (reactQuery.useQuery as any).mockReturnValue({
      data: [{ id: '1', name: 'Company A' }],
      isLoading: false,
    });
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    expect(announcement).not.toBeEmptyDOMElement();
    
    // Clear input
    await user.clear(input);
    expect(announcement).toBeEmptyDOMElement();
  });

  it('validates focus trap including the Search and Favorites tabs and items', async () => {
    const user = userEvent.setup();
    render(<CartCompanyPickerDialog {...defaultProps} />);
    
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    const closeButton = screen.getByRole('button', { name: /^Fechar$/i });
    const recentTab = screen.getByRole('tab', { name: /Recentes/i });
    const favoritesTab = screen.getByRole('tab', { name: /Favoritas/i });
    const searchTab = screen.getByRole('tab', { name: /Todas/i });

    // Initial focus on input
    await waitFor(() => expect(input).toHaveFocus());

    // Navigate to tabs
    await user.tab({ shift: true }); 
    // This depends on DOM order, usually tabs are before the content
    // Let's use specific focus targets if standard tab sequence is complex
    
    // Tab forward from search input
    await user.tab(); 
    // In "search" tab, it goes Input -> Results area/Items if any -> Close Button
    expect(closeButton).toHaveFocus();

    // Tab back to input
    await user.tab({ shift: true });
    expect(input).toHaveFocus();

    // Tab back to tabs list
    await user.tab({ shift: true });
    expect(searchTab).toHaveFocus();

    // Arrow navigation between tabs
    await user.keyboard('{ArrowLeft}');
    expect(favoritesTab).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(recentTab).toHaveFocus();
  });

  it('verifies that aria-live announcements are triggered when changing between loading and ready states', async () => {
    const { rerender } = render(<CartCompanyPickerDialog {...defaultProps} />);
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: /Buscar empresa/i });
    const announcement = document.getElementById('search-announcement');

    // 1. Initial empty state
    expect(announcement).toBeEmptyDOMElement();

    // 2. Start typing
    await user.type(input, 'Tech');

    // 3. Mock loading state
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: true,
    });
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    expect(input).toHaveAttribute('aria-busy', 'true');
    // Screen reader should see "Carregando empresas..." via sr-only span

    // 4. Mock results ready
    (reactQuery.useQuery as any).mockReturnValue({
      data: [{ id: '1', name: 'Tech Solutions', razao_social: 'TS', nome_fantasia: 'TS', ramo: 'Tech', logo_url: null }],
      isLoading: false,
    });
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    expect(announcement).toHaveTextContent(/1 empresas encontradas/i);

    // 5. Mock no results found
    (reactQuery.useQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
    });
    rerender(<CartCompanyPickerDialog {...defaultProps} />);
    
    expect(announcement).toHaveTextContent(/Nenhuma empresa encontrada/i);
  });
});
