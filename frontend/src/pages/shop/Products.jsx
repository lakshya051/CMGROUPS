import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import ProductCard from '../../components/shop/ProductCard'
import BundleCard from '../../components/shop/BundleCard'
import FilterSidebar from '../../components/shop/FilterSidebar'
import { SkeletonCard, EmptyState } from '../../components/ui/index'
import { useShop } from '../../context/ShopContext'
import {
    Filter, SearchX, Search, X, ArrowLeftRight, ChevronLeft, ChevronRight, Layers,
} from 'lucide-react'
import { categoriesAPI, productsAPI, bundlesAPI } from '../../lib/api'

const LIMIT = 12

const Products = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { compareList, removeFromCompare, clearCompare } = useShop()

    // ─── State ──────────────────────────────────────────────────
    const [products, setProducts] = useState([])
    const [totalProducts, setTotalProducts] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1)
    const [totalPages, setTotalPages] = useState(1)

    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get('q') || '')

    const [selectedCategories, setSelectedCategories] = useState(() => {
        const cat = searchParams.get('category')
        return cat ? cat.split(',') : []
    })

    const [selectedPriceRanges, setSelectedPriceRanges] = useState(() => {
        const pr = searchParams.get('price')
        if (!pr) return []
        return pr.split(',').map(p => {
            const [min, max] = p.split('-').map(Number)
            return { min, max: max || Infinity }
        })
    })

    const [minRating, setMinRating] = useState(
        () => Number(searchParams.get('rating')) || 0
    )
    const [conditionFilter, setConditionFilter] = useState(
        searchParams.get('condition') || 'All'
    )
    const [includeOutOfStock, setIncludeOutOfStock] = useState(
        searchParams.get('oos') === '1'
    )
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
    const [dbCategories, setDbCategories] = useState([])

    const [featuredBundles, setFeaturedBundles] = useState([])

    // ─── Fetch Categories + Bundles ──────────────────────────────
    useEffect(() => {
        categoriesAPI.getAll().then(setDbCategories).catch(console.error)
        bundlesAPI.getAll({ displayOn: 'home' })
            .then(b => setFeaturedBundles((b || []).slice(0, 4)))
            .catch(() => setFeaturedBundles([]))
    }, [])

    // ─── Sync URL changes to local state ────────────────────────
    const urlSyncRef = useRef(false)
    useEffect(() => {
        const urlQ = searchParams.get('q') || '';
        if (urlQ !== debouncedSearchTerm) {
            urlSyncRef.current = true
            setSearchTerm(urlQ);
            setDebouncedSearchTerm(urlQ);
        }
    }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Debounce search (skip when driven by URL change) ───────
    useEffect(() => {
        if (urlSyncRef.current) {
            urlSyncRef.current = false
            return
        }
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // ─── Reset page on filter change ───────────────────────────
    useEffect(() => {
        setPage(1)
    }, [debouncedSearchTerm, selectedCategories, selectedPriceRanges, minRating, conditionFilter, includeOutOfStock, sortBy])

    // ─── Sync filters → URL params (skip if nothing changed) ───
    const prevParamsStr = useRef(searchParams.toString())
    useEffect(() => {
        const params = new URLSearchParams()
        if (debouncedSearchTerm) params.set('q', debouncedSearchTerm)
        if (selectedCategories.length) params.set('category', selectedCategories.join(','))
        if (selectedPriceRanges.length) {
            params.set(
                'price',
                selectedPriceRanges
                    .map(r => `${r.min}-${r.max === Infinity ? '' : r.max}`)
                    .join(',')
            )
        }
        if (minRating) params.set('rating', String(minRating))
        if (conditionFilter !== 'All') params.set('condition', conditionFilter)
        if (includeOutOfStock) params.set('oos', '1')
        if (sortBy !== 'newest') params.set('sort', sortBy)
        if (page > 1) params.set('page', String(page))

        const nextStr = params.toString()
        if (nextStr !== prevParamsStr.current) {
            prevParamsStr.current = nextStr
            setSearchParams(params, { replace: true })
        }
    }, [debouncedSearchTerm, selectedCategories, selectedPriceRanges, minRating, conditionFilter, includeOutOfStock, sortBy, page, setSearchParams])

    // ─── Fetch Products ─────────────────────────────────────────
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true)
            setError(null)
            try {
                const params = { page, limit: LIMIT }

                if (debouncedSearchTerm) params.search = debouncedSearchTerm
                if (selectedCategories.length > 0) params.category = selectedCategories.join(',')

                // Compute effective price range from checkbox selections
                if (selectedPriceRanges.length > 0) {
                    const effectiveMin = Math.min(...selectedPriceRanges.map(r => r.min))
                    const effectiveMax = Math.max(...selectedPriceRanges.map(r => r.max))
                    if (effectiveMin > 0) params.minPrice = effectiveMin
                    if (effectiveMax < Infinity) params.maxPrice = effectiveMax
                }

                if (conditionFilter === 'New') params.isSecondHand = 'false'
                else if (conditionFilter === 'PreOwned') params.isSecondHand = 'true'
                if (sortBy) params.sort = sortBy

                const res = await productsAPI.getAll(params)
                if (res && res.data) {
                    setProducts(res.data)
                    setTotalProducts(res.pagination?.total || res.data.length)
                    setTotalPages(res.pagination?.totalPages || 1)
                } else if (Array.isArray(res)) {
                    setProducts(res)
                    setTotalProducts(res.length)
                    setTotalPages(1)
                } else {
                    setProducts([])
                }
            } catch (err) {
                console.error('Failed to fetch products:', err)
                setError('Something went wrong while loading products. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [page, debouncedSearchTerm, selectedCategories, selectedPriceRanges, conditionFilter, sortBy, minRating, includeOutOfStock])

    // ─── Derived ────────────────────────────────────────────────
    const categories = useMemo(() => dbCategories.map(c => c.name).sort(), [dbCategories])

    const activeFilterCount =
        selectedCategories.length +
        selectedPriceRanges.length +
        (minRating ? 1 : 0) +
        (conditionFilter !== 'All' ? 1 : 0) +
        (includeOutOfStock ? 1 : 0)

    const startItem = (page - 1) * LIMIT + 1
    const endItem = Math.min(page * LIMIT, totalProducts)

    // ─── Handlers ───────────────────────────────────────────────
    const toggleCategory = useCallback((cat) =>
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        ), [])

    const togglePriceRange = useCallback((range) =>
        setSelectedPriceRanges(prev => {
            const exists = prev.some(r => r.min === range.min && r.max === range.max)
            return exists
                ? prev.filter(r => !(r.min === range.min && r.max === range.max))
                : [...prev, range]
        }), [])

    const clearAllFilters = useCallback(() => {
        setSearchTerm('')
        setSelectedCategories([])
        setSelectedPriceRanges([])
        setMinRating(0)
        setConditionFilter('All')
        setIncludeOutOfStock(false)
        setSortBy('newest')
    }, [])

    const removeCategoryPill = useCallback((cat) =>
        setSelectedCategories(prev => prev.filter(c => c !== cat))
    , [])

    const removePriceRangePill = useCallback((range) =>
        setSelectedPriceRanges(prev =>
            prev.filter(r => !(r.min === range.min && r.max === range.max))
        )
    , [])

    const priceRangeLabel = useCallback((r) =>
        r.max === Infinity ? `Over ₹${r.min.toLocaleString('en-IN')}` : `₹${r.min.toLocaleString('en-IN')} – ₹${r.max.toLocaleString('en-IN')}`
    , [])

    const toggleOutOfStock = useCallback(
        () => setIncludeOutOfStock(v => !v),
        []
    )

    const closeMobileFilters = useCallback(
        () => setIsMobileFiltersOpen(false),
        []
    )

    const openMobileFilters = useCallback(
        () => setIsMobileFiltersOpen(true),
        []
    )

    const productCardGrid = useMemo(
        () => products.map(product => (
            <div key={product.id} className="h-full">
                <ProductCard product={product} />
            </div>
        )),
        [products]
    )


    // ─── Render ─────────────────────────────────────────────────
    return (
        <div className="container mx-auto px-4 sm:px-lg py-4 sm:py-lg pb-8 md:pb-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-lg">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-xs">
                        Shop High-Performance Gear
                    </h1>
                    <p className="text-sm text-text-secondary">
                        Find the perfect components for your build.
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-md">
                    {/* Local Search Input */}
                    <div className="flex relative flex-1 md:flex-none">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-sm bg-surface border border-border-default rounded-lg text-base sm:text-sm focus:outline-none focus:border-trust transition-colors duration-fast md:w-64"
                        />
                    </div>

                    {/* Mobile filter toggle */}
                    <button
                        className="lg:hidden flex items-center gap-1.5 sm:gap-sm bg-surface border border-border-default px-3 sm:px-md py-sm rounded-lg text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors duration-fast shrink-0"
                        onClick={openMobileFilters}
                    >
                        <Filter size={16} />
                        <span className="hidden xs:inline">Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-trust text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Sort dropdown */}
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="bg-surface border border-border-default text-text-primary px-2 sm:px-md py-sm rounded-lg text-sm focus:outline-none focus:border-trust cursor-pointer transition-colors duration-fast min-w-0"
                    >
                        <option value="newest">Newest</option>
                        <option value="price-low">Price: Low</option>
                        <option value="price-high">Price: High</option>
                        <option value="rating">Top Rated</option>
                        <option value="name">A-Z</option>
                    </select>
                </div>
            </div>

            {/* Bundle Deals Banner */}
            {featuredBundles.length > 0 && (
                <div className="mb-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                            <Layers size={16} className="text-trust" />
                            Bundle Deals
                        </h2>
                        <Link to="/bundles" className="text-xs text-trust font-semibold hover:underline">
                            View All Bundles
                        </Link>
                    </div>
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide -mx-1 px-1">
                        {featuredBundles.map(bundle => (
                            <div key={bundle.id} className="snap-start">
                                <BundleCard bundle={bundle} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Body: Sidebar + Main */}
            <div className="flex gap-xl">
                <FilterSidebar
                    categories={categories}
                    selectedCategories={selectedCategories}
                    onToggleCategory={toggleCategory}
                    selectedPriceRanges={selectedPriceRanges}
                    onTogglePriceRange={togglePriceRange}
                    minRating={minRating}
                    onSetMinRating={setMinRating}
                    conditionFilter={conditionFilter}
                    onSetCondition={setConditionFilter}
                    includeOutOfStock={includeOutOfStock}
                    onToggleOutOfStock={toggleOutOfStock}
                    onClearAll={clearAllFilters}
                    isMobileOpen={isMobileFiltersOpen}
                    onCloseMobile={closeMobileFilters}
                />

                {/* Main content */}
                <main className="flex-1 min-w-0">
                    {/* Active filter pills */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap items-center gap-sm mb-md">
                            {selectedCategories.map(cat => (
                                <FilterPill key={`cat-${cat}`} label={cat} onRemove={() => removeCategoryPill(cat)} />
                            ))}
                            {selectedPriceRanges.map((r, i) => (
                                <FilterPill key={`price-${i}`} label={priceRangeLabel(r)} onRemove={() => removePriceRangePill(r)} />
                            ))}
                            {minRating > 0 && (
                                <FilterPill label={`${minRating}★ & Up`} onRemove={() => setMinRating(0)} />
                            )}
                            {conditionFilter !== 'All' && (
                                <FilterPill
                                    label={conditionFilter === 'New' ? 'Brand New' : 'Pre-Owned'}
                                    onRemove={() => setConditionFilter('All')}
                                />
                            )}
                            {includeOutOfStock && (
                                <FilterPill label="Incl. Out of Stock" onRemove={() => setIncludeOutOfStock(false)} />
                            )}
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-trust hover:underline font-medium"
                            >
                                Clear All
                            </button>
                        </div>
                    )}

                    {/* Sort bar */}
                    {!loading && !error && products.length > 0 && (
                        <div className="flex items-center justify-between mb-md">
                            <p className="text-sm text-text-secondary">
                                Showing <span className="font-medium text-text-primary">{startItem}–{endItem}</span> of{' '}
                                <span className="font-medium text-text-primary">{totalProducts}</span> results
                            </p>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-lg text-center">
                            <p className="text-sm text-red-700 mb-sm">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-sm text-trust hover:underline font-medium"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* Loading: skeleton grid */}
                    {loading && !error && (
                        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-lg">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && !error && products.length === 0 && (
                        <EmptyState
                            icon={SearchX}
                            title="No products found"
                            subtitle="Try adjusting your filters or search term to find what you're looking for."
                            ctaLabel="Clear Filters"
                            onCta={clearAllFilters}
                        />
                    )}

                    {/* Product grid */}
                    {!loading && !error && products.length > 0 && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-lg">
                                {productCardGrid}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 sm:gap-sm mt-8 sm:mt-2xl mb-4">
                                    <button
                                        className="flex items-center gap-1 sm:gap-xs px-3 sm:px-md py-2.5 sm:py-sm rounded-lg text-sm font-medium border border-border-default bg-surface hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-fast touch-manipulation min-h-[44px]"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft size={16} /> <span className="hidden xs:inline">Previous</span><span className="xs:hidden">Prev</span>
                                    </button>
                                    <span className="text-sm font-bold text-text-primary px-2 sm:px-md whitespace-nowrap">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        className="flex items-center gap-1 sm:gap-xs px-3 sm:px-md py-2.5 sm:py-sm rounded-lg text-sm font-medium bg-trust text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-fast touch-manipulation min-h-[44px]"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* ─── Sticky Compare Bar ────────────────────────────────── */}
            {compareList.length > 0 && (
                <div className="fixed left-0 right-0 z-[45] bg-surface border-t border-border-default shadow-[0_-4px_24px_rgba(0,0,0,0.08)] bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:bottom-0 md:safe-bottom">
                    <div className="container mx-auto px-4 sm:px-lg py-3 sm:py-md flex items-center justify-between">
                        <div className="flex items-center gap-md">
                            <ArrowLeftRight size={18} className="text-trust" />
                            <span className="text-sm font-medium text-text-primary">
                                {compareList.length} item{compareList.length > 1 ? 's' : ''} selected to compare
                            </span>
                        </div>
                        <div className="flex items-center gap-sm">
                            <button
                                onClick={clearCompare}
                                className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-fast"
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => navigate('/compare')}
                                className="bg-trust text-white text-sm font-bold px-lg py-sm rounded-lg hover:opacity-90 transition-opacity duration-fast"
                            >
                                Compare Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Filter Pill helper ─────────────────────────────────────────────
function FilterPill({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-xs bg-trust/10 text-trust text-xs font-medium px-sm py-xs rounded-full">
            {label}
            <button
                onClick={onRemove}
                className="hover:text-text-primary transition-colors duration-fast"
                aria-label={`Remove ${label} filter`}
            >
                <X size={12} />
            </button>
        </span>
    )
}

export default Products
