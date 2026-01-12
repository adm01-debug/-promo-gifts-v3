/**
 * Expandable Sections Components
 * Collapsible content with smooth animations
 */

import { useState, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Simple Expandable Section
interface ExpandableSectionProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  badge?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: "default" | "bordered" | "ghost" | "filled";
}

export function ExpandableSection({
  title,
  children,
  defaultOpen = false,
  icon,
  badge,
  className,
  headerClassName,
  contentClassName,
  variant = "default",
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variantClasses = {
    default: "",
    bordered: "border rounded-lg",
    ghost: "",
    filled: "bg-muted/50 rounded-lg",
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-3 p-4 text-left transition-colors",
          variant === "ghost" ? "hover:bg-muted/50 rounded-lg" : "hover:bg-muted/30",
          headerClassName
        )}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
          {badge}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={cn("p-4 pt-0", contentClassName)}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Accordion Context
interface AccordionContextValue {
  activeItems: string[];
  toggleItem: (id: string) => void;
  type: "single" | "multiple";
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

// Accordion
interface AccordionProps {
  children: ReactNode;
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  className?: string;
}

export function Accordion({
  children,
  type = "single",
  defaultValue,
  className,
}: AccordionProps) {
  const [activeItems, setActiveItems] = useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleItem = (id: string) => {
    setActiveItems((prev) => {
      if (type === "single") {
        return prev.includes(id) ? [] : [id];
      }
      return prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
    });
  };

  return (
    <AccordionContext.Provider value={{ activeItems, toggleItem, type }}>
      <div className={cn("divide-y", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

// Accordion Item
interface AccordionItemProps {
  id: string;
  title: string | ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function AccordionItem({
  id,
  title,
  children,
  icon,
  disabled = false,
  className,
}: AccordionItemProps) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error("AccordionItem must be used within Accordion");

  const { activeItems, toggleItem } = context;
  const isOpen = activeItems.includes(id);

  return (
    <div className={cn("py-2", disabled && "opacity-50", className)}>
      <button
        onClick={() => !disabled && toggleItem(id)}
        disabled={disabled}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-muted-foreground">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Collapsible Card
interface CollapsibleCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
  className?: string;
}

export function CollapsibleCard({
  title,
  description,
  children,
  defaultOpen = true,
  actions,
  className,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border rounded-lg bg-card", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </button>
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tree View
interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  children?: TreeNode[];
  disabled?: boolean;
}

interface TreeViewProps {
  nodes: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
  defaultExpanded?: string[];
  className?: string;
}

export function TreeView({
  nodes,
  onSelect,
  selectedId,
  defaultExpanded = [],
  className,
}: TreeViewProps) {
  const [expanded, setExpanded] = useState<string[]>(defaultExpanded);

  const toggleExpand = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className={className}>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          expanded={expanded}
          toggleExpand={toggleExpand}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  level,
  expanded,
  toggleExpand,
  onSelect,
  selectedId,
}: {
  node: TreeNode;
  level: number;
  expanded: string[];
  toggleExpand: (id: string) => void;
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.includes(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-colors",
          isSelected ? "bg-accent" : "hover:bg-muted/50",
          node.disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (node.disabled) return;
          if (hasChildren) toggleExpand(node.id);
          onSelect?.(node);
        }}
      >
        {hasChildren ? (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        ) : (
          <span className="w-4" />
        )}
        {node.icon}
        <span className="text-sm">{node.label}</span>
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                onSelect={onSelect}
                selectedId={selectedId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Expand All / Collapse All Controls
export function ExpandControls({
  onExpandAll,
  onCollapseAll,
  className,
}: {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="ghost" size="sm" className="gap-1" onClick={onExpandAll}>
        <Plus className="h-3 w-3" />
        Expandir tudo
      </Button>
      <Button variant="ghost" size="sm" className="gap-1" onClick={onCollapseAll}>
        <Minus className="h-3 w-3" />
        Recolher tudo
      </Button>
    </div>
  );
}

// Details/Summary (native HTML enhanced)
export function Details({
  summary,
  children,
  open = false,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className={className}
    >
      <summary className="flex items-center gap-2 cursor-pointer list-none p-3 hover:bg-muted/50 rounded-lg transition-colors">
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="h-4 w-4" />
        </motion.div>
        {summary}
      </summary>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pl-6 pb-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </details>
  );
}

// Nested Expandable Groups
interface ExpandableGroupProps {
  groups: {
    id: string;
    title: string;
    icon?: ReactNode;
    items: {
      id: string;
      label: string;
      content: ReactNode;
    }[];
  }[];
  className?: string;
}

export function ExpandableGroups({ groups, className }: ExpandableGroupProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleItem = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {groups.map((group) => (
        <div key={group.id} className="border rounded-lg">
          <button
            onClick={() => toggleGroup(group.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {group.icon}
              <span className="font-semibold">{group.title}</span>
            </div>
            <motion.div
              animate={{ rotate: expandedGroups.includes(group.id) ? 180 : 0 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>

          <AnimatePresence>
            {expandedGroups.includes(group.id) && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t"
              >
                <div className="p-2 space-y-1">
                  {group.items.map((item) => (
                    <div key={item.id}>
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 text-left"
                      >
                        <span className="text-sm">{item.label}</span>
                        <motion.div
                          animate={{
                            rotate: expandedItems.includes(item.id) ? 180 : 0,
                          }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {expandedItems.includes(item.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 ml-4 text-sm text-muted-foreground">
                              {item.content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
