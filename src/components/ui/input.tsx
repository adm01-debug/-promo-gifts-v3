import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-[var(--radius)] border border-border bg-background px-4 py-2 text-sm font-medium ring-offset-background',
          'placeholder:font-medium placeholder:text-muted-foreground/50',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
          'shadow-soft transition-all duration-300',
          'hover:border-primary/40 hover:shadow-medium',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
