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
/*  Read theme primary HSL and build harmonious palettes               */
/* ------------------------------------------------------------------ */
function getThemeHSL(): [number, number, number] {
  if (typeof window === "undefined") return [25, 95, 53];
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  const parts = raw.split(/\s+/).map((s) => parseFloat(s));
  if (parts.length >= 3 && !parts.some(isNaN)) return [parts[0], parts[1], parts[2]];
  return [25, 95, 53];
}

function hsl(h: number, s: number, l: number) { return `hsl(${h}, ${s}%, ${l}%)`; }
function hsla(h: number, s: number, l: number, a: number) { return `hsla(${h}, ${s}%, ${l}%, ${a})`; }

function usePhaseColors(phase: VoiceAgentPhase, isBooting: boolean) {
  const effectivePhase = isBooting ? "booting" : phase;
  const [baseHSL, setBaseHSL] = useState<[number, number, number]>([25, 95, 53]);

  useEffect(() => {
    setBaseHSL(getThemeHSL());
    // Re-read on theme change (MutationObserver on <html> style/class)
    const obs = new MutationObserver(() => setBaseHSL(getThemeHSL()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    const [h, s, l] = baseHSL;
    // Rosa + Violeta accent palette for harmony
    const rosa = 330;   // pink-rose hue
    const violeta = 270; // violet hue
    const magenta = 300; // magenta bridge between rosa and violeta
    const lavanda = 285; // soft lavender

    switch (effectivePhase) {
      case "listening":
        return {
          primary: hsl(h, s, l), secondary: hsl(rosa, 80, 65), accent: hsl(violeta, 70, 60),
          glow1: hsla(h, s, l, 0.5), glow2: hsla(rosa, 75, 60, 0.4),
          particles: [hsl(h, s, l), hsl(rosa, 85, 65), hsl(rosa, 75, 75), hsl(violeta, 70, 60), hsl(violeta, 65, 72), hsl(magenta, 80, 68)],
        };
      case "processing":
        return {
          primary: hsl(violeta, 75, 58), secondary: hsl(rosa, 80, 62), accent: hsl(magenta, 78, 65),
          glow1: hsla(violeta, 75, 58, 0.5), glow2: hsla(rosa, 80, 62, 0.4),
          particles: [hsl(violeta, 75, 58), hsl(violeta, 65, 70), hsl(magenta, 78, 65), hsl(rosa, 80, 62), hsl(rosa, 70, 72), hsl(lavanda, 65, 70)],
        };
      case "speaking":
        return {
          primary: hsl(rosa, 82, 62), secondary: hsl(h, s, l), accent: hsl(magenta, 75, 68),
          glow1: hsla(rosa, 82, 62, 0.5), glow2: hsla(violeta, 70, 58, 0.35),
          particles: [hsl(rosa, 82, 62), hsl(rosa, 75, 72), hsl(magenta, 75, 68), hsl(h, s, l), hsl(violeta, 65, 65), hsl(lavanda, 60, 75)],
        };
      case "error":
        return {
          primary: hsl(0, 75, 55), secondary: hsl(330, 70, 50), accent: hsl(0, 70, 65),
          glow1: hsla(0, 75, 55, 0.45), glow2: hsla(330, 70, 50, 0.3),
          particles: [hsl(0, 75, 55), hsl(0, 70, 65), hsl(0, 60, 75), hsl(330, 70, 50)],
        };
      case "booting":
        return {
          primary: hsl(h, s, l), secondary: hsl(violeta, 65, 62), accent: hsl(rosa, 70, 68),
          glow1: hsla(h, s, l, 0.4), glow2: hsla(violeta, 65, 62, 0.35),
          particles: [hsl(h, s, l), hsl(rosa, 70, 68), hsl(rosa, 60, 78), hsl(violeta, 65, 62), hsl(violeta, 55, 72)],
        };
      default:
        return {
          primary: hsl(h, s, l), secondary: hsl(rosa, 75, 65), accent: hsl(violeta, 65, 60),
          glow1: hsla(h, s, l, 0.35), glow2: hsla(rosa, 70, 62, 0.25),
          particles: [hsl(h, s, l), hsl(rosa, 75, 65), hsl(rosa, 65, 75), hsl(violeta, 65, 60), hsl(violeta, 55, 72)],
        };
    }
  }, [effectivePhase, baseHSL]);
}

/* ------------------------------------------------------------------ */
/*  Flowing Wave Ring — SVG animated wave loops                        */
/* ------------------------------------------------------------------ */
function FlowingWaveRing({ radius, color, speed, amplitude, waves, opacity, strokeWidth = 1.5, reverse = false }: {
  radius: number; color: string; speed: number; amplitude: number; waves: number;
  opacity: number; strokeWidth?: number; reverse?: boolean;
}) {
  const paths = useMemo(() => {
    return Array.from({ length: waves }).map((_, w) => {
      const points: string[] = [];
      const segments = 100;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const waveOffset = Math.sin(angle * (3 + w) + w * 1.5) * amplitude * (1 + w * 0.25);
        const r = radius - 8 + waveOffset;
        const x = radius + r * Math.cos(angle);
        const y = radius + r * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      return points.join(" ");
    });
  }, [radius, amplitude, waves]);

  return (
    <motion.div
      className="absolute"
      style={{
        width: radius * 2,
        height: radius * 2,
        left: `calc(50% - ${radius}px)`,
        top: `calc(50% - ${radius}px)`,
      }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
    >
      <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        <defs>
          <filter id={`wave-glow-${color.replace('#', '')}-${radius}`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {paths.map((points, w) => (
          <motion.polyline
            key={w}
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#wave-glow-${color.replace('#', '')}-${radius})`}
            animate={{ opacity: [opacity * (1 - w * 0.12), opacity * 0.3, opacity * (1 - w * 0.12)] }}
            transition={{ duration: 2.5 + w * 0.6, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Particle Field — sparkling dots orbiting the core                  */
/* ------------------------------------------------------------------ */
function ParticleField({ colors, count, radius, isActive }: {
  colors: string[]; count: number; radius: number; isActive: boolean;
}) {
  const particles = useMemo(() =>
    Array.from({ length: count }).map((_, i) => ({
      angle: (i / count) * 360 + Math.random() * 25,
      dist: radius * 0.4 + Math.random() * radius * 0.65,
      size: 1 + Math.random() * 3.5,
      color: colors[i % colors.length],
      speed: 1.8 + Math.random() * 3,
      delay: Math.random() * 2.5,
    })),
    [colors, count, radius]
  );

  return (
    <>
      {particles.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = Math.cos(rad) * p.dist;
        const y = Math.sin(rad) * p.dist;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            }}
            animate={isActive ? {
              opacity: [0.15, 1, 0.15],
              scale: [0.4, 2, 0.4],
              x: [0, Math.cos(rad) * 10, 0],
              y: [0, Math.sin(rad) * 10, 0],
            } : {
              opacity: [0.1, 0.5, 0.1],
              scale: [0.7, 1.3, 0.7],
            }}
            transition={{
              duration: p.speed,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Light Rays — radial beams shooting from the core                   */
/* ------------------------------------------------------------------ */
function LightRays({ color1, color2, count, isActive }: {
  color1: string; color2: string; count: number; isActive: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const color = i % 2 === 0 ? color1 : color2;
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: 1.5,
              background: `linear-gradient(to top, ${color}, transparent)`,
              left: "50%",
              top: "50%",
              transformOrigin: "bottom center",
              transform: `rotate(${angle}deg) translateY(-50px)`,
              borderRadius: 2,
            }}
            animate={{
              opacity: isActive ? [0.05, 0.6, 0.05] : [0.03, 0.25, 0.03],
              height: isActive ? [25, 55, 25] : [12, 25, 12],
            }}
            transition={{
              duration: 1.2 + (i % 4) * 0.3,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated Orb — the spectacular visual core                         */
/* ------------------------------------------------------------------ */
function VoiceOrb({ phase, isBooting }: { phase: VoiceAgentPhase; isBooting: boolean }) {
  const effectivePhase = isBooting ? "booting" : phase;
  const colors = usePhaseColors(phase, isBooting);
  const isActive = effectivePhase === "listening" || effectivePhase === "speaking";
  const SIZE = 200;

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      {/* Deep ambient glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: SIZE + 100,
          height: SIZE + 100,
          background: `radial-gradient(circle, ${colors.glow1} 0%, ${colors.glow2} 35%, transparent 70%)`,
          filter: "blur(25px)",
        }}
        animate={isActive
          ? { scale: [1, 1.25, 0.95, 1.15, 1], opacity: [0.4, 0.75, 0.4] }
          : { scale: [1, 1.1, 1], opacity: [0.25, 0.45, 0.25] }
        }
        transition={{ duration: isActive ? 1.5 : 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Outer flowing wave */}
      <FlowingWaveRing radius={92} color={colors.primary} speed={10} amplitude={7} waves={4} opacity={0.65} strokeWidth={1.5} />
      {/* Mid flowing wave — counter rotation */}
      <FlowingWaveRing radius={78} color={colors.secondary} speed={14} amplitude={5} waves={3} opacity={0.45} strokeWidth={1.2} reverse />
      {/* Inner flowing wave */}
      <FlowingWaveRing radius={65} color={colors.accent} speed={18} amplitude={4} waves={2} opacity={0.3} strokeWidth={0.8} />

      {/* Light rays */}
      <LightRays color1={colors.primary} color2={colors.secondary} count={isActive ? 18 : 12} isActive={isActive} />

      {/* Particle field */}
      <ParticleField colors={colors.particles} count={isActive ? 35 : 20} radius={88} isActive={isActive} />

      {/* Core orb — rich multi-stop gradient */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 65,
          height: 65,
          background: `radial-gradient(circle at 30% 30%, ${colors.accent}, ${colors.primary} 50%, ${colors.secondary})`,
          boxShadow: `
            0 0 25px ${colors.glow1},
            0 0 50px ${colors.glow1},
            0 0 90px ${colors.glow2},
            inset 0 0 20px rgba(255,255,255,0.12)
          `,
        }}
        animate={isActive
          ? { scale: [1, 1.14, 0.9, 1.08, 1] }
          : effectivePhase === "processing" || effectivePhase === "booting"
            ? { scale: [1, 1.09, 1] }
            : { scale: [1, 1.04, 1] }
        }
        transition={{ duration: isActive ? 0.8 : 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core white highlight */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 32,
          height: 32,
          background: "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.35), rgba(255,255,255,0.03) 65%, transparent)",
        }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.85, 1.15, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Accent ring — subtle spinning border */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 52,
          height: 52,
          border: `1px solid ${colors.secondary}30`,
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3], rotate: [0, 180, 360] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Processing spinner */}
      {(effectivePhase === "processing" || effectivePhase === "booting") && (
        <motion.div className="absolute flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Loader2 className="h-6 w-6 text-white/80 animate-spin" />
        </motion.div>
      )}

      {/* Speaking icon */}
      {effectivePhase === "speaking" && (
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
        >
          <Volume2 className="h-6 w-6 text-white/90" />
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spectrum Waveform — brilliant animated bars                        */
/* ------------------------------------------------------------------ */
function SpectrumWaveform({ phase, isBooting }: { phase: VoiceAgentPhase; isBooting: boolean }) {
  const colors = usePhaseColors(phase, isBooting);
  const isActive = phase === "listening" || phase === "speaking" || isBooting;
  const barCount = 15;

  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: barCount }).map((_, i) => {
        const center = (barCount - 1) / 2;
        const distFromCenter = Math.abs(i - center) / center;
        const maxH = isActive ? 26 - distFromCenter * 12 : 10 - distFromCenter * 5;
        const minH = 3;
        const color = i % 3 === 0 ? colors.primary : i % 3 === 1 ? colors.secondary : colors.accent;

        return (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: 2.5,
              background: `linear-gradient(to top, ${color}, ${colors.accent})`,
              boxShadow: `0 0 6px ${color}50`,
            }}
            animate={{ height: [minH, maxH, minH] }}
            transition={{
              duration: isActive ? 0.35 + Math.random() * 0.25 : 1 + Math.random() * 0.5,
              repeat: Infinity,
              delay: i * 0.05,
              ease: "easeInOut",
            }}
          />
        );
      })}
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
            {/* Glass backdrop */}
            <div
              className="absolute inset-0 backdrop-blur-md"
              style={{ background: "rgba(5,5,15,0.15)" }}
              onClick={onClose}
            />

            {/* Centered card */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
                className="flex flex-col items-center gap-4 max-w-xs w-full px-6 py-7 rounded-3xl border border-white/10 bg-[rgba(10,10,20,0.88)] shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto"
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
                  {(phase === "listening" || phase === "speaking" || showBooting) && (
                    <motion.div
                      key="spectrum"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <SpectrumWaveform phase={phase} isBooting={showBooting} />
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
                      className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 text-center"
                    >
                      <p className="text-sm text-red-300">{error}</p>
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
