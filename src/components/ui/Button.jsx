import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:shadow-blue-950/40',
    secondary:
      'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 dark:border-neutral-600 dark:focus:ring-neutral-500',
    ghost:
      'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 focus:ring-neutral-300 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-700/80 dark:focus:ring-neutral-600',
    danger:
      'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-400 dark:shadow-red-950/40',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-sm px-5 py-2.5',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  );
}
