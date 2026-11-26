'use client';

import React from 'react';

export type NeuButtonVariant =
  | 'primary'
  | 'secondary'
  | 'mint'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'blue'
  | 'ghost';

export type NeuButtonSize = 'sm' | 'md' | 'lg';

export interface NeuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeuButtonVariant;
  size?: NeuButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<NeuButtonVariant, string> = {
  primary: 'neu-btn-primary',
  secondary: 'neu-btn-secondary',
  mint: 'neu-btn-mint',
  teal: 'neu-btn-mint',
  amber: 'neu-btn-amber',
  rose: 'neu-btn-rose',
  blue: 'neu-btn-blue',
  ghost:
    'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/5 border border-transparent active:scale-95 shadow-none',
};

const sizeStyles: Record<NeuButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 min-h-[36px] rounded-xl gap-1.5',
  md: 'text-xs sm:text-sm px-4 py-2.5 min-h-[44px] rounded-2xl gap-2',
  lg: 'text-sm sm:text-base px-6 py-3 min-h-[48px] rounded-2xl gap-2.5',
};

export const NeuButton: React.FC<NeuButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...props
}) => {
  const isGhost = variant === 'ghost';
  const baseClasses = isGhost ? variantStyles.ghost : `neu-btn ${variantStyles[variant] || variantStyles.primary}`;
  const sizeClasses = sizeStyles[size] || sizeStyles.md;
  const widthClasses = fullWidth ? 'w-full' : '';
  const stateClasses = disabled || loading ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

  const renderIcon = () => {
    if (loading) {
      return <i className="fa-solid fa-circle-notch fa-spin text-current"></i>;
    }
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <i className={`${icon} text-current`}></i>;
    }
    return icon;
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${widthClasses} ${stateClasses} ${className}`}
      {...props}
    >
      {iconPosition === 'left' && renderIcon()}
      {children && <span>{children}</span>}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
};

export default NeuButton;
