/**
 * Left-side branding panel for Auth page — Bold & Vivid edition (no shadows)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Gift, Package, Factory, SlidersHorizontal, Brain, Rocket } from "lucide-react";

interface RocketData { id: number; left: number; size: number; duration: number; rotation: number; scale: number; }

export const ContinuousRockets = React.memo(() => {
  const [rockets, setRockets] = useState<RocketData[]>([]);
  const nextIdRef = useRef(0);

  const spawnRocket = useCallback((isInitial = false) => {
    const id = nextIdRef.current++;
    const left = 5 + Math.random() * 90;
    const size = 20 + Math.random() * 35;
    const duration = isInitial ? (1.5 + Math.random() * 1.5) : (2.2 + Math.random() * 2.8);
    const rotationOffset = -6 + Math.random() * 12;
    const scale = 0.8 + Math.random() * 0.4;
    const rocket: RocketData = { id, left, size, duration, rotation: rotationOffset, scale };
    setRockets((prev) => [...prev, rocket]);
    setTimeout(() => setRockets((prev) => prev.filter((r) => r.id !== id)), (duration + 0.5) * 1000);
  }, []);

  useEffect(() => {
    const delays = [0, 200, 500, 900, 1400, 2000, 2800];
    const timers = delays.map(d => setTimeout(() => spawnRocket(true), d));
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') spawnRocket();
    }, 2800);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [spawnRocket]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]" aria-hidden="true">
      {rockets.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-0"
          style={{ left: `${r.left}%`, animation: `rocketLaunch ${r.duration}s ease-out forwards`, willChange: "transform, opacity" }}
        >
          <div style={{ transform: `scale(${r.scale}) rotate(${r.rotation}deg)` }}>
            <div className="relative" style={{ animation: "rocketShake 0.15s ease-in-out infinite" }}>
              <Rocket
                className="-rotate-45 text-orange"
                style={{ width: r.size, height: r.size }}
              />
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-80"
              style={{
                top: `${r.size * 0.7}px`,
                width: `${r.size * 0.3}px`,
                height: `${r.size * 1.2}px`,
                animation: "flameTrail 0.3s ease-in-out infinite alternate",
                background: "linear-gradient(to bottom, #FB923C, #FBBF24, transparent)",
                zIndex: -1,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

const Starfield = React.memo(() => (
  <>
    {[...Array(32)].map((_, i) => {
      const size = 1 + (i % 3);
      const top = (i * 37 + 11) % 100;
      const left = (i * 53 + 7) % 100;
      const dur = 2 + (i % 5);
      const delay = (i * 0.4) % 3;
      return (
        <div
          key={`star-${i}`}
          className="absolute rounded-full bg-white/40"
          style={{ width: `${size}px`, height: `${size}px`, top: `${top}%`, left: `${left}%`, animation: `twinkle ${dur}s ease-in-out ${delay}s infinite` }}
        />
      );
    })}
  </>
));

function FeatureCard({ item, index }: { item: typeof FEATURE_ITEMS[0]; index: number }) {
  const IconComponent = item.icon;
  return (
    <div
      className="p-4 rounded-xl bg-white/5 border-2 border-white/10 hover:bg-primary/15 hover:border-primary transition-all duration-300 group opacity-0"
      style={{ animation: `scale-fade-in 0.5s ease-out ${300 + index * 100}ms forwards` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-primary truncate leading-tight">{item.label}</p>
          <p className="text-[11px] font-medium text-white/60 truncate uppercase tracking-wider mt-0.5">{item.desc}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <IconComponent className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}

const FEATURE_ITEMS = [
  { label: "+20.000", desc: "Produtos", icon: Package },
  { label: "+100", desc: "Fornecedores", icon: Factory },
  { label: "Filtros", desc: "Avançados", icon: SlidersHorizontal },
  { label: "IA", desc: "Assistente Pessoal", icon: Brain },
];

export function AuthBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-[#0A0D14] relative overflow-hidden">
      {/* Background decoration — solid vivid blobs, no blur shadows */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary/25" />
        <div className="absolute -bottom-40 -right-20 w-[480px] h-[480px] rounded-full bg-primary/15" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-orange/10" />
        <Starfield />
        <ContinuousRockets />
      </div>

      <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-16 w-full">
        <div className="space-y-6 w-full max-w-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Gift className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white tracking-tight leading-none">Promo Gifts</h1>
              <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Plataforma de Vendas</p>
            </div>
          </div>

          <div className="space-y-3 max-w-md">
            <h2 className="text-3xl xl:text-[2.5rem] font-display font-bold text-white leading-[1.15] tracking-tight">
              Um Universo de Produtos, para o{" "}
              <span className="text-primary relative inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Melhor Time das Galáxias!
              </span>
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Acesso ao maior mix de produtos personalizados, estoque em tempo real e técnicas de personalização. Feito para você decolar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {FEATURE_ITEMS.map((item, i) => (
              <FeatureCard key={i} item={item} index={i} />
            ))}
          </div>

          <div className="flex items-center gap-4 pt-6 opacity-0" style={{ animation: 'scale-fade-in 0.5s ease-out 900ms forwards' }}>
            {[
              { label: "Conexão segura", path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
              { label: "Dados criptografados", path: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
              { label: "Infraestrutura SOC 2", path: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-4 bg-white/20" />}
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.path} />
                  </svg>
                  <span className="font-medium">{item.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
