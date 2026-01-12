/**
 * Mobile-First Components
 * Touch-optimized components for mobile experience
 */

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, Plus, ChevronDown, RefreshCw, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Bottom Sheet
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[];
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.9],
  className,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(0);
  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      if (currentSnap === 0) {
        onClose();
      } else {
        setCurrentSnap((prev) => Math.max(0, prev - 1));
      }
    } else if (velocity < -500 || offset < -100) {
      setCurrentSnap((prev) => Math.min(snapPoints.length - 1, prev + 1));
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: `${(1 - snapPoints[currentSnap]) * 100}%` }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl",
              className
            )}
          >
            {/* Handle */}
            <div className="flex justify-center p-4">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 pb-4 border-b">
                <h2 className="text-lg font-semibold">{title}</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(100vh-120px)] p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Swipeable List Item
interface SwipeAction {
  icon: ReactNode;
  label: string;
  color: string;
  action: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeComplete?: (direction: "left" | "right") => void;
  threshold?: number;
  className?: string;
}

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeComplete,
  threshold = 100,
  className,
}: SwipeableListItemProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const leftScale = useTransform(x, [0, threshold], [0.5, 1]);
  const rightScale = useTransform(x, [-threshold, 0], [1, 0.5]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.x > threshold && leftActions.length > 0) {
      leftActions[0].action();
      onSwipeComplete?.("left");
    } else if (info.offset.x < -threshold && rightActions.length > 0) {
      rightActions[0].action();
      onSwipeComplete?.("right");
    }
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left Actions */}
      {leftActions.length > 0 && (
        <motion.div
          style={{ opacity: leftOpacity, scale: leftScale }}
          className="absolute left-0 top-0 bottom-0 flex items-center px-4"
        >
          {leftActions.map((action, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 text-white"
              style={{ backgroundColor: action.color }}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Right Actions */}
      {rightActions.length > 0 && (
        <motion.div
          style={{ opacity: rightOpacity, scale: rightScale }}
          className="absolute right-0 top-0 bottom-0 flex items-center px-4"
        >
          {rightActions.map((action, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 text-white p-4 rounded"
              style={{ backgroundColor: action.color }}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightActions.length > 0 ? -150 : 0, right: leftActions.length > 0 ? 150 : 0 }}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative bg-background z-10",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pull to Refresh
interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY.current) * 0.5);
    
    if (distance > 0) {
      e.preventDefault();
      setPullDistance(Math.min(distance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("relative overflow-auto", className)}
    >
      {/* Refresh Indicator */}
      <motion.div
        style={{
          height: pullDistance,
          opacity: progress,
        }}
        className="flex items-center justify-center overflow-hidden"
      >
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: rotation }}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
        >
          <RefreshCw
            className={cn(
              "h-6 w-6",
              isRefreshing ? "text-primary" : "text-muted-foreground"
            )}
          />
        </motion.div>
      </motion.div>

      {/* Content */}
      {children}
    </div>
  );
}

// Floating Action Button
interface FABAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  icon?: ReactNode;
  actions?: FABAction[];
  onClick?: () => void;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  className?: string;
}

export function FloatingActionButton({
  icon = <Plus className="h-6 w-6" />,
  actions,
  onClick,
  position = "bottom-right",
  className,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
    "bottom-left": "bottom-6 left-6",
  };

  const handleClick = () => {
    if (actions && actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div className={cn("fixed z-40", positionClasses[position], className)}>
      {/* Expanded Actions */}
      <AnimatePresence>
        {isExpanded && actions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 space-y-3"
          >
            {actions.map((action, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 justify-end"
              >
                <span className="bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full shadow-lg"
                  onClick={() => {
                    action.onClick();
                    setIsExpanded(false);
                  }}
                >
                  {action.icon}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isExpanded ? 45 : 0 }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={handleClick}
        >
          {icon}
        </Button>
      </motion.div>
    </div>
  );
}

// Touch Ripple Effect
export function TouchRipple({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    let x: number, y: number;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onClick={handleClick}
      onTouchStart={handleClick}
    >
      {children}
      
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute rounded-full bg-current pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 50,
            height: 50,
            marginLeft: -25,
            marginTop: -25,
          }}
        />
      ))}
    </div>
  );
}

// Expandable FAB Menu
export function ExpandableFAB({
  children,
  trigger,
}: {
  children: ReactNode;
  trigger: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-16 right-0 w-64 bg-popover rounded-lg shadow-xl p-2"
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          {trigger}
        </Button>
      </motion.div>
    </div>
  );
}

// Swipe to Delete
export function SwipeToDelete({
  children,
  onDelete,
  className,
}: {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <SwipeableListItem
      rightActions={[
        {
          icon: <Trash2 className="h-5 w-5" />,
          label: "Excluir",
          color: "#ef4444",
          action: onDelete,
        },
      ]}
      className={className}
    >
      {children}
    </SwipeableListItem>
  );
}

// Swipe to Complete
export function SwipeToComplete({
  children,
  onComplete,
  className,
}: {
  children: ReactNode;
  onComplete: () => void;
  className?: string;
}) {
  return (
    <SwipeableListItem
      leftActions={[
        {
          icon: <Check className="h-5 w-5" />,
          label: "Concluir",
          color: "#22c55e",
          action: onComplete,
        },
      ]}
      className={className}
    >
      {children}
    </SwipeableListItem>
  );
}
