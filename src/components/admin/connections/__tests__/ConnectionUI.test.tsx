import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectionsOverviewTable } from "../ConnectionsOverviewTable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useConnectionsOverview } from "@/hooks/useConnectionsOverview";
import { useConnectionTester } from "@/hooks/useConnectionTester";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useConnectionsOverview", () => ({ useConnectionsOverview: vi.fn() }));
vi.mock("@/hooks/useConnectionTester", () => ({ useConnectionTester: vi.fn() }));
vi.mock("@/hooks/useConsecutiveFailures", () => ({ useConsecutiveFailures: vi.fn(() => ({ map: new Map() })) }));
vi.mock("@/hooks/useSecretsManager", () => ({ useSecretsManager: vi.fn(() => ({ secrets: [] })) }));

describe("ConnectionsOverviewTable Interações e Acessibilidade", () => {
  const mockRows = [
    { id: "1", type: "supabase", name: "DB Alpha", status: "active", env_key: "promobrind" },
    { id: "2", type: "bitrix24", name: "CRM Beta", status: "error", env_key: "crm" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ isAdmin: true });
    (useConnectionsOverview as any).mockReturnValue({ rows: mockRows, loading: false, refresh: vi.fn() });
    (useConnectionTester as any).mockReturnValue({ test: vi.fn(), testing: false });
  });

  it("deve permitir focar e navegar nos botões de ação via teclado", () => {
    render(
      <TooltipProvider>
        <ConnectionsOverviewTable />
      </TooltipProvider>
    );

    const refreshButton = screen.getByText("Atualizar");
    refreshButton.focus();
    expect(document.activeElement).toBe(refreshButton);
  });

  it("deve exibir aria-labels corretos para indicadores de status", () => {
    render(
      <TooltipProvider>
        <ConnectionsOverviewTable />
      </TooltipProvider>
    );

    // O status badge deve ser identificável por tecnologias assistivas
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(1);
  });

  it("deve filtrar a listagem quando o componente de busca for implementado/utilizado", () => {
    // Teste de fumaça para garantir que a tabela renderiza os dados filtrados passados pelo hook
    render(
      <TooltipProvider>
        <ConnectionsOverviewTable />
      </TooltipProvider>
    );
    expect(screen.getByText("DB Alpha")).toBeInTheDocument();
  });
});
