import React from 'react';
import { Tag } from 'lucide-react';

const QuantityTierDisplay = ({ tiers = [], currentQty = 1, basePrice = 0 }) => {
    if (!tiers || tiers.length === 0) return null;

    const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
    const activeTier = [...sortedTiers].reverse().find(t => currentQty >= t.minQty);
    const nextTier = sortedTiers.find(t => t.minQty > currentQty);

    return (
        <div className="pt-4 border-t border-border-default">
            <div className="flex items-center gap-2 mb-3">
                <Tag size={16} className="text-trust" />
                <h3 className="text-sm font-bold text-text-primary">Volume Discounts</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sortedTiers.map(tier => {
                    const isActive = activeTier?.id === tier.id;
                    const savings = basePrice - tier.price;
                    const savingsPct = basePrice > 0 ? Math.round((savings / basePrice) * 100) : 0;

                    return (
                        <div
                            key={tier.id}
                            className={`rounded-lg border-2 p-2.5 text-center transition-all ${
                                isActive
                                    ? 'border-trust bg-trust/5'
                                    : 'border-border-default bg-page-bg'
                            }`}
                        >
                            <p className={`text-xs font-medium ${isActive ? 'text-trust' : 'text-text-muted'}`}>
                                Buy {tier.minQty}+
                            </p>
                            <p className={`text-base font-bold ${isActive ? 'text-trust' : 'text-text-primary'}`}>
                                ₹{(Number(tier.price) || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-text-muted">each</p>
                            {savings > 0 && (
                                <p className="text-[11px] text-success font-medium mt-0.5">
                                    Save {savingsPct}%
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
            {nextTier && (
                <p className="text-xs text-trust font-medium mt-2">
                    Add {nextTier.minQty - currentQty} more for ₹{(Number(nextTier.price) || 0).toLocaleString('en-IN')}/unit!
                </p>
            )}
        </div>
    );
};

export default QuantityTierDisplay;
