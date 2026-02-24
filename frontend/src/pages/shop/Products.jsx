import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ProductCard from '../../components/shop/ProductCard';
import { Filter, Search } from 'lucide-react';
import { categoriesAPI, productsAPI } from '../../lib/api';
import SectionLoader from '../../components/ui/SectionLoader';

const Products = () => {
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [priceRange, setPriceRange] = useState({ min: 0, max: 500000 });
    const [conditionFilter, setConditionFilter] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [dbCategories, setDbCategories] = useState([]);

    useEffect(() => {
        categoriesAPI.getAll().then(setDbCategories).catch(console.error);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const cat = params.get('category');
        if (cat) {
            setSelectedCategories([cat]);
        }
    }, [location.search]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset page to 1 on filter change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, selectedCategories, priceRange, conditionFilter, sortBy]);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const params = {
                    page,
                    limit: 12
                };

                if (debouncedSearchTerm) params.search = debouncedSearchTerm;
                if (selectedCategories.length > 0) params.category = selectedCategories.join(',');
                if (priceRange.min > 0) params.minPrice = priceRange.min;
                if (priceRange.max < 500000) params.maxPrice = priceRange.max;
                if (conditionFilter === 'New') params.isSecondHand = 'false';
                else if (conditionFilter === 'PreOwned') params.isSecondHand = 'true';
                if (sortBy) params.sort = sortBy;

                const res = await productsAPI.getAll(params);
                console.log('Shop products response:', res);
                if (res && res.data) {
                    setProducts(res.data);
                    setTotalProducts(res.pagination?.total || res.data.length);
                    setTotalPages(res.pagination?.totalPages || 1);
                } else if (Array.isArray(res)) {
                    setProducts(res);
                    setTotalProducts(res.length);
                    setTotalPages(1);
                } else {
                    setProducts([]);
                }
            } catch (err) {
                console.error("Failed to fetch products:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [page, debouncedSearchTerm, selectedCategories, priceRange, conditionFilter, sortBy]);

    // Derived Categories
    const categories = useMemo(() => {
        return dbCategories.map(c => c.name).sort();
    }, [dbCategories]);

    // Toggle Category
    const toggleCategory = (category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Filter & Sort Logic removed, backend handles it directly.

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-heading font-bold mb-1">Shop High-Performance Gear</h1>
                    <p className="text-text-muted">Find the perfect components for your build.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Mobile Filter Toggle */}
                    <button
                        className="lg:hidden flex items-center gap-2 bg-surface border border-gray-200 px-4 py-2 rounded-lg"
                        onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                    >
                        <Filter size={18} /> Filters
                    </button>

                    {/* Sort Dropdown */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-surface border border-gray-200 text-text-main px-4 py-2 rounded-lg focus:outline-none focus:border-primary cursor-pointer"
                    >
                        <option value="newest">Newest Arrivals</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Top Rated</option>
                        <option value="name">Name: A-Z</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className={`w-full lg:w-64 space-y-6 ${isMobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search keywords..."
                            className="input-field pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Price Range */}
                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-4 text-text-muted">
                            <span className="font-medium text-sm">Price Range</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="input-field px-2 py-1 text-sm"
                                placeholder="Min"
                                value={priceRange.min}
                                onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                            />
                            <span className="text-text-muted">-</span>
                            <input
                                type="number"
                                className="input-field px-2 py-1 text-sm"
                                placeholder="Max"
                                value={priceRange.max}
                                onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-4 text-text-muted">
                            <Filter size={16} />
                            <span className="font-medium text-sm">Categories</span>
                        </div>
                        <ul className="space-y-2">
                            {categories.map(cat => (
                                <li key={cat}>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="peer appearance-none w-4 h-4 border border-gray-500 rounded bg-transparent checked:bg-primary checked:border-primary transition-all"
                                                checked={selectedCategories.includes(cat)}
                                                onChange={() => toggleCategory(cat)}
                                            />
                                            <svg className="absolute w-3 h-3 text-text-main hidden peer-checked:block pointer-events-none left-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </div>
                                        <span className={`text-sm transition-colors ${selectedCategories.includes(cat) ? 'text-text-main' : 'text-text-muted group-hover:text-text-main'}`}>
                                            {cat}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Condition Filter */}
                    <div className="glass-panel p-4">
                        <div className="flex items-center gap-2 mb-4 text-text-muted">
                            <Filter size={16} />
                            <span className="font-medium text-sm">Condition</span>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="radio" name="condition" checked={conditionFilter === 'All'} onChange={() => setConditionFilter('All')} className="w-4 h-4 text-primary bg-transparent border-gray-500 focus:ring-primary cursor-pointer" />
                                <span className={conditionFilter === 'All' ? 'text-text-main' : 'text-text-muted group-hover:text-text-main'}>All Items</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="radio" name="condition" checked={conditionFilter === 'New'} onChange={() => setConditionFilter('New')} className="w-4 h-4 text-primary bg-transparent border-gray-500 focus:ring-primary cursor-pointer" />
                                <span className={conditionFilter === 'New' ? 'text-text-main' : 'text-text-muted group-hover:text-text-main'}>Brand New</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input type="radio" name="condition" checked={conditionFilter === 'PreOwned'} onChange={() => setConditionFilter('PreOwned')} className="w-4 h-4 text-primary bg-transparent border-gray-500 focus:ring-primary cursor-pointer" />
                                <span className={conditionFilter === 'PreOwned' ? 'text-text-main' : 'text-text-muted group-hover:text-text-main'}>Pre-Owned</span>
                            </label>
                        </div>
                    </div>

                    <button
                        className="w-full text-sm text-text-muted hover:text-primary underline"
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedCategories([]);
                            setPriceRange({ min: 0, max: 500000 });
                            setConditionFilter('All');
                            setSortBy('newest');
                        }}
                    >
                        Reset All Filters
                    </button>
                </aside>

                {/* Product Grid */}
                <div className="flex-grow">
                    {loading ? (
                        <SectionLoader message="Fetching products..." />
                    ) : products.length === 0 ? (
                        <div className="text-center py-20 bg-surface/50 rounded-xl border border-dashed border-gray-700">
                            <p className="text-text-muted text-lg">No products found for your filters.</p>
                            <button
                                className="text-primary mt-2 font-medium hover:underline"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedCategories([]);
                                    setPriceRange({ min: 0, max: 500000 });
                                }}
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-text-muted mb-4">Showing {products.length} of {totalProducts} results</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.map(product => (
                                    <div key={product.id} className="h-full">
                                        <ProductCard product={product} />
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-12 bg-surface/50 p-4 rounded-xl border border-gray-100">
                                    <button
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                                        disabled={page === 1 || loading}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm font-bold px-4 text-text-main">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-primary-content hover:bg-primary/90'}`}
                                        disabled={page === totalPages || loading}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
};

export default Products;
