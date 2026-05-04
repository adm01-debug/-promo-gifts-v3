/**
 * Left-side branding panel for Auth page — extracted for modularity
 */
import React, { useState, useEffect, useRef } from "react";
import { Gift, Package, Factory, SlidersHorizontal, Brain, Rocket } from "lucide-react";

interface RocketData { id: number; left: number; size: number; duration: number; rotation: number; scale: number; }

export function ContinuousRockets() {
  const [rockets, setRockets] = useState<RocketData[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const cleanupTimers: ReturnType<typeof setTimeout>[] = [];

    function spawnRocket(isInitial = false) {
      if (!mounted) return;
      const id = nextIdRef.current++;
      
      // Variedade premium: posição, tamanho, velocidade e rotação
      const left = 5 + Math.random() * 85;
      const size = 20 + Math.random() * 30; // 20px a 50px
      const duration = isInitial 
        ? (2.0 + Math.random() * 2.0) 
        : (3.0 + Math.random() * 3.5);
      
      // Rotação sutil para parecer menos "perfeito" e mais dinâmico
      const rotationOffset = -5 + Math.random() * 10; // -5deg a +5deg
      const scale = 0.8 + Math.random() * 0.4; // 0.8x a 1.2x

      const rocket: RocketData & { rotation: number; scale: number } = { 
        id, left, size, duration, rotation: rotationOffset, scale 
      };
      
      setRockets((prev) => [...prev, rocket]);
      
      const removeTimer = setTimeout(() => {
        if (!mounted) return;
        setRockets((prev) => prev.filter((r) => r.id !== id));
      }, duration * 1000 + 600);
      
      cleanupTimers.push(removeTimer);
    }

    // Burst inicial agressivo para impacto imediato
    const initialDelays = [0, 200, 600, 1100, 1800];
    initialDelays.forEach(delay => {
      const t = setTimeout(() => spawnRocket(true), delay);
      cleanupTimers.push(t);
    });

    // Ciclo contínuo sustentável
    function scheduleNext() {
      const interval = 2000 + Math.random() * 3500;
      const t = setTimeout(() => {
        spawnRocket();
        scheduleNext();
      }, interval);
      cleanupTimers.push(t);
    }
    scheduleNext();

    return () => {
      mounted = false;
      cleanupTimers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[1]" aria-hidden="true">
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
          <div style={{ transform: `scale(${r.scale})` }}>
            <div style={{ 
              animation: "rocketShake 0.15s ease-in-out infinite",
              transform: `rotate(${r.rotation}deg)` 
            }}>
              <Rocket
                className="-rotate-45"
                style={{
                  width: r.size,
                  height: r.size,
                  color: "#FB923C",
                }}
              />
            </div>
          {/* Rastro de chamas — gradiente fixo laranja→amarelo para efeito de propulsão consistente */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-70"
            style={{
              top: `${r.size * 0.75}px`,
              width: `${r.size * 0.3}px`,
              height: `${r.size}px`,
              animation: "flameTrail 0.3s ease-in-out infinite alternate",
              background: "linear-gradient(to bottom, #FB923C, #FBBF24, transparent)",
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full opacity-40"
            style={{
              top: `${r.size}px`,
              width: `${r.size * 0.15}px`,
              height: `${r.size * 1.5}px`,
              animation: "flameTrail 0.2s ease-in-out infinite alternate-reverse",
              background: "linear-gradient(to bottom, #FB923C, transparent)",
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-muted-foreground/10"
            style={{
              top: `${r.size * 1.2}px`,
              width: `${r.size * 2}px`,
              height: `${r.size * 2}px`,
              animation: "smokeRise 2s ease-out forwards",
              filter: "blur(8px)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  { label: "+20.000", desc: "Produtos", icon: Package },
  { label: "+100", desc: "Fornecedores", icon: Factory },
  { label: "Filtros", desc: "Avançados", icon: SlidersHorizontal },
  { label: "IA", desc: "Assistente Pessoal", icon: Brain },
];

export function AuthBrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-success/5 rounded-full blur-3xl" />
        {[...Array(18)].map((_, i) => {
          const size = 1 + (i % 3); const top = (i * 37 + 11) % 100; const left = (i * 53 + 7) % 100;
          const dur = 2 + (i % 4); const delay = (i * 0.3) % 2;
          return (<div key={`star-${i}`} className="absolute rounded-full bg-foreground/30" style={{ width: `${size}px`, height: `${size}px`, top: `${top}%`, left: `${left}%`, animation: `twinkle ${dur}s ease-in-out ${delay}s infinite` }} />);
        })}
        <ContinuousRockets />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-20 w-full">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-orange flex items-center justify-center shadow-lg shadow-orange/30">
              <Gift className="h-7 w-7 text-orange-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Promo Gifts</h1>
              <p className="text-orange font-semibold uppercase tracking-widest text-sm -mt-1">Plataforma de Vendas</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <h2 className="text-4xl xl:text-5xl font-display font-bold text-foreground leading-tight">
              Um Universo de Produtos, para o{" "}
              <span className="text-orange">Melhor Time das Galáxias!</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Tenha acesso ao maior mix de produtos personalizados, consulte estoque em tempo real, visualize locais e técnicas de personalização. Feito especialmente para você decolar!!!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6">
            {FEATURES.map((item, i) => {
              const IconComponent = item.icon;
              return (
                <div key={i} className="p-4 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-lg hover:shadow-xl hover:border-orange/50 hover:scale-[1.02] transition-all duration-300 group opacity-0"
                  style={{ animation: `scale-fade-in 0.5s ease-out ${300 + i * 150}ms forwards` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-2xl font-bold text-orange">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.desc}</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-orange/15 flex items-center justify-center group-hover:bg-orange/25 transition-colors">
                      <IconComponent className="h-5 w-5 text-orange" />
                    </div>
                  </div>
                </div>
              );
            })}
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
