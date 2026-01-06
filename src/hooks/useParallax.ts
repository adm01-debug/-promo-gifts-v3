/**
 * useParallax - Subtle parallax effect for hero sections and backgrounds
 */
import { useState, useEffect, useCallback, useRef } from "react";

interface ParallaxConfig {
  /** Speed multiplier (0.1 = slow, 1 = match scroll) */
  speed?: number;
  /** Direction of parallax movement */
  direction?: "vertical" | "horizontal";
  /** Whether to use transform (better perf) or position */
  useTransform?: boolean;
  /** Easing function for smooth movement */
  easing?: number;
}

interface ParallaxState {
  /** Current transform value */
  transform: string;
  /** Current offset value */
  offset: number;
  /** CSS styles to apply */
  style: React.CSSProperties;
}

export function useParallax({
  speed = 0.3,
  direction = "vertical",
  useTransform = true,
  easing = 0.1,
}: ParallaxConfig = {}): ParallaxState {
  const [offset, setOffset] = useState(0);
  const targetOffset = useRef(0);
  const currentOffset = useRef(0);
  const animationFrame = useRef<number>();

  const animate = useCallback(() => {
    // Smooth easing towards target
    currentOffset.current += (targetOffset.current - currentOffset.current) * easing;
    
    // Only update if there's meaningful change
    if (Math.abs(targetOffset.current - currentOffset.current) > 0.1) {
      setOffset(currentOffset.current);
      animationFrame.current = requestAnimationFrame(animate);
    } else {
      setOffset(targetOffset.current);
    }
  }, [easing]);

  useEffect(() => {
    const handleScroll = () => {
      targetOffset.current = window.scrollY * speed;
      
      if (!animationFrame.current) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [speed, animate]);

  const transform = direction === "vertical"
    ? `translateY(${offset}px)`
    : `translateX(${offset}px)`;

  const style: React.CSSProperties = useTransform
    ? { transform, willChange: "transform" }
    : direction === "vertical"
      ? { top: offset }
      : { left: offset };

  return { transform, offset, style };
}

/**
 * useMouseParallax - Parallax effect based on mouse position
 */
interface MouseParallaxConfig {
  /** Intensity of the effect (default: 20) */
  intensity?: number;
  /** Whether to invert the movement */
  inverted?: boolean;
}

interface MouseParallaxState {
  x: number;
  y: number;
  style: React.CSSProperties;
}

export function useMouseParallax({
  intensity = 20,
  inverted = false,
}: MouseParallaxConfig = {}): MouseParallaxState {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const targetPosition = useRef({ x: 0, y: 0 });
  const currentPosition = useRef({ x: 0, y: 0 });
  const animationFrame = useRef<number>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const multiplier = inverted ? -1 : 1;
      
      targetPosition.current = {
        x: ((e.clientX - centerX) / centerX) * intensity * multiplier,
        y: ((e.clientY - centerY) / centerY) * intensity * multiplier,
      };
    };

    const animate = () => {
      currentPosition.current.x += (targetPosition.current.x - currentPosition.current.x) * 0.1;
      currentPosition.current.y += (targetPosition.current.y - currentPosition.current.y) * 0.1;
      
      setPosition({ ...currentPosition.current });
      animationFrame.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [intensity, inverted]);

  return {
    x: position.x,
    y: position.y,
    style: {
      transform: `translate(${position.x}px, ${position.y}px)`,
      willChange: "transform",
    },
  };
}
