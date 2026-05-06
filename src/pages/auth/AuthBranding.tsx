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
  // 6 foguetes decorativos bem visíveis subindo no fundo
  const rockets = [
    { left: 10, size: 70, duration: 14, delay: 0,    opacity: 0.55 },
    { left: 28, size: 44, duration: 11, delay: 3,    opacity: 0.65 },
    { left: 48, size: 90, duration: 18, delay: 1.5,  opacity: 0.45 },
    { left: 66, size: 38, duration: 9,  delay: 5,    opacity: 0.7  },
    { left: 82, size: 60, duration: 13, delay: 2.5,  opacity: 0.55 },
    { left: 94, size: 32, duration: 8,  delay: 6.5,  opacity: 0.75 },
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
                filter: `drop-shadow(0 0 ${r.size * 0.5}px rgba(251, 146, 60, 0.7))`,
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{
                top: `${r.size * 0.7}px`,
                width: `${r.size * 0.4}px`,
                height: `${r.size * 1.6}px`,
                background: "linear-gradient(to bottom, #FB923C, #FBBF24, transparent)",
                filter: "blur(4px)",
                opacity: 0.85,
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Camada Distante — 60 estrelas (Sincronizadas com BackgroundRockets longos) */}
      {[...Array(60)].map((_, i) => {
        const size = 1 + (i % 2);
        const top = (i * 47 + 13) % 100;
        const left = (i * 61 + 9) % 100;
        // Durations matching slower background rockets (14-18s)
        const dur = 12 + (i % 6); 
        const delay = (i * 0.7) % 10;
        return (
          <div
            key={`star-far-${i}`}
            className="absolute rounded-full bg-white blur-[1px] shadow-[0_0_10px_rgba(255,255,255,0.4)]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              "--star-base-opacity": "0.3",
              animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
            } as any}
          />
        );
      })}

      {/* Camada Média — 80 estrelas (Sincronizadas com BackgroundRockets médios) */}
      {[...Array(80)].map((_, i) => {
        const size = 1.5 + (i % 2);
        const top = (i * 37 + 11) % 100;
        const left = (i * 53 + 7) % 100;
        // Durations matching mid background rockets (8-11s)
        const dur = 7 + (i % 5);
        const delay = (i * 0.4) % 6;
        return (
          <div
            key={`star-mid-${i}`}
            className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              "--star-base-opacity": "0.5",
              animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
            } as any}
          />
        );
      })}

      {/* Camada Próxima Brilhante — 40 estrelas (Sincronizadas com ContinuousRockets rápidos) */}
      {[...Array(40)].map((_, i) => {
        const size = 2 + (i % 2);
        const top = (i * 29 + 17) % 100;
        const left = (i * 41 + 5) % 100;
        // Durations matching fast launch rockets (2.5-5s)
        const dur = 2.5 + (i % 3);
        const delay = (i * 0.2) % 3;
        return (
          <div
            key={`star-near-${i}`}
            className="absolute rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.8)]"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              top: `${top}%`,
              left: `${left}%`,
              "--star-base-opacity": "0.8",
              animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
            } as any}
          />
        );
      })}
    </div>
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

/**
 * Fundo espacial unificado — cobre TODA a tela de login (sem divisão no meio).
 * Renderizado uma vez no topo do <Auth/>, antes do branding e do form.
 */
export function AuthSpaceBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0A0D14] pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_50%,rgba(13,17,26,1)_0%,rgba(5,7,12,1)_100%)]" />
      <div 
        className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_30%_center,rgba(251,146,60,0.12)_0%,transparent_75%)]" 
        style={{ animation: 'space-shimmer 8s ease-in-out infinite' }}
      />
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange/5 rounded-full blur-[150px]" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-orange/5 rounded-full blur-[100px]" />
      <Starfield />
      <BackgroundRockets />
      <ContinuousRockets />
    </div>
  );
}

export function AuthBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative">
      {/* Fundo espacial agora vive no Auth.tsx (full screen). Aqui só o conteúdo. */}

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

