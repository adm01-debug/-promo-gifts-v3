import React, { useEffect, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";
import type { VoiceAgentPhase } from "@/hooks/useVoiceAgent";
import { usePhaseColors } from "./voice/usePhaseColors";
import { SpectrumWaveform } from "./voice/VoiceVisualEffects";
import { VoiceOrb } from "./voice/VoiceOrb";
import { FloatingParticles } from "./voice/FloatingParticles";

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

const PHASE_META: Record<VoiceAgentPhase, { title: string; subtitle: string }> = {
  idle: { title: "Assistente de Voz", subtitle: "Toque no orbe para começar" },
  listening: { title: "Ouvindo...", subtitle: "Diga o que você precisa" },
  processing: { title: "Processando...", subtitle: "IA interpretando seu comando" },
  speaking: { title: "Respondendo...", subtitle: "Ouvindo a resposta" },
  error: { title: "Erro", subtitle: "Toque para tentar novamente" },
};

const SUGGESTION_COMMANDS = [
  "Quero canetas azuis baratas",
  "Mostra mochilas ecológicas",
  "Abre os orçamentos",
  "Qual o produto mais vendido?",
];

export const VoiceSearchOverlay = React.forwardRef<HTMLDivElement, VoiceSearchOverlayProps>(
  function VoiceSearchOverlay({
    isOpen, phase, partialTranscript, finalTranscript, agentResponse, error,
    onClose, onStartListening, onStopListening, onStopSpeaking, onCommandSelect,
  }, ref) {
    const [isAutoStarting, setIsAutoStarting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const wasOpenRef = useRef(false);

    // Closing transition guard
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

    // Close on ESC
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen) onClose();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Auto-start & continuous listening
    const prevPhaseRef = useRef<VoiceAgentPhase>("idle");
    const hasAutoStarted = useRef(false);
    useEffect(() => {
      if (!isOpen) {
        hasAutoStarted.current = false;
        prevPhaseRef.current = "idle";
        setIsAutoStarting(false);
        return;
      }

      if (phase === "idle" && !hasAutoStarted.current) {
        hasAutoStarted.current = true;
        setIsAutoStarting(true);
        const timer = setTimeout(() => onStartListening(), 120);
        return () => clearTimeout(timer);
      }

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

    const showBooting = (isAutoStarting && phase === "idle") || isClosing;
    const meta = PHASE_META[phase] ?? PHASE_META.idle;
    const title = showBooting ? "Ativando microfone..." : meta.title;
    const subtitle = showBooting ? "Preparando sua conversa por voz" : meta.subtitle;
    const showTranscript = partialTranscript || finalTranscript;
    const colors = usePhaseColors(phase, showBooting);
    const isWaveformActive = phase === "listening" || phase === "speaking" || showBooting;

    // Haptic feedback for mobile
    const vibrate = useCallback((pattern: number | number[]) => {
      try { navigator?.vibrate?.(pattern); } catch { /* unsupported */ }
    }, []);

    const handleOrbClick = useCallback(() => {
      if (showBooting || phase === "processing") return;
      vibrate(15);
      if (phase === "listening") onStopListening();
      else if (phase === "speaking") onStopSpeaking();
      else if (phase === "idle" || phase === "error") onStartListening();
    }, [phase, showBooting, vibrate, onStartListening, onStopListening, onStopSpeaking]);

    // Vibrate on phase transitions
    const prevVibratePhase = useRef(phase);
    useEffect(() => {
      if (phase !== prevVibratePhase.current) {
        if (phase === "listening") vibrate(10);
        else if (phase === "speaking") vibrate([10, 50, 10]);
        else if (phase === "error") vibrate([30, 80, 30]);
        prevVibratePhase.current = phase;
      }
    }, [phase, vibrate]);

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Assistente de Voz"
          >
            {/* Glass backdrop with breathing effect — always active when overlay is open */}
            <motion.div
              className="absolute inset-0 backdrop-blur-xl"
              animate={{ backgroundColor: ["rgba(2,2,10,0.30)", "rgba(2,2,10,0.85)", "rgba(2,2,10,0.30)"] }}
              transition={{ duration: 6.6, repeat: Infinity, ease: "easeInOut" }}
              onClick={onClose}
            />

            {/* Floating particles */}
            <FloatingParticles phase={phase} isBooting={showBooting} />

            {/* Centered card */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  boxShadow:
                    phase === "listening"
                      ? [
                          "0 0 30px 4px rgba(139,92,246,0.15), 0 0 60px 10px rgba(139,92,246,0.08)",
                          "0 0 50px 8px rgba(139,92,246,0.3), 0 0 90px 20px rgba(139,92,246,0.15)",
                          "0 0 30px 4px rgba(139,92,246,0.15), 0 0 60px 10px rgba(139,92,246,0.08)",
                        ]
                      : phase === "speaking"
                      ? [
                          "0 0 30px 4px rgba(59,130,246,0.15), 0 0 60px 10px rgba(59,130,246,0.08)",
                          "0 0 50px 8px rgba(59,130,246,0.3), 0 0 90px 20px rgba(99,102,241,0.15)",
                          "0 0 30px 4px rgba(59,130,246,0.15), 0 0 60px 10px rgba(59,130,246,0.08)",
                        ]
                      : phase === "processing"
                      ? [
                          "0 0 30px 4px rgba(168,85,247,0.15), 0 0 60px 10px rgba(168,85,247,0.08)",
                          "0 0 50px 8px rgba(168,85,247,0.3), 0 0 90px 20px rgba(168,85,247,0.15)",
                          "0 0 30px 4px rgba(168,85,247,0.15), 0 0 60px 10px rgba(168,85,247,0.08)",
                        ]
                      : "0 8px 60px rgba(0,0,0,0.5)",
                }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{
                  type: "spring", damping: 25, stiffness: 250,
                  boxShadow: phase === "listening" || phase === "speaking" || phase === "processing"
                    ? { duration: 6.6, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.5 },
                }}
                className="flex flex-col items-center gap-4 max-w-xs w-full px-6 py-7 rounded-3xl border-0 bg-[rgba(8,8,18,0.92)] pointer-events-auto max-h-[90vh] overflow-y-auto"
              >
                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center"
                >
                  <h2 className="text-xs font-medium text-white/50 mb-0.5">{title}</h2>
                  <p className="text-white/25 text-[10px]">{subtitle}</p>
                </motion.div>

                {/* Clickable Orb */}
                <motion.div
                  className="cursor-pointer select-none"
                  onClick={handleOrbClick}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  role="button"
                  aria-label={
                    showBooting ? "Ativando microfone"
                      : phase === "listening" ? "Parar de ouvir"
                      : phase === "processing" ? "Processando comando"
                      : phase === "speaking" ? "Parar resposta"
                      : "Iniciar microfone"
                  }
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleOrbClick(); }}
                >
                  <VoiceOrb phase={phase} isBooting={showBooting} />
                </motion.div>

                {/* Spectrum waveform */}
                <AnimatePresence mode="wait">
                  {isWaveformActive && (
                    <motion.div
                      key="spectrum"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <SpectrumWaveform colors={colors} isActive={isWaveformActive} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live transcript */}
                <AnimatePresence mode="wait">
                  {showTranscript && (
                    <motion.div
                      key="transcript"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full"
                    >
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                          {phase === "listening" ? "Você está dizendo:" : "Você disse:"}
                        </p>
                        <p className="text-base font-medium text-white/90">
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
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="w-full"
                    >
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageCircle className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Assistente</p>
                            <p className="text-sm font-medium text-white/90">{agentResponse}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full bg-destructive/10 border border-destructive/20 rounded-2xl px-5 py-4 text-center"
                    >
                      <p className="text-sm text-destructive">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Suggestions */}
                {phase === "idle" && !showBooting && (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-3 text-center w-full"
                  >
                    <p className="text-[10px] text-white/25 uppercase tracking-widest font-medium">
                      Experimente dizer
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTION_COMMANDS.map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => onCommandSelect?.(cmd)}
                          className="group px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] rounded-full text-xs text-white/35 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 cursor-pointer hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]"
                        >
                          <span className="group-hover:tracking-wide transition-all duration-200">"{cmd}"</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Footer: ESC hint + close button */}
                <div className="w-full flex items-center justify-between mt-1">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-[10px] text-white/20"
                  >
                    <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px] font-mono border border-white/10">ESC</kbd> para fechar
                  </motion.p>
                  <button
                    onClick={onClose}
                    className="flex items-center justify-center w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white/80 transition-colors"
                    aria-label="Fechar assistente de voz"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Screen-reader live region */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {showBooting && "Ativando microfone."}
              {phase === "listening" && "Ouvindo. Fale seu comando."}
              {phase === "processing" && `Processando: ${finalTranscript}`}
              {phase === "speaking" && `Resposta: ${agentResponse}`}
              {phase === "error" && `Erro: ${error}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }
);
