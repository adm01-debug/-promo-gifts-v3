import { ReactNode, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { Trash2, Edit, Star, Archive, Check, X, MoreHorizontal } from "lucide-react";

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
  threshold?: number;
  className?: string;
  disabled?: boolean;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

const defaultLeftActions: SwipeAction[] = [
  {
    id: "archive",
    icon: <Archive className="h-5 w-5" />,
    label: "Arquivar",
    color: "text-white",
    bgColor: "bg-info",
    onClick: () => {},
  },
  {
    id: "star",
    icon: <Star className="h-5 w-5" />,
    label: "Favoritar",
    color: "text-white",
    bgColor: "bg-warning",
    onClick: () => {},
  },
];

const defaultRightActions: SwipeAction[] = [
  {
    id: "edit",
    icon: <Edit className="h-5 w-5" />,
    label: "Editar",
    color: "text-white",
    bgColor: "bg-primary",
    onClick: () => {},
  },
  {
    id: "delete",
    icon: <Trash2 className="h-5 w-5" />,
    label: "Excluir",
    color: "text-white",
    bgColor: "bg-destructive",
    onClick: () => {},
  },
];

export function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
  disabled = false,
  onSwipeStart,
  onSwipeEnd,
}: SwipeActionsProps) {
  const [isOpen, setIsOpen] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  const leftActionsWidth = leftActions.length * 70;
  const rightActionsWidth = rightActions.length * 70;

  // Transform for left actions reveal
  const leftActionsOpacity = useTransform(x, [0, leftActionsWidth], [0, 1]);
  const leftActionsScale = useTransform(x, [0, leftActionsWidth], [0.8, 1]);

  // Transform for right actions reveal
  const rightActionsOpacity = useTransform(x, [-rightActionsWidth, 0], [1, 0]);
  const rightActionsScale = useTransform(x, [-rightActionsWidth, 0], [1, 0.8]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    onSwipeEnd?.();

    if (disabled) {
      x.set(0);
      return;
    }

    const { offset, velocity } = info;

    // Swipe right (reveal left actions)
    if (offset.x > threshold || (offset.x > 50 && velocity.x > 500)) {
      if (leftActions.length > 0) {
        x.set(leftActionsWidth);
        setIsOpen("left");
      } else {
        x.set(0);
      }
    }
    // Swipe left (reveal right actions)
    else if (offset.x < -threshold || (offset.x < -50 && velocity.x < -500)) {
      if (rightActions.length > 0) {
        x.set(-rightActionsWidth);
        setIsOpen("right");
      } else {
        x.set(0);
      }
    }
    // Snap back
    else {
      x.set(0);
      setIsOpen(null);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    x.set(0);
    setIsOpen(null);
  };

  const closeActions = () => {
    x.set(0);
    setIsOpen(null);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden touch-pan-y", className)}
    >
      {/* Left Actions (revealed on swipe right) */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-stretch"
          style={{
            opacity: leftActionsOpacity,
            scale: leftActionsScale,
          }}
        >
          {leftActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center w-[70px] gap-1",
                action.bgColor,
                action.color
              )}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Right Actions (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{
            opacity: rightActionsOpacity,
            scale: rightActionsScale,
          }}
        >
          {rightActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center w-[70px] gap-1",
                action.bgColor,
                action.color
              )}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{
          left: rightActions.length > 0 ? -rightActionsWidth : 0,
          right: leftActions.length > 0 ? leftActionsWidth : 0,
        }}
        dragElastic={0.1}
        style={{ x }}
        onDragStart={onSwipeStart}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-card cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>

      {/* Tap to close overlay */}
      {isOpen && (
        <div
          className="absolute inset-0 z-20 bg-transparent"
          onClick={closeActions}
        />
      )}
    </div>
  );
}

// Preset action configurations
export const swipeActionPresets = {
  delete: {
    id: "delete",
    icon: <Trash2 className="h-5 w-5" />,
    label: "Excluir",
    color: "text-white",
    bgColor: "bg-destructive",
  },
  edit: {
    id: "edit",
    icon: <Edit className="h-5 w-5" />,
    label: "Editar",
    color: "text-white",
    bgColor: "bg-primary",
  },
  archive: {
    id: "archive",
    icon: <Archive className="h-5 w-5" />,
    label: "Arquivar",
    color: "text-white",
    bgColor: "bg-info",
  },
  star: {
    id: "star",
    icon: <Star className="h-5 w-5" />,
    label: "Favoritar",
    color: "text-white",
    bgColor: "bg-warning",
  },
  complete: {
    id: "complete",
    icon: <Check className="h-5 w-5" />,
    label: "Concluir",
    color: "text-white",
    bgColor: "bg-success",
  },
};
