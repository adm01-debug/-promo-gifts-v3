import { useState, useRef, ReactNode, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[];
  initialSnap?: number;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  className
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  
  // Lock body scroll when open
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
  
  const handleDragEnd = (_: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    
    // Fast swipe down = close
    if (velocity > 500) {
      onClose();
      return;
    }
    
    // Fast swipe up = expand
    if (velocity < -500) {
      setCurrentSnap(snapPoints.length - 1);
      return;
    }
    
    // Otherwise snap to nearest point based on position
    const windowHeight = window.innerHeight;
    const currentPosition = 1 - (snapPoints[currentSnap] - offset / windowHeight);
    
    let nearestSnap = 0;
    let minDistance = Infinity;
    
    snapPoints.forEach((point, index) => {
      const distance = Math.abs((1 - point) - currentPosition);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSnap = index;
      }
    });
    
    // If dragged below minimum, close
    if (currentPosition > 0.7) {
      onClose();
    } else {
      setCurrentSnap(nearestSnap);
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: `${(1 - snapPoints[currentSnap]) * 100}%` }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50",
              "bg-background rounded-t-2xl shadow-2xl",
              "flex flex-col max-h-[95vh]",
              className
            )}
            style={{ touchAction: "none" }}
          >
            {/* Handle */}
            <div 
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Swipeable list item
interface SwipeableItemProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  className?: string;
}

export function SwipeableItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className
}: SwipeableItemProps) {
  const [offset, setOffset] = useState(0);
  
  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    
    if (info.offset.x > threshold || velocity > 500) {
      onSwipeRight?.();
    } else if (info.offset.x < -threshold || velocity < -500) {
      onSwipeLeft?.();
    }
    
    setOffset(0);
  };
  
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Left action (revealed on swipe right) */}
        {rightAction && (
          <div className="flex items-center justify-start px-4 bg-green-500 text-white">
            {rightAction}
          </div>
        )}
        
        {/* Right action (revealed on swipe left) */}
        {leftAction && (
          <div className="flex items-center justify-end px-4 bg-red-500 text-white ml-auto">
            {leftAction}
          </div>
        )}
      </div>
      
      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: leftAction ? -120 : 0, right: rightAction ? 120 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: offset }}
        className="relative bg-background"
        style={{ touchAction: "pan-y" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pull to refresh
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      const touch = e.touches[0];
      const startY = (e.target as HTMLElement).dataset.startY;
      if (startY) {
        const diff = touch.clientY - parseFloat(startY);
        if (diff > 0) {
          setPullDistance(Math.min(diff * 0.5, 100));
        }
      }
    }
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    (e.target as HTMLElement).dataset.startY = String(touch.clientY);
  };
  
  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };
  
  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center py-2"
        style={{ transform: `translateY(${pullDistance - 40}px)` }}
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : pullDistance * 2 }}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
        />
      </motion.div>
      
      {/* Content */}
      <motion.div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </motion.div>
    </div>
  );
}

// Drag handle for sortable items
export function DragHandle({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-center justify-center p-1 cursor-grab active:cursor-grabbing",
      "text-muted-foreground hover:text-foreground transition-colors",
      className
    )}>
      <GripVertical className="h-5 w-5" />
    </div>
  );
}
