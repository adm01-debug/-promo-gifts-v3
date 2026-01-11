import { ReactNode, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[];
  defaultSnapPoint?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  blocking?: boolean;
  className?: string;
  contentClassName?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  snapPoints = [0.5, 0.9],
  defaultSnapPoint = 0,
  showHandle = true,
  showCloseButton = true,
  blocking = true,
  className,
  contentClassName,
}: BottomSheetProps) {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(defaultSnapPoint);
  const y = useMotionValue(0);
  
  // Get window height
  const [windowHeight, setWindowHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate height based on snap point
  const sheetHeight = windowHeight * snapPoints[currentSnapPoint];
  
  // Handle background opacity based on sheet position
  const overlayOpacity = useTransform(
    y,
    [0, sheetHeight],
    [0.5, 0]
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const shouldClose = info.offset.y > 100 || info.velocity.y > 500;
      
      if (shouldClose) {
        onClose();
        return;
      }

      // Find nearest snap point
      const currentY = sheetHeight + info.offset.y;
      const heights = snapPoints.map((sp) => windowHeight * sp);
      const distances = heights.map((h, i) => ({
        index: i,
        distance: Math.abs(currentY - (windowHeight - h)),
      }));
      distances.sort((a, b) => a.distance - b.distance);
      
      setCurrentSnapPoint(distances[0].index);
      y.set(0);
    },
    [onClose, sheetHeight, snapPoints, windowHeight, y]
  );

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen && blocking) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, blocking]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {blocking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-50"
              style={{ opacity: overlayOpacity }}
            />
          )}

          {/* Sheet */}
          <motion.div
            initial={{ y: windowHeight }}
            animate={{ y: windowHeight - sheetHeight }}
            exit={{ y: windowHeight }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className={cn(
              "fixed left-0 right-0 z-50",
              "bg-card rounded-t-3xl shadow-2xl",
              "flex flex-col",
              className
            )}
            style={{ height: sheetHeight, bottom: 0, y }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <div>
                  {title && <h3 className="font-semibold text-lg">{title}</h3>}
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div
              className={cn(
                "flex-1 overflow-y-auto overscroll-contain",
                contentClassName
              )}
            >
              {children}
            </div>

            {/* Safe area for iOS home indicator */}
            <div className="h-safe-area-inset-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to control bottom sheet
export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<ReactNode>(null);
  const [options, setOptions] = useState<Partial<BottomSheetProps>>({});

  const open = useCallback(
    (node: ReactNode, opts?: Partial<BottomSheetProps>) => {
      setContent(node);
      setOptions(opts || {});
      setIsOpen(true);
    },
    []
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const BottomSheetContainer = useCallback(
    () => (
      <BottomSheet isOpen={isOpen} onClose={close} {...options}>
        {content}
      </BottomSheet>
    ),
    [isOpen, close, options, content]
  );

  return { open, close, isOpen, BottomSheetContainer };
}

// Quick action sheet
interface ActionSheetAction {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
}

export function ActionSheet({
  isOpen,
  onClose,
  title,
  actions,
  cancelLabel = "Cancelar",
}: ActionSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      snapPoints={[0.4]}
      showCloseButton={false}
    >
      <div className="p-4 space-y-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            disabled={action.disabled}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
              "text-left transition-colors",
              action.destructive
                ? "text-destructive hover:bg-destructive/10"
                : "hover:bg-muted",
              action.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {action.icon}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
        
        <div className="h-2" />
        
        <button
          onClick={onClose}
          className="w-full px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 font-medium transition-colors"
        >
          {cancelLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
