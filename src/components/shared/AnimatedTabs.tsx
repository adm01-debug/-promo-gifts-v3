import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "default" | "pills" | "underline" | "boxed";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

export function AnimatedTabs({
  tabs,
  activeTab,
  onChange,
  variant = "default",
  size = "md",
  fullWidth = false,
  className,
}: AnimatedTabsProps) {
  const sizeStyles = {
    sm: { tab: "px-3 py-1.5 text-sm", icon: "w-3.5 h-3.5", badge: "text-[10px] px-1.5" },
    md: { tab: "px-4 py-2 text-sm", icon: "w-4 h-4", badge: "text-xs px-2" },
    lg: { tab: "px-5 py-2.5 text-base", icon: "w-5 h-5", badge: "text-xs px-2" },
  };

  const styles = sizeStyles[size];

  const getTabStyles = (isActive: boolean, disabled: boolean) => {
    if (disabled) {
      return "text-muted-foreground/50 cursor-not-allowed";
    }

    const baseStyles = "relative transition-colors font-medium";

    switch (variant) {
      case "pills":
        return cn(
          baseStyles,
          isActive
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        );
      case "underline":
        return cn(
          baseStyles,
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        );
      case "boxed":
        return cn(
          baseStyles,
          isActive
            ? "text-foreground bg-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        );
      default:
        return cn(
          baseStyles,
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        );
    }
  };

  return (
    <div
      className={cn(
        "flex",
        variant === "boxed" && "bg-muted p-1 rounded-lg",
        variant === "underline" && "border-b",
        fullWidth && "w-full",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              "flex items-center gap-2 rounded-md",
              styles.tab,
              getTabStyles(isActive, !!tab.disabled),
              fullWidth && "flex-1 justify-center"
            )}
          >
            {/* Background indicator for pills */}
            {variant === "pills" && isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-primary rounded-md"
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              />
            )}

            {/* Background indicator for boxed */}
            {variant === "boxed" && isActive && (
              <motion.div
                layoutId="activeTabBox"
                className="absolute inset-0 bg-background rounded-md shadow-sm"
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              />
            )}

            {/* Underline indicator */}
            {variant === "underline" && isActive && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              />
            )}

            {/* Content */}
            <span className="relative flex items-center gap-2">
              {Icon && <Icon className={styles.icon} />}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "rounded-full py-0.5 font-medium",
                    styles.badge,
                    isActive
                      ? variant === "pills"
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Tab Content with animations
interface TabContentProps {
  children: ReactNode;
  tabId: string;
  activeTab: string;
  className?: string;
}

export function TabContent({ children, tabId, activeTab, className }: TabContentProps) {
  return (
    <AnimatePresence mode="wait">
      {tabId === activeTab && (
        <motion.div
          key={tabId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple Tab Panel component
interface TabPanelProps {
  tabs: {
    id: string;
    label: string;
    icon?: LucideIcon;
    content: ReactNode;
    badge?: string | number;
  }[];
  defaultTab?: string;
  variant?: "default" | "pills" | "underline" | "boxed";
  className?: string;
  tabsClassName?: string;
  contentClassName?: string;
}

export function TabPanel({
  tabs,
  defaultTab,
  variant = "default",
  className,
  tabsClassName,
  contentClassName,
}: TabPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={cn("space-y-4", className)}>
      <AnimatedTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant={variant}
        className={tabsClassName}
      />
      <AnimatePresence mode="wait">
        {tabs.map((tab) => (
          <TabContent
            key={tab.id}
            tabId={tab.id}
            activeTab={activeTab}
            className={contentClassName}
          >
            {tab.content}
          </TabContent>
        ))}
      </AnimatePresence>
    </div>
  );
}
