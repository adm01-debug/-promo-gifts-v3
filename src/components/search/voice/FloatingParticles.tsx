import React, { useRef, useEffect, useCallback } from "react";
import type { VoiceAgentPhase } from "@/hooks/useVoiceAgent";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  life: number;
  maxLife: number;
}

interface FloatingParticlesProps {
  phase: VoiceAgentPhase;
  isBooting: boolean;
}

const PHASE_CONFIG: Record<string, { count: number; speed: number; hueRange: [number, number]; sizeRange: [number, number] }> = {
  idle: { count: 20, speed: 0.3, hueRange: [220, 260], sizeRange: [1, 2.5] },
  listening: { count: 40, speed: 0.6, hueRange: [250, 290], sizeRange: [1.5, 3.5] },
  processing: { count: 35, speed: 0.8, hueRange: [270, 310], sizeRange: [1, 3] },
  speaking: { count: 50, speed: 0.5, hueRange: [200, 270], sizeRange: [1.5, 4] },
  error: { count: 25, speed: 0.4, hueRange: [0, 30], sizeRange: [1, 2.5] },
  booting: { count: 15, speed: 0.2, hueRange: [220, 260], sizeRange: [1, 2] },
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export const FloatingParticles: React.FC<FloatingParticlesProps> = React.memo(({ phase, isBooting }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const configKey = isBooting ? "booting" : phase;

  const createParticle = useCallback((w: number, h: number, cfg: typeof PHASE_CONFIG["idle"]): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 0.5 + 0.5) * cfg.speed;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: lerp(cfg.sizeRange[0], cfg.sizeRange[1], Math.random()),
      opacity: Math.random() * 0.4 + 0.1,
      hue: lerp(cfg.hueRange[0], cfg.hueRange[1], Math.random()),
      life: 0,
      maxLife: 200 + Math.random() * 300,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };
    resize();

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const cfg = PHASE_CONFIG[configKey] || PHASE_CONFIG.idle;

      ctx.clearRect(0, 0, w, h);

      // Ensure particle count matches config
      while (particlesRef.current.length < cfg.count) {
        particlesRef.current.push(createParticle(w, h, cfg));
      }
      if (particlesRef.current.length > cfg.count + 10) {
        particlesRef.current.splice(cfg.count);
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Gentle drift
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;

        // Fade in/out based on life
        const lifeRatio = p.life / p.maxLife;
        let alpha = p.opacity;
        if (lifeRatio < 0.1) alpha *= lifeRatio / 0.1;
        else if (lifeRatio > 0.8) alpha *= (1 - lifeRatio) / 0.2;

        // Wrap around edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Draw glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${p.hue}, 60%, 50%, ${alpha * 0.3})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 40%, 30%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 80%, ${alpha * 0.8})`;
        ctx.fill();

        // Respawn if life exceeded
        if (p.life >= p.maxLife) {
          particlesRef.current[i] = createParticle(w, h, cfg);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [configKey, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.7 }}
      aria-hidden="true"
    />
  );
});

FloatingParticles.displayName = "FloatingParticles";
