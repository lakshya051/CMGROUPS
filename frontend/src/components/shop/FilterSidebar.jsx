import React, { memo, useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'

const PRICE_RANGES = [
    { label: 'Under ₹1,000', min: 0, max: 1000 },
    { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
    { label: '₹5,000 – ₹15,000', min: 5000, max: 15000 },
    { label: '₹15,000 – ₹50,000', min: 15000, max: 50000 },
    { label: 'Over ₹50,000', min: 50000, max: Infinity },
]

const RATING_OPTIONS = [
    { label: '4★ & Up', value: 4 },
    { label: '3★ & Up', value: 3 },
    { label: '2★ & Up', value: 2 },
]

function FilterContent({
    categories,
    selectedCategories,
    onToggleCategory,
    selectedPriceRanges,
    onTogglePriceRange,
    minRating,
    onSetMinRating,
    conditionFilter,
    onSetCondition,
    includeOutOfStock,
    onToggleOutOfStock,
    productCounts,
    hideConditionFilter,
}) {
    const [categorySearch, setCategorySearch] = useState('')
    const [showAllCategories, setShowAllCategories] = useState(false)

    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return categories
        return categories.filter(c =>
            c.toLowerCase().includes(categorySearch.toLowerCase())
        )
    }, [categories, categorySearch])

    const visibleCategories = showAllCategories
        ? filteredCategories
        : filteredCategories.slice(0, 5)

    return (
        <div className="space-y-xl">
            {/* ── Price Range ── */}
            <section>
                <h3 className="text-sm font-bold text-text-primary mb-md">Price</h3>
                <ul className="space-y-1">
                    {PRICE_RANGES.map((range, i) => (
                        <li key={i}>
                            <label className="flex items-center gap-sm py-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedPriceRanges.some(
                                        r => r.min === range.min && r.max === range.max
                                    )}
                                    onChange={() => onTogglePriceRange(range)}
                                    className="w-4 h-4 rounded border-border-default text-trust focus:ring-trust cursor-pointer accent-trust"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-fast">
                                    {range.label}
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ── Rating ── (radios: only one effective value) */}
            <section>
                <h3 className="text-sm font-bold text-text-primary mb-md">Customer Rating</h3>
                <ul className="space-y-1">
                    {RATING_OPTIONS.map(opt => (
                        <li key={opt.value}>
                            <label className="flex items-center gap-sm py-2 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="rating-filter"
                                    checked={minRating === opt.value}
                                    onChange={() => onSetMinRating(opt.value)}
                                    className="w-4 h-4 border-border-default text-trust focus:ring-trust cursor-pointer accent-trust"
                                />
                                <span className="text-sm text-buy-secondary">
                                    {'★'.repeat(opt.value)}
                                    <span className="text-text-muted">{'★'.repeat(5 - opt.value)}</span>
                                </span>
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-fast">
                                    & Up
                                </span>
                            </label>
                        </li>
                    ))}
                    {minRating > 0 && (
                        <li>
                            <button
                                type="button"
                                onClick={() => onSetMinRating(0)}
                                className="text-xs text-trust hover:underline mt-2"
                            >
                                Clear rating
                            </button>
                        </li>
                    )}
                </ul>
            </section>

            {/* ── Category / Brand ── */}
            <section>
                <h3 className="text-sm font-bold text-text-primary mb-md">Category</h3>
                {categories.length > 5 && (
                    <div className="relative mb-sm">
                        <Search
                            size={14}
                            className="absolute left-sm top-1/2 -translate-y-1/2 text-text-muted"
                        />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={categorySearch}
                            onChange={e => setCategorySearch(e.target.value)}
                            aria-label="Search categories"
                            className="w-full pl-xl pr-sm py-2 text-base sm:text-sm border border-border-default rounded bg-surface focus:outline-none focus:border-trust transition-colors duration-fast"
                        />
                    </div>
                )}
                <ul className="space-y-1">
                    {visibleCategories.map(cat => (
                        <li key={cat}>
                            <label className="flex items-center gap-sm py-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedCategories.includes(cat)}
                                    onChange={() => onToggleCategory(cat)}
                                    className="w-4 h-4 rounded border-border-default text-trust focus:ring-trust cursor-pointer accent-trust"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-fast flex-1">
                                    {cat}
                                </span>
                                {productCounts?.[cat] != null && (
                                    <span className="text-xs text-text-muted">
                                        ({productCounts[cat]})
                                    </span>
                                )}
                            </label>
                        </li>
                    ))}
                </ul>
                {filteredCategories.length > 5 && (
                    <button
                        onClick={() => setShowAllCategories(v => !v)}
                        className="mt-sm text-xs text-trust hover:underline flex items-center gap-xs"
                    >
                        {showAllCategories ? (
                            <>Show less <ChevronUp size={12} /></>
                        ) : (
                            <>See more ({filteredCategories.length - 5}) <ChevronDown size={12} /></>
                        )}
                    </button>
                )}
            </section>

            {/* ── Condition ── */}
            {!hideConditionFilter && (
                <section>
                    <h3 className="text-sm font-bold text-text-primary mb-md">Condition</h3>
                    <ul className="space-y-1">
                        {['All', 'New', 'PreOwned'].map(val => (
                            <li key={val}>
                                <label className="flex items-center gap-sm py-2 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="condition"
                                        checked={conditionFilter === val}
                                        onChange={() => onSetCondition(val)}
                                        className="w-4 h-4 border-border-default text-trust focus:ring-trust cursor-pointer accent-trust"
                                    />
                                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-fast">
                                        {val === 'All' ? 'All Items' : val === 'New' ? 'Brand New' : 'Pre-Owned'}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ── Availability ── */}
            <section>
                <label className="flex items-center gap-sm py-2 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={includeOutOfStock}
                        onChange={onToggleOutOfStock}
                        className="w-4 h-4 rounded border-border-default text-trust focus:ring-trust cursor-pointer accent-trust"
                    />
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors duration-fast">
                        Include Out of Stock
                    </span>
                </label>
            </section>
        </div>
    )
}

function FilterSidebar(props) {
    const {
        isMobileOpen,
        onCloseMobile,
        onClearAll,
    } = props

    const footer = (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={onClearAll}
                className="flex-1 min-h-11 rounded-lg border border-border-default bg-surface text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
            >
                Clear All
            </button>
            <button
                type="button"
                onClick={onCloseMobile}
                className="flex-1 min-h-11 rounded-lg bg-trust text-sm font-bold text-white hover:opacity-90 transition-opacity"
            >
                Show Results
            </button>
        </div>
    )

    return (
        <>
            {/* Desktop: persistent sidebar */}
            <aside
                className="hidden lg:block sticky top-24 w-[240px] h-auto max-h-[calc(100dvh-6rem)] overflow-y-auto flex-shrink-0 scrollbar-thin"
                aria-label="Filters"
            >
                <FilterContent {...props} />
                <button
                    onClick={onClearAll}
                    className="mt-xl w-full text-sm text-trust hover:text-text-primary underline transition-colors duration-fast"
                >
                    Clear All Filters
                </button>
            </aside>

            {/* Mobile: bottom sheet */}
            <div className="lg:hidden">
                <BottomSheet
                    isOpen={!!isMobileOpen}
                    onClose={onCloseMobile}
                    title="Filters"
                    maxHeight="85dvh"
                    footer={footer}
                >
                    <FilterContent {...props} />
                </BottomSheet>
            </div>
        </>
    )
}

export default memo(FilterSidebar)
