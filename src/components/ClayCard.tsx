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
  default: 'clay-card text-[#0F172A] dark:text-[#F1F5F9]',
  mint: 'clay-card-mint text-[#0F172A] dark:text-[#F1F5F9]',
  peach: 'clay-card-peach text-[#0F172A] dark:text-[#F1F5F9]',
  amber: 'clay-card-amber text-[#0F172A] dark:text-[#F1F5F9]',
  blue: 'clay-card-blue text-[#0F172A] dark:text-[#F1F5F9]',
  purple: 'clay-card-purple text-[#0F172A] dark:text-[#F1F5F9]',
  rose: 'clay-card-rose text-[#0F172A] dark:text-[#F1F5F9]',
  primary: 'neu-card-primary text-white',
  inset: 'clay-inset text-[#0F172A] dark:text-[#F1F5F9]',
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
