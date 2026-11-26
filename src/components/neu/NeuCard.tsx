'use client';

import React from 'react';

export type NeuCardVariant =
  | 'default'
  | 'teal'
  | 'mint'
  | 'peach'
  | 'amber'
  | 'blue'
  | 'slate'
  | 'purple'
  | 'rose'
  | 'primary'
  | 'inset';

export type NeuCardElevation = 'sm' | 'md' | 'inset';

export interface NeuCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: NeuCardVariant;
  elevation?: NeuCardElevation;
  interactive?: boolean;
  rounded?: 'xl' | '2xl' | '3xl' | 'full';
  className?: string;
  children?: React.ReactNode;
  as?: React.ElementType;
}

const variantStyles: Record<NeuCardVariant, string> = {
  default: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  teal: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  mint: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  peach: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  amber: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  blue: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  slate: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  purple: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  rose: 'neu-card text-[#0F172A] dark:text-[#F1F5F9]',
  primary: 'neu-card-primary text-white',
  inset: 'neu-inset text-[#0F172A] dark:text-[#F1F5F9]',
};

const roundedStyles = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

export const NeuCard: React.FC<NeuCardProps> = ({
  variant = 'default',
  elevation,
  interactive = false,
  rounded = '3xl',
  className = '',
  children,
  as: Component = 'div',
  ...props
}) => {
  const effectiveBase =
    elevation === 'inset'
      ? 'neu-inset text-[#0F172A] dark:text-[#F1F5F9]'
      : elevation === 'sm' && variant !== 'primary' && variant !== 'inset'
      ? 'neu-card-sm text-[#0F172A] dark:text-[#F1F5F9]'
      : variantStyles[variant] || variantStyles.default;

  const radiusClass = roundedStyles[rounded] || 'rounded-3xl';
  const interactiveClass = interactive
    ? 'card-interactive cursor-pointer active:scale-[0.985]'
    : '';

  return (
    <Component
      className={`relative z-10 transition-all duration-200 ease-out ${effectiveBase} ${radiusClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default NeuCard;
