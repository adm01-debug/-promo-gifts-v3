/**
 * Tests for VoiceSearchOverlay component
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoiceSearchOverlay } from "@/components/search/VoiceSearchOverlay";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => <span ref={ref} {...props}>{children}</span>),
    p: React.forwardRef(({ children, ...props }: any, ref: any) => <p ref={ref} {...props}>{children}</p>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("VoiceSearchOverlay", () => {
  const defaultProps = {
    isOpen: true,
    phase: "idle" as const,
    partialTranscript: "",
    finalTranscript: "",
    agentResponse: "",
    error: null,
    onClose: vi.fn(),
    onStartListening: vi.fn(),
    onStopListening: vi.fn(),
    onStopSpeaking: vi.fn(),
    onCommandSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<VoiceSearchOverlay {...defaultProps} />);
    expect(screen.getByText("Assistente de Voz")).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<VoiceSearchOverlay {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Assistente de Voz")).toBeNull();
  });

  it("shows listening phase title", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="listening" />);
    expect(screen.getByText("Ouvindo...")).toBeDefined();
  });

  it("shows processing phase title", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="processing" />);
    expect(screen.getByText("Processando...")).toBeDefined();
  });

  it("shows speaking phase title", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="speaking" />);
    expect(screen.getByText("Respondendo...")).toBeDefined();
  });

  it("shows error phase title", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="error" />);
    expect(screen.getByText("Erro")).toBeDefined();
  });

  it("displays partial transcript while listening", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="listening" partialTranscript="buscar can" />);
    expect(screen.getByText(/buscar can/)).toBeDefined();
  });

  it("displays final transcript", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="processing" finalTranscript="buscar canetas" />);
    expect(screen.getByText(/buscar canetas/)).toBeDefined();
  });

  it("displays agent response when speaking", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="speaking" agentResponse="Encontrei 5 canetas" />);
    expect(screen.getByText("Encontrei 5 canetas")).toBeDefined();
  });

  it("displays error message", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="error" error="Erro ao conectar" />);
    expect(screen.getByText("Erro ao conectar")).toBeDefined();
  });

  it("shows suggestion chips when idle", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="idle" />);
    expect(screen.getByText(/"Quero canetas azuis baratas"/)).toBeDefined();
  });

  it("calls onClose when escape is pressed", () => {
    render(<VoiceSearchOverlay {...defaultProps} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onCommandSelect when clicking suggestion chip", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="idle" />);
    const chip = screen.getByText(/"Quero canetas azuis baratas"/);
    fireEvent.click(chip);
    expect(defaultProps.onCommandSelect).toHaveBeenCalledWith("Quero canetas azuis baratas");
  });

  it("disables mic button during processing", () => {
    render(<VoiceSearchOverlay {...defaultProps} phase="processing" />);
    // The main mic button should be disabled
    const buttons = screen.getAllByRole("button");
    const micButton = buttons.find(b => b.getAttribute("disabled") !== null);
    expect(micButton).toBeDefined();
  });

  it("shows ElevenLabs badge", () => {
    render(<VoiceSearchOverlay {...defaultProps} />);
    expect(screen.getByText("IA + Voz ElevenLabs")).toBeDefined();
  });

  it("shows ESC instruction", () => {
    render(<VoiceSearchOverlay {...defaultProps} />);
    expect(screen.getByText("ESC")).toBeDefined();
  });
});
