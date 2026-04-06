import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ScrollProgressBarProps {
  className?: string;
}

export function ScrollProgressBar({ className }: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        setProgress(Math.min((scrollTop / docHeight) * 100, 100));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent pointer-events-none",
        className
      )}
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-primary to-primary/60 transition-[width] duration-150 ease-out rounded-r-full"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
