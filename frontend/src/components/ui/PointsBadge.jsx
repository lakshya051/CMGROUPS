import React from 'react';
import { Coins } from 'lucide-react';

const formatPoints = (value) => {
    const numericValue = Number(value) || 0;
    const hasFraction = Math.abs(numericValue % 1) > 0.001;

    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(numericValue);
};

const PointsBadge = ({ points = 0, compact = false, className = '' }) => {
    const baseClassName = compact
        ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700'
        : 'inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700';

    return (
        <div className={`${baseClassName} ${className}`.trim()}>
            <Coins size={compact ? 14 : 16} className="shrink-0" />
            {!compact && <span className="text-amber-800/80">Points</span>}
            <span className="tabular-nums">{formatPoints(points)}</span>
        </div>
    );
};

export default PointsBadge;
