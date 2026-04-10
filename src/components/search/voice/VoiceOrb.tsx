import { motion } from "framer-motion";
import { Volume2, Mic, Loader2, Sparkles } from "lucide-react";
import type { VoiceAgentPhase } from "@/hooks/useVoiceAgent";
import { usePhaseColors } from "./usePhaseColors";
import { FlowingWaveRing, ParticleField, LightRays } from "./VoiceVisualEffects";

export function VoiceOrb({ phase, isBooting }: { phase: VoiceAgentPhase; isBooting: boolean }) {
  const effectivePhase = isBooting ? "booting" : phase;
  const colors = usePhaseColors(phase, isBooting);
  const isActive = effectivePhase === "listening" || effectivePhase === "speaking";
  const SIZE = 210;

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      {/* Deep ambient glow — double-layer for richness */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: SIZE + 120,
          height: SIZE + 120,
          background: `radial-gradient(circle, ${colors.glow1} 0%, ${colors.glow2} 30%, transparent 65%)`,
          filter: "blur(30px)",
        }}
        animate={isActive
          ? { scale: [1, 1.3, 0.92, 1.18, 1], opacity: [0.35, 0.8, 0.35] }
          : { scale: [1, 1.12, 1], opacity: [0.2, 0.4, 0.2] }
        }
        transition={{ duration: isActive ? 1.2 : 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary ambient — cooler hue offset */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: SIZE + 80,
          height: SIZE + 80,
          background: `radial-gradient(circle, ${colors.glow2} 0%, transparent 60%)`,
          filter: "blur(40px)",
        }}
        animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.15, 0.3, 0.15], rotate: [0, 180, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Outer flowing wave */}
      <FlowingWaveRing radius={96} color={colors.primary} speed={9} amplitude={8} waves={4} opacity={0.6} strokeWidth={1.8} />
      {/* Mid flowing wave — counter rotation */}
      <FlowingWaveRing radius={80} color={colors.secondary} speed={13} amplitude={6} waves={3} opacity={0.4} strokeWidth={1.3} reverse />
      {/* Inner flowing wave */}
      <FlowingWaveRing radius={66} color={colors.accent} speed={17} amplitude={4} waves={2} opacity={0.28} strokeWidth={0.9} />

      {/* Light rays */}
      <LightRays color1={colors.primary} color2={colors.secondary} count={isActive ? 20 : 14} isActive={isActive} />

      {/* Particle field */}
      <ParticleField colors={colors.particles} count={isActive ? 40 : 22} radius={92} isActive={isActive} />

      {/* Core orb — rich multi-stop gradient with glass-like inner highlight */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 72,
          height: 72,
          background: `radial-gradient(circle at 35% 30%, ${colors.accent}, ${colors.primary} 45%, ${colors.secondary} 90%)`,
          boxShadow: `
            0 0 30px ${colors.glow1},
            0 0 60px ${colors.glow1},
            0 0 100px ${colors.glow2},
            inset 0 0 25px rgba(255,255,255,0.1)
          `,
        }}
        animate={isActive
          ? { scale: [1, 1.16, 0.88, 1.1, 1] }
          : effectivePhase === "processing" || effectivePhase === "booting"
            ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
            : { scale: [1, 1.05, 1] }
        }
        transition={{ duration: isActive ? 0.7 : 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Glass highlight — top-left specular */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 36,
          height: 36,
          background: "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.4), rgba(255,255,255,0.02) 60%, transparent)",
        }}
        animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.82, 1.18, 0.82] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Phase icon overlay with animated entrance */}
      {effectivePhase === "listening" && (
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
          animate={{ opacity: 1, scale: [1, 1.12, 1], rotate: 0 }}
          transition={{ scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 }, rotate: { duration: 0.4 } }}
        >
          <Mic className="h-6 w-6 text-white drop-shadow-lg" />
        </motion.div>
      )}

      {effectivePhase === "speaking" && (
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
        >
          <Volume2 className="h-6 w-6 text-white drop-shadow-lg" />
        </motion.div>
      )}

      {effectivePhase === "processing" && (
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, rotate: 360 }}
          transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.3 } }}
        >
          <Loader2 className="h-6 w-6 text-white/80 drop-shadow-lg" />
        </motion.div>
      )}

      {(effectivePhase === "idle" || effectivePhase === "booting") && (
        <motion.div
          className="absolute flex items-center justify-center"
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles className="h-5 w-5 text-white/70 drop-shadow-lg" />
        </motion.div>
      )}
    </div>
  );
}
