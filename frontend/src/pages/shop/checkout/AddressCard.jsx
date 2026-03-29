import React from 'react';
import { CheckCircle, MapPin, Trash2 } from 'lucide-react';

const AddressCard = ({ address, isSelected, onSelect, onDelete }) => (
    <div
        onClick={() => onSelect(address)}
        className={`flex-shrink-0 w-48 p-3 rounded-xl border cursor-pointer transition-all duration-200 relative group
            ${isSelected
                ? 'border-trust bg-trust/10 ring-2 ring-trust/40 shadow-md'
                : 'border-border-default bg-surface hover:border-trust/40 hover:bg-surface-hover'
            }`}
    >
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(address.id); }}
            className="absolute top-2 right-2 p-1 rounded-md text-text-muted hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Delete address"
        >
            <Trash2 size={12} />
        </button>

        <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={12} className={isSelected ? 'text-trust' : 'text-text-muted'} />
            <span className={`text-xs font-bold truncate ${isSelected ? 'text-trust' : 'text-text-primary'}`}>
                {address.label || 'Saved Address'}
            </span>
        </div>
        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">{address.address}</p>
        <p className="text-xs text-text-secondary mt-1">{address.city} – {address.pincode}</p>
        {isSelected && (
            <div className="mt-2 flex items-center gap-1 text-trust text-xs font-semibold">
                <CheckCircle size={10} /> Applied
            </div>
        )}
    </div>
);

export default AddressCard;
