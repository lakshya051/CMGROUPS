import React from 'react';

/**
 * Zepto-style price display: selling price (bold), optional MRP strikethrough, optional % OFF badge.
 * Only shows strikethrough and badge when originalPrice exists AND originalPrice > sellingPrice.
 * Badge only when discount >= 5%.
 */
const PriceDisplay = ({
    sellingPrice,
    originalPrice,
    size = 'md',
    showBadge = true,
}) => {
    const hasDiscount = originalPrice != null && originalPrice > sellingPrice;
    const discountPct = hasDiscount
        ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
        : 0;
    const showPctBadge = showBadge && hasDiscount && discountPct >= 5;

    const sizeClasses = {
        sm: {
            main: 'text-lg font-bold text-text-primary',
            struck: 'text-sm text-text-muted line-through',
        },
        md: {
            main: 'text-xl font-bold text-text-primary',
            struck: 'text-sm text-text-muted line-through',
        },
        lg: {
            main: 'text-2xl md:text-3xl font-bold text-text-primary',
            struck: 'text-lg text-text-muted line-through',
        },
    };
    const classes = sizeClasses[size] || sizeClasses.md;

    const numericPrice = Number(sellingPrice);
    if (!Number.isFinite(numericPrice)) return null;

    return (
        <div className="flex flex-wrap items-baseline gap-2">
            <span className={classes.main}>
                ₹{numericPrice.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
                <span className={classes.struck}>
                    ₹{Number(originalPrice).toLocaleString('en-IN')}
                </span>
            )}
            {showPctBadge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-discount-green text-white">
                    {discountPct}% OFF
                </span>
            )}
        </div>
    );
};

export default PriceDisplay;
