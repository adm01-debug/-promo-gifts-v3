import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../tests/test-utils';
import NoveltiesPage from '@/pages/NoveltiesPage';
import { MOCK_NOVELTIES } from '@/hooks/useNoveltiesMocks';
import React from 'react';

// Mock structured logger to avoid noise
vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock useNoveltiesWithDetails to return mock data
vi.mock('@/hooks/useNovelties', async () => {
  const actual = await vi.importActual('@/hooks/useNovelties');
  return {
    ...actual,
    useNoveltiesWithDetails: vi.fn(() => ({
      data: MOCK_NOVELTIES,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      error: null,
    })),
    useNoveltyStats: vi.fn(() => ({
      data: {
        totalNovelties: MOCK_NOVELTIES.length,
        activeNovelties: MOCK_NOVELTIES.filter(p => p.status === 'active').length,
        expiringSoon: MOCK_NOVELTIES.filter(p => p.status === 'expiring_soon').length,
        arrivedToday: 1,
        arrivedThisWeek: 3,
        arrivedLast15Days: 5,
      },
      isLoading: false,
      isSuccess: true,
    })),
    useExpiringNovelties: vi.fn(() => ({
      data: MOCK_NOVELTIES.filter(p => p.status === 'expiring_soon'),
      isLoading: false,
      isSuccess: true,
    })),
  };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe('NoveltiesPage UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and description correctly', () => {
    render(<NoveltiesPage />);
    
    expect(screen.getByTestId('page-title-novidades')).toBeInTheDocument();
    expect(screen.getByText(/Produtos recém-chegados ao catálogo nos últimos 30 dias/i)).toBeInTheDocument();
  });

  it('renders stats cards with data', async () => {
    render(<NoveltiesPage />);
    
    // Check for some stat labels
    await waitFor(() => {
      expect(screen.getByText(/Total de Novidades/i)).toBeInTheDocument();
      expect(screen.getByText(/Ativas/i)).toBeInTheDocument();
      expect(screen.getByText(/Expira em breve/i)).toBeInTheDocument();
    });
  });

  it('renders the product grid with mock products', async () => {
    render(<NoveltiesPage />);
    
    // Check for product names from MOCK_NOVELTIES
    await waitFor(() => {
      expect(screen.getByText('Power Bank Solar 20000mAh')).toBeInTheDocument();
      expect(screen.getByText('Kit Escrita Sustentável Bambu')).toBeInTheDocument();
    });
  });

  it('filters products by search query', async () => {
    render(<NoveltiesPage />);
    
    const searchInput = screen.getByPlaceholderText(/Buscar novidades…/i);
    
    fireEvent.change(searchInput, { target: { value: 'Solar' } });
    
    // The filtering logic happens inside useNoveltyFilters which uses debounced search
    // In unit tests with real timers, we might need to wait or mock useDebounce
    // But since we want to test UI integration, we wait
    await waitFor(() => {
      expect(screen.getByText('Power Bank Solar 20000mAh')).toBeInTheDocument();
      expect(screen.queryByText('Kit Escrita Sustentável Bambu')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('navigates to product detail on card click', async () => {
    render(<NoveltiesPage />);
    
    const productCard = await screen.findByText('Power Bank Solar 20000mAh');
    
    // Click the card (or the parent container that has the click handler)
    fireEvent.click(productCard.closest('.cursor-pointer') || productCard);
    
    expect(mockNavigate).toHaveBeenCalledWith('/produto/p-1');
  });

  it('clears filters when clicking the clear button', async () => {
    render(<NoveltiesPage />);
    
    const searchInput = screen.getByPlaceholderText(/Buscar novidades…/i);
    fireEvent.change(searchInput, { target: { value: 'XYZ_NON_EXISTENT' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma novidade encontrada/i)).toBeInTheDocument();
    });
    
    const clearButton = screen.getByText(/Limpar todos os filtros/i);
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText('Power Bank Solar 20000mAh')).toBeInTheDocument();
    });
    
    expect(searchInput).toHaveValue('');
  });
});
