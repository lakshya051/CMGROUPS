import React from 'react';
import { cn } from '../../lib/utils'; // We need to create this utility

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-primary text-white hover:bg-pink-600 shadow-lg hover:shadow-pink-500/40",
        secondary: "bg-secondary text-white hover:bg-violet-700 shadow-md",
        outline: "border border-gray-300 hover:border-primary hover:text-primary bg-transparent",
        ghost: "hover:bg-gray-100 text-text-muted hover:text-text-main",
        danger: "bg-error text-white hover:bg-red-600",
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
