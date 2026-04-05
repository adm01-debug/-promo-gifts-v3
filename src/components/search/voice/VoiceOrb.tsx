import { motion } from "framer-motion";
import { Volume2, Mic } from "lucide-react";
import type { VoiceAgentPhase } from "@/hooks/useVoiceAgent";
import { usePhaseColors } from "./usePhaseColors";
import { FlowingWaveRing, ParticleField, LightRays } from "./VoiceVisualEffects";

export function VoiceOrb({ phase, isBooting }: { phase: VoiceAgentPhase; isBooting: boolean }) {
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

      {/* Phase icon overlay */}
      {effectivePhase === "listening" && (
        <motion.div
          className="absolute flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: [1, 1.15, 1] }}
          transition={{ scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }}
        >
          <Mic className="h-6 w-6 text-white/90" />
        </motion.div>
      )}

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
