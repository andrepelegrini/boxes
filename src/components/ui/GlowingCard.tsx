import React from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const glowingCardVariants = cva(
  'transition-all duration-300',
  {
    variants: {
      glowColor: {
        purple: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]',
        blue: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]',
        green: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]',
      },
      intensity: {
        low: 'hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]',
        medium: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]',
        high: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]',
      },
    },
    defaultVariants: {
      glowColor: 'purple',
      intensity: 'medium',
    },
  }
);

export interface GlowingCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof glowingCardVariants> {}

const GlowingCard = React.forwardRef<HTMLDivElement, GlowingCardProps>(
  ({ className, glowColor, intensity, style, ...props }, ref) => {
    return (
      <div
        className={cn(glowingCardVariants({ glowColor, intensity, className }))}
        ref={ref}
        style={style}
        {...props}
      />
    );
  }
);

GlowingCard.displayName = 'GlowingCard';

export default GlowingCard;
