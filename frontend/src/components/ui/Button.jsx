import React from 'react';
import { cn } from '../../lib/utils'; // We need to create this utility

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded transition-colors duration-base disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold",
        secondary: "border border-border-default text-text-primary bg-surface hover:bg-surface-hover",
        outline: "border border-border-default text-text-primary bg-surface hover:bg-surface-hover",
        ghost: "hover:bg-surface-hover text-text-primary bg-transparent",
        danger: "text-deal hover:underline font-medium bg-transparent",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
        icon: "h-10 w-10 p-2",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
