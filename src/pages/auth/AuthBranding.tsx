/**
 * Left-side branding panel for Auth page — extracted for modularity
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Gift, Package, Factory, SlidersHorizontal, Brain, Rocket } from "lucide-react";

interface RocketData { id: number; left: number; size: number; duration: number; rotation: number; scale: number; }

export const ContinuousRockets = React.memo(() => {
  const [rockets, setRockets] = useState<RocketData[]>([]);
  const nextIdRef = useRef(0);

  const spawnRocket = useCallback((isInitial = false) => {
    // Check for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = nextIdRef.current++;
    
    const left = 5 + Math.random() * 90;
    const size = 20 + Math.random() * 35;
    const duration = isInitial 
      ? (1.5 + Math.random() * 1.5) 
      : (2.2 + Math.random() * 2.8);
    
    const rotationOffset = -6 + Math.random() * 12;
    const scale = 0.8 + Math.random() * 0.4;

    const rocket: RocketData = { 
      id, left, size, duration, rotation: rotationOffset, scale 
    };
    
    setRockets((prev) => [...prev, rocket]);
    
    setTimeout(() => {
      setRockets((prev) => prev.filter((r) => r.id !== id));
    }, (duration + 0.5) * 1000);
  }, []);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    // Initial burst
    const delays = [0, 200, 500, 900, 1400, 2000, 2800];
    const timers = delays.map(d => setTimeout(() => spawnRocket(true), d));

    // Sustained cycle
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') spawnRocket();
    }, 2800);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [spawnRocket]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1] motion-reduce:hidden" aria-hidden="true">
      {rockets.map((r) => (
        <div
          key={r.id}
          className="absolute bottom-0"
          style={{
            left: `${r.left}%`,
            animation: `rocketLaunch ${r.duration}s ease-out forwards`,
            willChange: "transform, opacity",
          }}
        >
          <div style={{ transform: `scale(${r.scale}) rotate(${r.rotation}deg)` }}>
            <div 
              className="relative animate-rocket-shake"
              style={{ 
                animation: "rocketShake 0.15s ease-in-out infinite",
              }}
            >
              <Rocket
                className="-rotate-45 text-orange"
                style={{
                  width: r.size,
                  height: r.size,
                  filter: "drop-shadow(0 0 12px rgba(251, 146, 60, 0.6))",
                }}
              />
            </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-70"
            style={{
              top: `${r.size * 0.7}px`,
              width: `${r.size * 0.3}px`,
              height: `${r.size * 1.2}px`,
              animation: "flameTrail 0.3s ease-in-out infinite alternate",
              background: "linear-gradient(to bottom, #FB923C, #FBBF24, transparent)",
              zIndex: -1,
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-40"
            style={{
              top: `${r.size * 0.8}px`,
              width: `${r.size * 0.15}px`,
              height: `${r.size * 1.8}px`,
              animation: "flameTrail 0.2s ease-in-out infinite alternate-reverse",
              background: "linear-gradient(to bottom, #FB923C, transparent)",
              zIndex: -1,
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-orange/10"
            style={{
              top: `${r.size}px`,
              width: `${r.size * 2}px`,
              height: `${r.size * 2}px`,
              animation: "smokeRise 2s ease-out forwards",
              filter: "blur(12px)",
              zIndex: -2,
            }}
          />
        </div>
      </div>
      ))}
    </div>
  );
});

const BackgroundRockets = React.memo(() => {
  // 4 foguetes decorativos de tamanhos diferentes subindo no fundo (visíveis mas suaves)
  const rockets = [
    { left: 12, size: 56, duration: 16, delay: 0,   opacity: 0.28 },
    { left: 72, size: 80, duration: 20, delay: 4,   opacity: 0.22 },
    { left: 44, size: 38, duration: 13, delay: 2,   opacity: 0.32 },
    { left: 88, size: 26, duration: 11, delay: 7,   opacity: 0.38 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[0] motion-reduce:hidden" aria-hidden="true">
      {rockets.map((r, i) => (
        <div
          key={`bg-rocket-${i}`}
          className="absolute bottom-[-10%]"
          style={{
            left: `${r.left}%`,
            opacity: r.opacity,
            animation: `rocketLaunch ${r.duration}s linear ${r.delay}s infinite`,
            willChange: "transform, opacity",
          }}
        >
          <div className="relative">
            <Rocket
              className="-rotate-45 text-orange"
              style={{
                width: r.size,
                height: r.size,
                filter: `drop-shadow(0 0 ${r.size * 0.4}px rgba(251, 146, 60, 0.4))`,
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{
                top: `${r.size * 0.7}px`,
                width: `${r.size * 0.35}px`,
                height: `${r.size * 1.4}px`,
                background: "linear-gradient(to bottom, #FB923C, #FBBF24, transparent)",
                filter: "blur(6px)",
                opacity: 0.6,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

const Starfield = React.memo(() => {
  return (
    <>
      {/* Camada Distante (Lenta/Desfocada) */}
      {[...Array(24)].map((_, i) => {
        const size = 1;
        const top = (i * 47 + 13) % 100;
        const left = (i * 61 + 9) % 100;
        const dur = 6 + (i % 4);
        const delay = (i * 0.5) % 4;
        return (
          <div
            key={`star-far-${i}`}
            className="absolute rounded-full bg-white opacity-10 blur-[1.5px] shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
              transform: 'translateZ(-2px)',
            }}
          />
        );
      })}

      {/* Camada Média */}
      {[...Array(32)].map((_, i) => {
        const size = 1 + (i % 2);
        const top = (i * 37 + 11) % 100;
        const left = (i * 53 + 7) % 100;
        const dur = 3 + (i % 3);
        const delay = (i * 0.4) % 3;
        return (
          <div
            key={`star-mid-${i}`}
            className="absolute rounded-full bg-white opacity-20 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
              transform: 'translateZ(-1px)',
            }}
          />
        );
      })}

      {/* Camada Próxima (Nítida) */}
      {[...Array(16)].map((_, i) => {
        const size = 1.5 + (i % 2);
        const top = (i * 29 + 17) % 100;
        const left = (i * 41 + 5) % 100;
        const dur = 2 + (i % 2);
        const delay = (i * 0.3) % 2;
        return (
          <div
            key={`star-near-${i}`}
            className="absolute rounded-full bg-white opacity-40 shadow-[0_0_12px_rgba(255,255,255,0.5)]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
              transform: 'translateZ(0px)',
            }}
          />
        );
      })}
    </>
  );
});

