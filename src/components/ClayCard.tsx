'use client';

import React from 'react';

export type ClayCardVariant = 
  | 'default' 
  | 'mint' 
  | 'peach' 
  | 'amber' 
  | 'blue' 
  | 'purple' 
  | 'rose' 
  | 'primary'
  | 'inset';

export interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ClayCardVariant;
  interactive?: boolean;
  rounded?: 'xl' | '2xl' | '3xl' | 'full';
  className?: string;
  children?: React.ReactNode;
  as?: React.ElementType;
}

const variantStyles: Record<ClayCardVariant, string> = {
  default: 'clay-card text-gray-800 dark:text-gray-100',
  mint: 'clay-card-mint text-emerald-950 dark:text-emerald-100',
  peach: 'clay-card-peach text-amber-950 dark:text-amber-100',
  amber: 'clay-card-amber text-amber-950 dark:text-amber-100',
  blue: 'clay-card-blue text-blue-950 dark:text-blue-100',
  purple: 'clay-card-purple text-purple-950 dark:text-purple-100',
  rose: 'clay-card-rose text-rose-950 dark:text-rose-100',
  primary: 'bg-gradient-to-br from-[#0B4619] to-[#166527] text-white border-2 border-white/40 shadow-[8px_8px_20px_rgba(11,70,25,0.35),-4px_-4px_12px_rgba(255,255,255,0.8),inset_2px_2px_4px_rgba(255,255,255,0.4),inset_-2px_-2px_4px_rgba(0,0,0,0.25)]',
  inset: 'clay-inset text-gray-800 dark:text-gray-100',
};

const roundedStyles = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

export const ClayCard: React.FC<ClayCardProps> = ({
  variant = 'default',
  interactive = false,
  rounded = '3xl',
  className = '',
  children,
  as: Component = 'div',
  ...props
}) => {
  const baseClasses = variantStyles[variant] || variantStyles.default;
  const radiusClass = roundedStyles[rounded] || 'rounded-3xl';
  const interactiveClass = interactive 
    ? 'card-interactive cursor-pointer active:scale-[0.985] active:translate-y-0.5' 
    : '';

  return (
    <Component
      className={`relative z-10 transition-all duration-300 ease-out ${baseClasses} ${radiusClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ClayCard;
