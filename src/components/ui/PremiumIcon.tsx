import * as React from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/styles/tokens';

export interface PremiumIconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string;
  weight?: number | string;
  glow?: boolean;
}

/**
 * PremiumIcon - Standardizes all SVG icons in the UI.
 * Uses design tokens for size, stroke weight, and colors.
 */
export const PremiumIcon = React.forwardRef<SVGSVGElement, PremiumIconProps>(
  ({ className, size, weight, glow = false, children, ...props }, ref) => {
    const iconSize = size || tokens.icons.size;
    const iconWeight = weight || tokens.icons.stroke;

    return (
      <svg
        ref={ref}
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconWeight}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'inline-block transition-all duration-300',
          glow && 'drop-shadow-[0_0_8px_rgba(var(--primary-glow),0.4)]',
          className,
        )}
        {...props}
      >
        {children}
      </svg>
    );
  },
);

PremiumIcon.displayName = 'PremiumIcon';
