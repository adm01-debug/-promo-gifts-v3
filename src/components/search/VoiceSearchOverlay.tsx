import React, { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Sparkles, MessageCircle, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VoiceAgentPhase } from "@/hooks/useVoiceAgent";

interface VoiceSearchOverlayProps {
  isOpen: boolean;
  phase: VoiceAgentPhase;
  partialTranscript: string;
  finalTranscript: string;
  agentResponse: string;
  error?: string | null;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  onCommandSelect?: (command: string) => void;
}

const phaseConfig: Record<VoiceAgentPhase, { title: string; subtitle: string; color: string }> = {
  idle: { title: "Assistente de Voz", subtitle: "Clique no microfone para começar", color: "bg-secondary" },
  listening: { title: "Ouvindo...", subtitle: "Diga o que você precisa", color: "bg-primary" },
  processing: { title: "Processando...", subtitle: "IA interpretando seu comando", color: "bg-warning" },
  speaking: { title: "Respondendo...", subtitle: "Ouvindo a resposta", color: "bg-success" },
  error: { title: "Erro", subtitle: "Tente novamente", color: "bg-destructive" },
};

export const VoiceSearchOverlay = React.forwardRef<HTMLDivElement, VoiceSearchOverlayProps>(
  function VoiceSearchOverlay({
    isOpen,
    phase,
    partialTranscript,
    finalTranscript,
    agentResponse,
    error,
    onClose,
    onStartListening,
    onStopListening,
    onStopSpeaking,
    onCommandSelect,
  }, ref) {
  const [isAutoStarting, setIsAutoStarting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const wasOpenRef = useRef(false);

  // Track closing transition to suppress idle flash during exit animation
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      setIsClosing(false);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      setIsClosing(true);
      const timer = setTimeout(() => setIsClosing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-start listening when overlay opens and auto-restart after agent responds
  const prevPhaseRef = useRef<VoiceAgentPhase>("idle");
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasAutoStarted.current = false;
      prevPhaseRef.current = "idle";
      setIsAutoStarting(false);
      return;
    }

    // First open: auto-start after brief delay
    if (phase === "idle" && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      setIsAutoStarting(true);
      const timer = setTimeout(() => onStartListening(), 120);
      return () => clearTimeout(timer);
    }

    // After speaking finishes → auto-restart listening for continuous conversation
    if (phase === "idle" && prevPhaseRef.current === "speaking") {
      setIsAutoStarting(true);
      const timer = setTimeout(() => onStartListening(), 800);
      prevPhaseRef.current = phase;
      return () => clearTimeout(timer);
    }

    if (phase !== "idle") {
      setIsAutoStarting(false);
      hasAutoStarted.current = true;
    }

    prevPhaseRef.current = phase;
  }, [isOpen, phase, onStartListening]);

  const showBootingState = (isAutoStarting && phase === "idle") || isClosing;
  const config = phaseConfig[phase];
  const title = showBootingState ? "Ativando microfone..." : config.title;
  const subtitle = showBootingState ? "Preparando sua conversa por voz" : config.subtitle;
  const showTranscript = partialTranscript || finalTranscript;

  const handleMicClick = useCallback(() => {
    if (showBootingState || phase === "processing") {
      return;
    }

    if (phase === "listening") {
      onStopListening();
    } else if (phase === "speaking") {
      onStopSpeaking();
    } else if (phase === "idle" || phase === "error") {
      onStartListening();
    }
  }, [phase, showBootingState, onStartListening, onStopListening, onStopSpeaking]);

  const getMicIcon = () => {
    if (showBootingState) return <Loader2 className="h-10 w-10 animate-spin" />;
    if (phase === "listening") return <MicOff className="h-10 w-10" />;
    if (phase === "processing") return <Loader2 className="h-10 w-10 animate-spin" />;
    if (phase === "speaking") return <VolumeX className="h-10 w-10" />;
    return <Mic className="h-10 w-10" />;
  };

  const getMicLabel = () => {
    if (showBootingState) return "Ativando microfone";
    if (phase === "listening") return "Parar de ouvir";
    if (phase === "processing") return "Processando comando de voz";
    if (phase === "speaking") return "Parar resposta de voz";
    return "Iniciar microfone";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Assistente de Voz"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-lg w-full mx-4"
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-10 w-10 rounded-full"
              onClick={onClose}
              aria-label="Fechar assistente de voz"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Status text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {title}
              </h2>
              <p className="text-muted-foreground text-sm">
                {subtitle}
              </p>
              {/* ElevenLabs + AI badge */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                  <Sparkles className="h-3 w-3" />
                  IA + Voz ElevenLabs
                </span>
              </div>
            </motion.div>

            {/* Microphone button with phase-aware effects */}
            <div className="relative">
              {/* Ripple circles for listening */}
              {phase === "listening" && (
                <>
                  {[0, 0.5, 1].map((delay, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay }}
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                  ))}
                </>
              )}

              {/* Pulse for processing */}
              {(phase === "processing" || showBootingState) && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-warning"
                />
              )}

              {/* Glow for speaking */}
              {phase === "speaking" && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-success"
                />
              )}

              {/* Main button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMicClick}
                disabled={phase === "processing" || showBootingState}
                className={cn(
                  "relative z-10 flex items-center justify-center w-28 h-28 rounded-full transition-all duration-300 disabled:opacity-70",
                  showBootingState && "bg-warning text-warning-foreground",
                  phase === "listening" && "bg-primary text-primary-foreground shadow-[0_0_60px_rgba(var(--primary),0.5)]",
                  phase === "processing" && "bg-warning text-warning-foreground",
                  phase === "speaking" && "bg-success text-success-foreground shadow-glow-success",
                  phase === "error" && "bg-destructive text-destructive-foreground",
                  phase === "idle" && "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                aria-label={getMicLabel()}
              >
                {getMicIcon()}
              </motion.button>
            </div>

            {/* Live region for screen reader announcements */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {showBootingState && "Ativando microfone."}
              {phase === "listening" && "Ouvindo. Fale seu comando."}
              {phase === "processing" && `Processando: ${finalTranscript}`}
              {phase === "speaking" && `Resposta: ${agentResponse}`}
              {phase === "error" && `Erro: ${error}`}
            </div>
            {(phase === "listening" || showBootingState) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1"
              >
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [12, 32, 12] }}
                    transition={{
                      duration: 0.5 + Math.random() * 0.3,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                    className="w-1.5 bg-primary rounded-full"
                    style={{ height: 12 }}
                  />
                ))}
              </motion.div>
            )}

            {/* Speaker wave - speaking */}
            {phase === "speaking" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Volume2 className="h-5 w-5 text-success" />
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 20, 8] }}
                    transition={{
                      duration: 0.4 + i * 0.1,
                      repeat: Infinity,
                      delay: i * 0.08,
                      ease: "easeInOut",
                    }}
                    className="w-1.5 bg-success rounded-full"
                    style={{ height: 8 }}
                  />
                ))}
              </motion.div>
            )}

            {/* Suggestions - only when idle */}
            {phase === "idle" && !showBootingState && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 text-center w-full"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Experimente dizer
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Quero canetas azuis baratas",
                    "Mostra mochilas ecológicas",
                    "Abre os orçamentos",
                    "Qual o produto mais vendido?",
                    "Tem garrafa térmica em estoque?",
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => onCommandSelect?.(cmd)}
                      className="px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors cursor-pointer"
                    >
                      "{cmd}"
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Live transcript */}
            <AnimatePresence mode="wait">
              {showTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="w-full"
                >
                  <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                      {phase === "listening" ? "Você está dizendo:" : "Você disse:"}
                    </p>
                    <p className="text-lg font-medium text-foreground">
                      "{partialTranscript || finalTranscript}"
                      {phase === "listening" && partialTranscript && (
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                          className="text-primary"
                        >
                          |
                        </motion.span>
                      )}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent response */}
            <AnimatePresence mode="wait">
              {agentResponse && (phase === "speaking" || phase === "idle") && (
                <motion.div
                  key="agent-response"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="w-full"
                >
                  <div className={cn(
                    "rounded-xl p-4 border",
                    phase === "speaking"
                      ? "bg-success/10 border-success/20"
                      : "bg-primary/5 border-primary/20"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        phase === "speaking" ? "bg-success/20" : "bg-primary/10"
                      )}>
                        <MessageCircle className={cn(
                          "h-4 w-4",
                          phase === "speaking" ? "text-success" : "text-primary"
                        )} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Assistente</p>
                        <p className="text-sm font-medium text-foreground">{agentResponse}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full bg-destructive/10 text-destructive rounded-xl p-4 border border-destructive/20 text-center"
                >
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instructions */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">ESC</kbd> para fechar
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  }
);
