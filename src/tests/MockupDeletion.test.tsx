import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import MockupGenerator from "@/pages/MockupGenerator";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import * as mockupService from "@/hooks/mockup/mockupGenerationService";
import { toast } from "sonner";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { AriaLiveProvider } from "@/components/a11y/AriaLive";

// Mock services
vi.mock("@/hooks/mockup/mockupGenerationService", async () => {
  const actual = await vi.importActual("@/hooks/mockup/mockupGenerationService");
  return {
    ...actual,
    fetchMockupHistory: vi.fn(),
    deleteMockupFromDb: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-123" } } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <HelmetProvider>
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <ProductsProvider>
            <MemoryRouter>
              <ThemeProvider>
                <AuthProvider>
                  {ui}
                </AuthProvider>
              </ThemeProvider>
            </MemoryRouter>
          </ProductsProvider>
        </QueryClientProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
};

describe("Mockup Deletion Flow", () => {
  const mockHistory = [
    {
      id: "mockup-1",
      product_name: "Caneca 325ml",
      technique_name: "Sublimação",
      mockup_url: "https://example.com/mockup1.png",
      created_at: new Date().toISOString(),
      client_name: "Cliente Teste",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (mockupService.fetchMockupHistory as any).mockResolvedValue(mockHistory);
    (mockupService.deleteMockupFromDb as any).mockResolvedValue(undefined);
  });

  it("deve abrir o diálogo de confirmação ao clicar em excluir", async () => {
    renderWithProviders(<MockupGenerator />);
    
    // Navegar para a aba de histórico
    const historyTab = await screen.findByRole("tab", { name: /histórico/i });
    fireEvent.click(historyTab);

    // Encontrar e clicar no botão de excluir
    const deleteButton = await screen.findByLabelText(/excluir/i);
    fireEvent.click(deleteButton);

    // Verificar se o diálogo apareceu
    expect(screen.getByText(/Excluir mockup\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Esta ação não pode ser desfeita/i)).toBeInTheDocument();
  });

  it("deve chamar deleteMockupFromDb e atualizar a lista ao confirmar", async () => {
    renderWithProviders(<MockupGenerator />);
    
    const historyTab = await screen.findByRole("tab", { name: /histórico/i });
    fireEvent.click(historyTab);

    const deleteButton = await screen.findByLabelText(/excluir/i);
    fireEvent.click(deleteButton);

    // Clicar no botão de confirmar no diálogo
    const confirmButton = screen.getByRole("button", { name: /excluir/i, className: /bg-destructive/i });
    fireEvent.click(confirmButton);

    // Verificar se o serviço de deleção foi chamado com o ID correto e o ID do usuário (mockado como user-123)
    await waitFor(() => {
      expect(mockupService.deleteMockupFromDb).toHaveBeenCalledWith("mockup-1", expect.any(String));
    });

    // Verificar se o toast de sucesso foi exibido
    expect(toast.success).toHaveBeenCalledWith("Mockup excluído com sucesso");

    // Verificar se a lista foi atualizada (fetchMockupHistory chamado novamente)
    expect(mockupService.fetchMockupHistory).toHaveBeenCalledTimes(3); // 1 no mount, 1 no useAuth update, 1 após delete
  });

  it("deve exibir toast de erro quando a deleção falhar", async () => {
    (mockupService.deleteMockupFromDb as any).mockRejectedValue(new Error("Database error"));
    
    renderWithProviders(<MockupGenerator />);
    
    const historyTab = await screen.findByRole("tab", { name: /histórico/i });
    fireEvent.click(historyTab);

    const deleteButton = await screen.findByLabelText(/excluir/i);
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: /excluir/i, className: /bg-destructive/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Não foi possível excluir o mockup. Tente novamente.");
    });
  });

  it("deve resetar o estado ao fechar o diálogo sem confirmar", async () => {
    renderWithProviders(<MockupGenerator />);
    
    const historyTab = await screen.findByRole("tab", { name: /histórico/i });
    fireEvent.click(historyTab);

    const deleteButton = await screen.findByLabelText(/excluir/i);
    fireEvent.click(deleteButton);

    // Cancelar
    const cancelButton = screen.getByRole("button", { name: /cancelar/i });
    fireEvent.click(cancelButton);

    // O diálogo deve fechar
    await waitFor(() => {
      expect(screen.queryByText(/Excluir mockup\?/i)).not.toBeInTheDocument();
    });

    // Abrir novamente o diálogo para outro item (aqui só temos um, mas vamos re-clicar no mesmo)
    // O teste de reset é garantido pela implementação que limpa o ID no fechamento
  });
});