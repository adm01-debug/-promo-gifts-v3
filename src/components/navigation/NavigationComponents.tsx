import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================
// NavLink - Link de navegação com estados
// ============================================
interface NavLinkProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  badge?: string | number;
  external?: boolean;
  disabled?: boolean;
  className?: string;
}

export function NavLink({
  href,
  children,
  icon,
  badge,
  external,
  disabled,
  className,
}: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === href || location.pathname.startsWith(`${href}/`);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-accent",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        {icon}
        <span className="flex-1">{children}</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ============================================
// NavGroup - Grupo expansível de navegação
// ============================================
interface NavGroupProps {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}

export function NavGroup({
  label,
  icon,
  children,
  defaultOpen = false,
  badge,
}: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
            {badge}
          </span>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pl-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// StepNavigation - Navegação em etapas
// ============================================
interface Step {
  id: string;
  label: string;
  description?: string;
  completed?: boolean;
  current?: boolean;
  disabled?: boolean;
}

interface StepNavigationProps {
  steps: Step[];
  onStepClick?: (stepId: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function StepNavigation({
  steps,
  onStepClick,
  orientation = "horizontal",
  className,
}: StepNavigationProps) {
  return (
    <nav
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col space-y-4" : "items-center space-x-4",
        className
      )}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center",
              orientation === "vertical" ? "w-full" : ""
            )}
          >
            <button
              onClick={() => onStepClick?.(step.id)}
              disabled={step.disabled}
              className={cn(
                "flex items-center gap-3 transition-colors",
                step.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                  step.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.current
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {step.completed ? "✓" : index + 1}
              </div>
              <div className="text-left">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.current ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
            </button>
            {!isLast && orientation === "horizontal" && (
              <div className="ml-4 h-px w-12 bg-border" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ============================================
// QuickNav - Navegação rápida com ícones
// ============================================
interface QuickNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
}

interface QuickNavProps {
  items: QuickNavItem[];
  collapsed?: boolean;
  className?: string;
}

export function QuickNav({ items, collapsed, className }: QuickNavProps) {
  const location = useLocation();

  return (
    <TooltipProvider>
      <nav className={cn("flex flex-col gap-1", className)}>
        {items.map((item) => {
          const isActive = item.href && location.pathname.startsWith(item.href);
          const content = (
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={item.onClick}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </div>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  {item.href ? <Link to={item.href}>{content}</Link> : content}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return item.href ? (
            <Link key={item.id} to={item.href}>
              {content}
            </Link>
          ) : (
            <div key={item.id}>{content}</div>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

// ============================================
// TreeNav - Navegação em árvore
// ============================================
interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  children?: TreeNode[];
  href?: string;
}

interface TreeNavProps {
  nodes: TreeNode[];
  selectedId?: string;
  onSelect?: (nodeId: string) => void;
  className?: string;
}

export function TreeNav({ nodes, selectedId, onSelect, className }: TreeNavProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = node.id === selectedId;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
            isSelected
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            onSelect?.(node.id);
          }}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          ) : (
            <div className="w-4" />
          )}
          {node.icon}
          <span className="text-sm">{node.label}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return <nav className={cn("space-y-1", className)}>{nodes.map((node) => renderNode(node))}</nav>;
}
