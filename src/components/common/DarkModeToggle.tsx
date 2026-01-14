/**
 * DarkModeToggle - Toggle para alternar entre temas claro e escuro
 * Inclui animação suave e ícones dinâmicos
 */

import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

interface DarkModeToggleProps {
  variant?: "icon" | "pill" | "dropdown";
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

export function DarkModeToggle({
  variant = "icon",
  size = "md",
  className,
  showLabel = false,
}: DarkModeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (newTheme: Theme) => {
      root.classList.remove("light", "dark");
      
      if (newTheme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(newTheme);
      }
    };
    
    applyTheme(theme);
    localStorage.setItem("theme", theme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  if (!mounted) return null;

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const buttonSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const getCurrentIcon = () => {
    const iconClass = iconSizes[size];
    
    if (theme === "system") {
      return <Monitor className={iconClass} />;
    }
    
    return theme === "dark" ? (
      <Moon className={iconClass} />
    ) : (
      <Sun className={iconClass} />
    );
  };

  // Variante simples com ícone
  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn(
          buttonSizes[size],
          "rounded-full hover:bg-secondary",
          className
        )}
        aria-label={`Alternar para tema ${theme === "dark" ? "claro" : "escuro"}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            {getCurrentIcon()}
          </motion.div>
        </AnimatePresence>
      </Button>
    );
  }

  // Variante pill (switch visual)
  if (variant === "pill") {
    return (
      <motion.button
        onClick={toggleTheme}
        className={cn(
          "relative flex items-center gap-1 p-1 rounded-full bg-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className
        )}
        aria-label={`Alternar para tema ${theme === "dark" ? "claro" : "escuro"}`}
      >
        <span
          className={cn(
            "p-2 rounded-full transition-colors",
            theme === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <Sun className={iconSizes[size]} />
        </span>
        <span
          className={cn(
            "p-2 rounded-full transition-colors",
            theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          <Moon className={iconSizes[size]} />
        </span>
      </motion.button>
    );
  }

  // Variante dropdown com todas as opções
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={showLabel ? "default" : "icon"}
          className={cn(
            !showLabel && buttonSizes[size],
            "rounded-full hover:bg-secondary",
            className
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={theme}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {getCurrentIcon()}
              {showLabel && (
                <span className="text-sm">
                  {theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema"}
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(theme === "light" && "bg-secondary")}
        >
          <Sun className="h-4 w-4 mr-2" />
          Claro
          {theme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "bg-secondary")}
        >
          <Moon className="h-4 w-4 mr-2" />
          Escuro
          {theme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(theme === "system" && "bg-secondary")}
        >
          <Monitor className="h-4 w-4 mr-2" />
          Sistema
          {theme === "system" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook para uso programático
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setLightTheme = () => setTheme("light");
  const setDarkTheme = () => setTheme("dark");
  const setSystemTheme = () => setTheme("system");

  return {
    theme,
    setTheme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    setSystemTheme,
    isDark: theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches),
  };
}