function FeatureCard({ item, index }: { item: typeof FEATURE_ITEMS[0]; index: number }) {
  const IconComponent = item.icon;
  return (
    <div 
      className="p-5 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl hover:bg-black/80 hover:border-primary/50 hover:scale-[1.02] transition-all duration-500 group opacity-0"
      style={{ 
        animation: `scale-fade-in 0.5s ease-out ${300 + index * 100}ms forwards`,
        boxShadow: '0 0 20px rgba(0,0,0,0.5)' 
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold text-white group-hover:text-primary transition-colors truncate leading-tight drop-shadow-md">{item.label}</p>
          <p className="text-[13px] font-medium text-white/80 truncate uppercase tracking-wider mt-0.5 drop-shadow-sm">{item.desc}</p>
        </div>
        <div className="w-11 h-11 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors shrink-0 shadow-inner">
          <IconComponent className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
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
      {/* Background decoration with deep space gradient */}
      <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(10,13,20,1)_0%,rgba(5,7,12,1)_100%)]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-orange/5 rounded-full blur-[100px]" />
        <Starfield />
        <BackgroundRockets />
        <ContinuousRockets />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-16 w-full">
        <div className="space-y-5 w-full max-w-lg">
          <div className="flex items-center gap-3">
            <div className="w-[53px] h-[53px] rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Gift className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-[1.85rem] font-bold text-white tracking-tight leading-none">Promo Gifts</h1>
              <p className="text-primary font-semibold uppercase tracking-[0.2em] text-xs mt-1">Plataforma de Vendas</p>
            </div>
          </div>

          <div className="space-y-3 max-w-md">
            <h2 className="text-[2.25rem] xl:text-[3rem] font-display font-bold text-white leading-[1.15] tracking-tight">
              Um Universo de Produtos, para o{" "}
              <span className="text-primary relative inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                Melhor Time das Galáxias!
              </span>
            </h2>
            <p className="text-base text-white/80 leading-relaxed font-normal drop-shadow-sm">
              Acesso ao maior mix de produtos personalizados, estoque em tempo real e técnicas de personalização. Feito para você decolar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {FEATURE_ITEMS.map((item, i) => (
              <FeatureCard key={i} item={item} index={i} />
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center gap-4 pt-6 opacity-0" style={{ animation: 'scale-fade-in 0.5s ease-out 900ms forwards' }}>
            {[
              { label: "Conexão segura", path: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
              { label: "Dados criptografados", path: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
              { label: "Infraestrutura SOC 2", path: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
            ].map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-px h-4 bg-border" />}
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.path} />
                  </svg>
                  <span>{item.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

