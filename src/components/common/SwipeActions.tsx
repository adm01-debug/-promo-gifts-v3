/**
 * SwipeActions - Ações por deslize para mobile
 * Permite revelar ações rápidas deslizando items para esquerda/direita
 */

import { useState, useRef, ReactNode } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwipeAction {
  id: string;
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface SwipeActionsProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  threshold?: number;
  onSwipeComplete?: (direction: "left" | "right", actionId: string) => void;
}

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  className,
  threshold = 80,
  onSwipeComplete,
}: SwipeActionsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeDirection, setActiveDirection] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  
  // Opacidade das ações baseada no deslocamento
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  
  // Escala das ações
  const leftScale = useTransform(x, [0, threshold], [0.8, 1]);
  const rightScale = useTransform(x, [-threshold, 0], [1, 0.8]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 20 && leftActions.length > 0) {
      setActiveDirection("left");
    } else if (info.offset.x < -20 && rightActions.length > 0) {
      setActiveDirection("right");
    } else {
      setActiveDirection(null);
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    if (Math.abs(info.offset.x) > threshold) {
      const direction = info.offset.x > 0 ? "left" : "right";
      const actions = direction === "left" ? leftActions : rightActions;
      
      if (actions.length > 0) {
        actions[0].onClick();
        onSwipeComplete?.(direction, actions[0].id);
      }
    }
    
    setActiveDirection(null);
  };

  const renderActions = (actions: SwipeAction[], side: "left" | "right") => {
    if (actions.length === 0) return null;
    
    const opacity = side === "left" ? leftOpacity : rightOpacity;
    const scale = side === "left" ? leftScale : rightScale;
    
    return (
      <motion.div
        className={cn(
          "absolute top-0 bottom-0 flex items-center gap-2 px-4",
          side === "left" ? "left-0" : "right-0"
        )}
        style={{ opacity, scale }}
      >
        {actions.map((action) => (
          <motion.button
            key={action.id}
            className={cn(
              "flex flex-col items-center justify-center px-4 py-2 rounded-xl",
              "transition-transform touch-manipulation",
              action.bgColor
            )}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span className={cn("text-lg", action.color)}>{action.icon}</span>
            <span className={cn("text-xs font-medium mt-1", action.color)}>
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>
    );
  };

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Ações da esquerda (reveladas ao deslizar para direita) */}
      {renderActions(leftActions, "left")}
      
      {/* Ações da direita (reveladas ao deslizar para esquerda) */}
      {renderActions(rightActions, "right")}
      
      {/* Conteúdo deslizável */}
      <motion.div
        className={cn(
          "relative bg-card z-10",
          isDragging && "cursor-grabbing"
        )}
        style={{ x }}
        drag="x"
        dragConstraints={{ left: rightActions.length > 0 ? -threshold * 1.5 : 0, right: leftActions.length > 0 ? threshold * 1.5 : 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
      
      {/* Indicador visual de swipe ativo */}
      {activeDirection && (
        <motion.div
          className={cn(
            "absolute inset-y-0 w-1",
            activeDirection === "left" ? "left-0 bg-success" : "right-0 bg-destructive"
          )}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
        />
      )}
    </div>
  );
}

// Componente wrapper para listas com swipe
interface SwipeableListItemProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onFavorite?: () => void;
  onShare?: () => void;
  className?: string;
}

export function SwipeableListItem({
  children,
  onEdit,
  onDelete,
  onFavorite,
  onShare,
  className,
}: SwipeableListItemProps) {
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];
  
  if (onFavorite) {
    leftActions.push({
      id: "favorite",
      icon: "❤️",
      label: "Favoritar",
      color: "text-destructive-foreground",
      bgColor: "bg-destructive",
      onClick: onFavorite,
    });
  }
  
  if (onShare) {
    leftActions.push({
      id: "share",
      icon: "📤",
      label: "Compartilhar",
      color: "text-info-foreground",
      bgColor: "bg-info",
      onClick: onShare,
    });
  }
  
  if (onEdit) {
    rightActions.push({
      id: "edit",
      icon: "✏️",
      label: "Editar",
      color: "text-primary-foreground",
      bgColor: "bg-primary",
      onClick: onEdit,
    });
  }
  
  if (onDelete) {
    rightActions.push({
      id: "delete",
      icon: "🗑️",
      label: "Excluir",
      color: "text-destructive-foreground",
      bgColor: "bg-destructive",
      onClick: onDelete,
    });
  }
  
  return (
    <SwipeActions
      leftActions={leftActions}
      rightActions={rightActions}
      className={className}
    >
      {children}
    </SwipeActions>
  );
}
