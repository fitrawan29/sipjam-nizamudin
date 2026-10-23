'use client';

import React from 'react';

export type ClayButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'mint' 
  | 'amber' 
  | 'rose' 
  | 'blue' 
  | 'ghost';

export type ClayButtonSize = 'sm' | 'md' | 'lg';

export interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ClayButtonVariant;
  size?: ClayButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ClayButtonVariant, string> = {
  primary: 'clay-btn-primary',
  secondary: 'clay-btn-secondary',
  mint: 'clay-btn-mint',
  amber: 'clay-btn-amber',
  rose: 'clay-btn-rose',
  blue: 'clay-btn-blue',
  ghost: 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 border border-transparent hover:border-white/60 active:scale-95 shadow-none',
};

const sizeStyles: Record<ClayButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-xl gap-1.5',
  md: 'text-xs sm:text-sm px-4 py-2.5 rounded-2xl gap-2',
  lg: 'text-sm sm:text-base px-6 py-3 rounded-2xl gap-2.5',
};

export const ClayButton: React.FC<ClayButtonProps> = ({
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
  const baseClasses = isGhost ? variantStyles.ghost : `clay-btn ${variantStyles[variant]}`;
  const sizeClasses = sizeStyles[size] || sizeStyles.md;
  const widthClasses = fullWidth ? 'w-full' : '';
  const stateClasses = (disabled || loading) ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

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

export default ClayButton;
