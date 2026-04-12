import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  LoadingScreen,
  ExpiredScreen,
  AlreadyRespondedScreen,
  ErrorScreen,
  SubmittedScreen,
} from "@/pages/public-approval/PublicQuoteStatusScreens";

describe("PublicQuoteStatusScreens", () => {
  it("LoadingScreen shows loading text", () => {
    render(<LoadingScreen />);
    expect(screen.getByText("Carregando proposta...")).toBeInTheDocument();
  });

  it("ExpiredScreen shows expired message", () => {
    render(<ExpiredScreen />);
    expect(screen.getByText("Link expirado")).toBeInTheDocument();
  });

  it("AlreadyRespondedScreen shows approved state", () => {
    render(
      <AlreadyRespondedScreen
        data={{ response: "approved", responded_at: "2026-01-15T10:00:00Z" }}
      />
    );
    expect(screen.getByText("Proposta aprovada")).toBeInTheDocument();
  });

  it("AlreadyRespondedScreen shows rejected state", () => {
    render(
      <AlreadyRespondedScreen
        data={{ response: "rejected", responded_at: "2026-01-15T10:00:00Z" }}
      />
    );
    expect(screen.getByText("Proposta recusada")).toBeInTheDocument();
  });

  it("AlreadyRespondedScreen shows response notes", () => {
    render(
      <AlreadyRespondedScreen
        data={{
          response: "approved",
          responded_at: "2026-01-15T10:00:00Z",
          response_notes: "Ótima proposta!",
        }}
      />
    );
    expect(screen.getByText('"Ótima proposta!"')).toBeInTheDocument();
  });

  it("ErrorScreen shows custom error", () => {
    render(<ErrorScreen error="Falha de rede" />);
    expect(screen.getByText("Falha de rede")).toBeInTheDocument();
  });

  it("ErrorScreen shows default message when no error", () => {
    render(<ErrorScreen error={null} />);
    expect(screen.getByText("Verifique o link e tente novamente.")).toBeInTheDocument();
  });

  it("SubmittedScreen shows approved confirmation", () => {
    render(<SubmittedScreen response="approved" />);
    expect(screen.getByText("Proposta aprovada!")).toBeInTheDocument();
  });

  it("SubmittedScreen shows rejected confirmation", () => {
    render(<SubmittedScreen response="rejected" />);
    expect(screen.getByText("Proposta recusada")).toBeInTheDocument();
  });
});
