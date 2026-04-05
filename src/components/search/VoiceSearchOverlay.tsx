import React, { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Volume2, MessageCircle } from "lucide-react";
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

const PHASE_META: Record<VoiceAgentPhase, { title: string; subtitle: string }> = {
  idle: { title: "Assistente de Voz", subtitle: "Toque no orbe para começar" },
  listening: { title: "Ouvindo...", subtitle: "Diga o que você precisa" },
  processing: { title: "Processando...", subtitle: "IA interpretando seu comando" },
  speaking: { title: "Respondendo...", subtitle: "Ouvindo a resposta" },
  error: { title: "Erro", subtitle: "Toque para tentar novamente" },
};

/* ------------------------------------------------------------------ */
/*  Animated Orb Component — the visual core                          */
/* ------------------------------------------------------------------ */
function VoiceOrb({ phase, isBooting }: { phase: VoiceAgentPhase; isBooting: boolean }) {
  const effectivePhase = isBooting ? "booting" : phase;

  // Color config per phase
  const colors = useMemo(() => {
    switch (effectivePhase) {
      case "listening":
        return { inner: "#06b6d4", outer: "#0891b2", glow: "rgba(6,182,212,0.4)", ring: "rgba(6,182,212,0.15)" };
      case "processing":
        return { inner: "#f59e0b", outer: "#d97706", glow: "rgba(245,158,11,0.4)", ring: "rgba(245,158,11,0.15)" };
      case "speaking":
        return { inner: "#10b981", outer: "#059669", glow: "rgba(16,185,129,0.4)", ring: "rgba(16,185,129,0.15)" };
      case "error":
        return { inner: "#ef4444", outer: "#dc2626", glow: "rgba(239,68,68,0.35)", ring: "rgba(239,68,68,0.12)" };
      case "booting":
        return { inner: "#8b5cf6", outer: "#7c3aed", glow: "rgba(139,92,246,0.35)", ring: "rgba(139,92,246,0.12)" };
      default: // idle
        return { inner: "#a855f7", outer: "#7c3aed", glow: "rgba(168,85,247,0.3)", ring: "rgba(168,85,247,0.1)" };
    }
  }, [effectivePhase]);

  // Listening uses faster, more dramatic animation
  const isActive = effectivePhase === "listening" || effectivePhase === "speaking";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Outer glow rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute rounded-full"
          style={{
            width: 200 + i * 40,
            height: 200 + i * 40,
            background: `radial-gradient(circle, ${colors.ring} 0%, transparent 70%)`,
          }}
          animate={
            isActive
              ? { scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }
              : { scale: [1, 1.05, 1], opacity: [0.4, 0.15, 0.4] }
          }
          transition={{
            duration: isActive ? 1.2 : 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Particle ring — rotating dots */}
      <motion.div
        className="absolute"
        style={{ width: 180, height: 180 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * 360;
          const rad = (angle * Math.PI) / 180;
          const r = 85;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                background: i % 2 === 0 ? colors.inner : colors.outer,
                left: 90 + r * Math.cos(rad) - 2,
                top: 90 + r * Math.sin(rad) - 2,
              }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.4, 0.8] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.12,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </motion.div>

      {/* Inner orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 120,
          height: 120,
          background: `radial-gradient(circle at 35% 35%, ${colors.inner}, ${colors.outer})`,
          boxShadow: `0 0 60px ${colors.glow}, 0 0 120px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)`,
        }}
        animate={
          isActive
            ? { scale: [1, 1.08, 0.96, 1.04, 1] }
            : effectivePhase === "processing" || effectivePhase === "booting"
              ? { scale: [1, 1.06, 1] }
              : { scale: [1, 1.03, 1] }
        }
        transition={{
          duration: isActive ? 1.0 : 2.0,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner highlight/reflection */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 50,
          height: 50,
          top: 55,
          left: 60,
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.25), transparent 70%)",
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Processing spinner overlay */}
      {(effectivePhase === "processing" || effectivePhase === "booting") && (
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="h-8 w-8 text-white/70 animate-spin" />
        </motion.div>
      )}

      {/* Speaking wave icon */}
      {effectivePhase === "speaking" && (
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Volume2 className="h-8 w-8 text-white/80" />
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Waveform bars                                                      */
/* ------------------------------------------------------------------ */
function WaveformBars({ color, count = 9 }: { color: string; count?: number }) {
  return (
    <div className="flex items-center gap-1 h-8">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: [8, 28, 8] }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
          className="w-1 rounded-full"
          style={{ background: color, height: 8 }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main overlay                                                       */
/* ------------------------------------------------------------------ */
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

    const handleOrbClick = useCallback(() => {
      if (showBooting || phase === "processing") return;
      if (phase === "listening") onStopListening();
      else if (phase === "speaking") onStopSpeaking();
      else if (phase === "idle" || phase === "error") onStartListening();
    }, [phase, showBooting, onStartListening, onStopListening, onStopSpeaking]);

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
            {/* Full-screen dark backdrop */}
            <div
              className="absolute inset-0 backdrop-blur-3xl"
              style={{ background: "radial-gradient(ellipse at center, rgba(10,10,20,0.75) 0%, rgba(2,2,8,0.85) 100%)" }}
              onClick={onClose}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors"
              aria-label="Fechar assistente de voz"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Absolutely centered card */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
                className="flex flex-col items-center gap-6 max-w-md w-full px-8 py-10 rounded-3xl border border-white/10 bg-[rgba(15,15,25,0.85)] backdrop-blur-md shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto"
              >
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center"
              >
                <h2 className="text-xl font-display font-semibold text-white/90 mb-1">
                  {title}
                </h2>
                <p className="text-white/40 text-sm">{subtitle}</p>
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

              {/* Waveform bars */}
              <AnimatePresence mode="wait">
                {(phase === "listening" || showBooting) && (
                  <motion.div
                    key="waveform-listen"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <WaveformBars color={showBooting ? "#8b5cf6" : "#06b6d4"} />
                  </motion.div>
                )}
                {phase === "speaking" && (
                  <motion.div
                    key="waveform-speak"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <WaveformBars color="#10b981" count={7} />
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
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                        {phase === "listening" ? "Você está dizendo:" : "Você disse:"}
                      </p>
                      <p className="text-base font-medium text-white/90">
                        "{partialTranscript || finalTranscript}"
                        {phase === "listening" && partialTranscript && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            className="text-cyan-400"
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
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
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
                    className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-center"
                  >
                    <p className="text-sm text-red-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggestions — idle only, not booting */}
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
                    {[
                      "Quero canetas azuis baratas",
                      "Mostra mochilas ecológicas",
                      "Abre os orçamentos",
                      "Qual o produto mais vendido?",
                    ].map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => onCommandSelect?.(cmd)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs text-white/40 hover:text-white/70 border border-white/8 hover:border-white/15 transition-all cursor-pointer"
                      >
                        "{cmd}"
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ESC hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-white/20"
              >
                Pressione <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-mono border border-white/10">ESC</kbd> para fechar
              </motion.p>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-1.5 text-[10px] text-white/15"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                IA + Voz ElevenLabs
              </motion.div>
            </motion.div>
            </div>{/* end centering wrapper */}

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
