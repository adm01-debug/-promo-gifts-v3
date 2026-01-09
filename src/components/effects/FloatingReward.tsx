import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Star, Zap, Trophy, Gift, Flame, Sparkles } from "lucide-react";

type RewardType = "xp" | "coins" | "streak" | "trophy" | "gift" | "level";

interface FloatingRewardProps {
  show: boolean;
  value: string | number;
  type?: RewardType;
  label?: string;
  onComplete?: () => void;
}

const rewardConfig: Record<RewardType, { 
  icon: typeof Star; 
  color: string; 
  bgColor: string;
  glowColor: string;
  prefix: string;
  suffix: string;
}> = {
  xp: {
    icon: Zap,
    color: "text-xp-foreground",
    bgColor: "bg-xp",
    glowColor: "hsl(var(--xp))",
    prefix: "+",
    suffix: " XP",
  },
  coins: {
    icon: Coins,
    color: "text-coins-foreground",
    bgColor: "bg-coins",
    glowColor: "hsl(var(--coins))",
    prefix: "+",
    suffix: "",
  },
  streak: {
    icon: Flame,
    color: "text-streak-foreground",
    bgColor: "bg-streak",
    glowColor: "hsl(var(--streak))",
    prefix: "",
    suffix: " dias",
  },
  trophy: {
    icon: Trophy,
    color: "text-rank-gold-foreground",
    bgColor: "bg-rank-gold",
    glowColor: "hsl(var(--rank-gold))",
    prefix: "",
    suffix: "",
  },
  gift: {
    icon: Gift,
    color: "text-primary-foreground",
    bgColor: "bg-primary",
    glowColor: "hsl(var(--primary))",
    prefix: "",
    suffix: "",
  },
  level: {
    icon: Star,
    color: "text-orange-foreground",
    bgColor: "bg-orange",
    glowColor: "hsl(var(--orange))",
    prefix: "Nível ",
    suffix: "!",
  },
};

export function FloatingReward({
  show,
  value,
  type = "xp",
  label,
  onComplete,
}: FloatingRewardProps) {
  const config = rewardConfig[type];
  const Icon = config.icon;
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (show) {
      setHasAnimated(false);
      const timer = setTimeout(() => {
        setHasAnimated(true);
        onComplete?.();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && !hasAnimated && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop blur */}
          <motion.div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Main reward container */}
          <motion.div
            className="relative flex flex-col items-center gap-4"
            initial={{ scale: 0, y: 50 }}
            animate={{ 
              scale: [0, 1.15, 1],
              y: [50, 0, 0],
            }}
            exit={{ 
              scale: 0.8,
              y: -100,
              opacity: 0,
            }}
            transition={{
              duration: 0.6,
              ease: [0.175, 0.885, 0.32, 1.275],
            }}
          >
            {/* Sparkle particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{ 
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0],
                  x: Math.cos((i / 8) * Math.PI * 2) * (80 + Math.random() * 40),
                  y: Math.sin((i / 8) * Math.PI * 2) * (80 + Math.random() * 40),
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.2 + i * 0.08,
                  ease: "easeOut",
                }}
              >
                <Sparkles 
                  className="w-5 h-5"
                  style={{ color: config.glowColor }}
                />
              </motion.div>
            ))}

            {/* Expanding ring effect */}
            <motion.div
              className="absolute rounded-full"
              style={{
                border: `3px solid ${config.glowColor}`,
              }}
              initial={{ width: 0, height: 0, opacity: 1 }}
              animate={{ 
                width: [0, 200, 250],
                height: [0, 200, 250],
                opacity: [1, 0.5, 0],
              }}
              transition={{
                duration: 1,
                delay: 0.3,
                ease: "easeOut",
              }}
            />

            {/* Glow background */}
            <motion.div
              className="absolute w-32 h-32 rounded-full blur-3xl"
              style={{ backgroundColor: config.glowColor }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Main badge */}
            <motion.div
              className={`relative flex flex-col items-center gap-3 px-8 py-6 rounded-2xl ${config.bgColor} shadow-2xl`}
              style={{
                boxShadow: `0 0 40px ${config.glowColor}40, 0 20px 60px ${config.glowColor}30`,
              }}
              animate={{
                boxShadow: [
                  `0 0 40px ${config.glowColor}40, 0 20px 60px ${config.glowColor}30`,
                  `0 0 60px ${config.glowColor}60, 0 20px 80px ${config.glowColor}50`,
                  `0 0 40px ${config.glowColor}40, 0 20px 60px ${config.glowColor}30`,
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Icon with bounce animation */}
              <motion.div
                className="p-3 rounded-full bg-white/20"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.4,
                  repeat: 2,
                }}
              >
                <Icon className={`h-10 w-10 ${config.color}`} />
              </motion.div>

              {/* Value display */}
              <motion.div
                className={`font-display text-4xl font-bold ${config.color}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                {config.prefix}{value}{config.suffix}
              </motion.div>

              {/* Optional label */}
              {label && (
                <motion.p
                  className={`text-sm font-medium ${config.color} opacity-90 text-center max-w-[200px]`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {label}
                </motion.p>
              )}
            </motion.div>

            {/* Rising particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className={`absolute w-2 h-2 rounded-full ${config.bgColor}`}
                initial={{ 
                  opacity: 0.8,
                  scale: 0,
                  x: (Math.random() - 0.5) * 100,
                  y: 60,
                }}
                animate={{ 
                  opacity: [0.8, 0.6, 0],
                  scale: [0, 1, 0.5],
                  y: [60, -80 - Math.random() * 60],
                  x: (Math.random() - 0.5) * 150,
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.5 + i * 0.1,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook para gerenciar fila de animações
export function useRewardQueue() {
  const [queue, setQueue] = useState<Array<Omit<FloatingRewardProps, 'show' | 'onComplete'> & { id: string }>>([]);
  const [current, setCurrent] = useState<(Omit<FloatingRewardProps, 'show' | 'onComplete'> & { id: string }) | null>(null);

  const addReward = (reward: Omit<FloatingRewardProps, 'show' | 'onComplete'>) => {
    const id = `reward-${Date.now()}-${Math.random()}`;
    setQueue(prev => [...prev, { ...reward, id }]);
  };

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  const handleComplete = () => {
    setCurrent(null);
  };

  return {
    addReward,
    currentReward: current,
    showReward: current !== null,
    handleComplete,
    hasRewards: queue.length > 0 || current !== null,
  };
}
