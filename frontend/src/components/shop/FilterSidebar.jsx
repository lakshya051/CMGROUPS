import React, { memo, useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react'

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

function FilterSidebar({
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
    onClearAll,
    isMobileOpen,
    onCloseMobile,
    productCounts,
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
        <>
            {/* Mobile overlay backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={onCloseMobile}
                />
            )}

            <aside
                className={`
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:sticky top-0 lg:top-24 left-0
          w-[280px] lg:w-[240px] h-full lg:h-auto lg:max-h-[calc(100vh-6rem)]
          overflow-y-auto bg-surface lg:bg-transparent
          z-50 lg:z-auto
          p-lg lg:p-0
          transition-transform duration-smooth
          flex-shrink-0
          scrollbar-thin
        `}
            >
                {/* Mobile header */}
                <div className="flex items-center justify-between mb-lg lg:hidden">
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-sm">
                        <SlidersHorizontal size={18} /> Filters
                    </h2>
                    <button
                        onClick={onCloseMobile}
                        className="p-xs rounded hover:bg-surface-hover transition-colors duration-fast"
                    >
                        <X size={20} className="text-text-secondary" />
                    </button>
                </div>

                <div className="space-y-xl">
                    {/* ── Price Range ── */}
                    <section>
                        <h3 className="text-sm font-bold text-text-primary mb-md">Price</h3>
                        <ul className="space-y-sm">
                            {PRICE_RANGES.map((range, i) => (
                                <li key={i}>
                                    <label className="flex items-center gap-sm cursor-pointer group">
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

                    {/* ── Rating ── */}
                    <section>
                        <h3 className="text-sm font-bold text-text-primary mb-md">Customer Rating</h3>
                        <ul className="space-y-sm">
                            {RATING_OPTIONS.map(opt => (
                                <li key={opt.value}>
                                    <label className="flex items-center gap-sm cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={minRating === opt.value}
                                            onChange={() =>
                                                onSetMinRating(minRating === opt.value ? 0 : opt.value)
                                            }
                                            className="w-4 h-4 rounded border-border-default text-trust focus:ring-trust cursor-pointer accent-trust"
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
                                    className="w-full pl-xl pr-sm py-xs text-sm border border-border-default rounded bg-surface focus:outline-none focus:border-trust transition-colors duration-fast"
                                />
                            </div>
                        )}
                        <ul className="space-y-sm">
                            {visibleCategories.map(cat => (
                                <li key={cat}>
                                    <label className="flex items-center gap-sm cursor-pointer group">
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
                    <section>
                        <h3 className="text-sm font-bold text-text-primary mb-md">Condition</h3>
                        <ul className="space-y-sm">
                            {['All', 'New', 'PreOwned'].map(val => (
                                <li key={val}>
                                    <label className="flex items-center gap-sm cursor-pointer group">
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

                    {/* ── Availability ── */}
                    <section>
                        <label className="flex items-center gap-sm cursor-pointer group">
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

                    {/* ── Clear All ── */}
                    <button
                        onClick={onClearAll}
                        className="w-full text-sm text-trust hover:text-text-primary underline transition-colors duration-fast"
                    >
                        Clear All Filters
                    </button>
                </div>
            </aside>
        </>
    )
}

export default memo(FilterSidebar)
