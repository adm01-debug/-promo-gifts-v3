/**
 * Advanced Interaction Components
 * Drag & drop, gestures, and complex interaction patterns
 */

import React, { 
  useState, 
  useRef, 
  useCallback, 
  useEffect,
  createContext,
  useContext
} from "react";
import { cn } from "@/lib/utils";
import { GripVertical, X, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================
// LONG PRESS HOOK
// ============================================

interface LongPressOptions {
  threshold?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

export function useLongPress(
  callback: () => void,
  options: LongPressOptions = {}
) {
  const { threshold = 500, onStart, onFinish, onCancel } = options;
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      isLongPress.current = false;
      onStart?.();
      
      timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        callback();
        onFinish?.();
      }, threshold);
    },
    [callback, threshold, onStart, onFinish]
  );

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (!isLongPress.current) {
        onCancel?.();
      }
    }
  }, [onCancel]);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}

// ============================================
// SWIPE TO ACTION
// ============================================

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
}

interface SwipeToActionProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
}

export function SwipeToAction({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
}: SwipeToActionProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit the offset
    const maxOffset = Math.max(leftActions.length, rightActions.length) * 80;
    const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
    
    setOffset(limitedOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (Math.abs(offset) > threshold) {
      if (offset > 0 && leftActions.length > 0) {
        // Trigger left action
        leftActions[0].action();
      } else if (offset < 0 && rightActions.length > 0) {
        // Trigger right action
        rightActions[0].action();
      }
    }
    
    setOffset(0);
  };

  return (
    <div className={cn("relative overflow-hidden", className)} ref={containerRef}>
      {/* Left actions */}
      {leftActions.length > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center"
          style={{ width: Math.abs(offset) }}
        >
          {leftActions.map((action) => (
            <button
              key={action.id}
              className={cn(
                "h-full flex items-center justify-center px-4",
                action.color
              )}
              onClick={action.action}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end"
          style={{ width: Math.abs(offset) }}
        >
          {rightActions.map((action) => (
            <button
              key={action.id}
              className={cn(
                "h-full flex items-center justify-center px-4",
                action.color
              )}
              onClick={action.action}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          "relative bg-background transition-transform",
          !isDragging && "duration-200"
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// INLINE EDIT
// ============================================

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  renderValue?: (value: string) => React.ReactNode;
}

export function InlineEdit({
  value,
  onSave,
  onCancel,
  placeholder = "Clique para editar",
  className,
  inputClassName,
  renderValue,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn(
            "flex-1 px-2 py-1 border rounded-md bg-background",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            inputClassName
          )}
        />
        <Button size="icon" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      className={cn(
        "text-left hover:bg-accent px-2 py-1 rounded-md transition-colors",
        !value && "text-muted-foreground",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      {renderValue ? renderValue(value) : value || placeholder}
    </button>
  );
}

// ============================================
// UNDO/REDO MANAGER
// ============================================

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setState((prev) => {
      const nextPresent = 
        typeof newPresent === "function" 
          ? (newPresent as (prev: T) => T)(prev.present)
          : newPresent;
          
      return {
        past: [...prev.past, prev.present],
        present: nextPresent,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    history: state.past,
    future: state.future,
  };
}

// ============================================
// UNDO/REDO CONTROLS
// ============================================

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UndoRedoControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  size = "md",
  className,
}: UndoRedoControlsProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        className={sizeClasses[size]}
        title="Desfazer (Ctrl+Z)"
      >
        <RotateCcw className={cn(iconSizes[size])} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRedo}
        disabled={!canRedo}
        className={sizeClasses[size]}
        title="Refazer (Ctrl+Y)"
      >
        <RotateCcw className={cn(iconSizes[size], "scale-x-[-1]")} />
      </Button>
      {onReset && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          className={sizeClasses[size]}
          title="Resetar"
        >
          <X className={iconSizes[size]} />
        </Button>
      )}
    </div>
  );
}

// ============================================
// DRAGGABLE LIST ITEM
// ============================================

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
}

export function DraggableItem({
  id,
  children,
  isDragging = false,
  dragHandleProps,
  className,
}: DraggableItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 bg-background border rounded-lg transition-all",
        isDragging && "shadow-lg opacity-90 scale-[1.02]",
        className
      )}
    >
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ============================================
// MULTI-SELECT CONTEXT
// ============================================

interface MultiSelectContextType {
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectRange: (startId: string, endId: string, allIds: string[]) => void;
}

const MultiSelectContext = createContext<MultiSelectContextType | null>(null);

export function MultiSelectProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastSelectedRef.current = id;
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedRef.current = null;
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectRange = useCallback(
    (startId: string, endId: string, allIds: string[]) => {
      const startIndex = allIds.indexOf(startId);
      const endIndex = allIds.indexOf(endId);
      
      if (startIndex === -1 || endIndex === -1) return;
      
      const [from, to] = startIndex < endIndex 
        ? [startIndex, endIndex] 
        : [endIndex, startIndex];
        
      const rangeIds = allIds.slice(from, to + 1);
      
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
    },
    []
  );

  return (
    <MultiSelectContext.Provider
      value={{
        selectedIds,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
        selectRange,
      }}
    >
      {children}
    </MultiSelectContext.Provider>
  );
}

export function useMultiSelect() {
  const context = useContext(MultiSelectContext);
  if (!context) {
    throw new Error("useMultiSelect must be used within a MultiSelectProvider");
  }
  return context;
}

// ============================================
// CLIPBOARD UTILS
// ============================================

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
      
      return true;
    } catch {
      return false;
    }
  }, []);

  const paste = useCallback(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }, []);

  return { copy, paste, copied };
}

// ============================================
// DOUBLE CLICK HANDLER
// ============================================

interface DoubleClickHandlerProps {
  onClick?: () => void;
  onDoubleClick: () => void;
  delay?: number;
  children: React.ReactNode;
  className?: string;
}

export function DoubleClickHandler({
  onClick,
  onDoubleClick,
  delay = 250,
  children,
  className,
}: DoubleClickHandlerProps) {
  const clickCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const handleClick = () => {
    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      timerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          onClick?.();
        }
        clickCountRef.current = 0;
      }, delay);
    } else if (clickCountRef.current === 2) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      clickCountRef.current = 0;
      onDoubleClick();
    }
  };

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  );
}
