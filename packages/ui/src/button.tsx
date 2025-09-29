'use client';

import React, { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  className = '', 
  variant = 'default', 
  size = 'default',
  asChild = false,
  ...props 
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  };

  const sizeClasses = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8'
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (asChild) {
    // If asChild is true, we expect children to be a single React element
    // We'll apply the classes to that element
    const childElement = children as React.ReactElement;
    const existingClassName = (childElement.props as any)?.className || '';
    return React.cloneElement(childElement, {
      className: `${combinedClasses} ${existingClassName}`,
      ref,
      ...props
    } as any);
  }

  return (
    <button ref={ref} className={combinedClasses} {...props}>
      {children}
    </button>
  );
});

Button.displayName = 'Button';
