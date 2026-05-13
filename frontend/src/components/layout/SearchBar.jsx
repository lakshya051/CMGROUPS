import React, { useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export const SEARCH_CATEGORIES = [
    { value: 'products', label: 'Products', path: '/products' },
    { value: 'services', label: 'Services', path: '/services' },
    { value: 'courses', label: 'Courses', path: '/courses' },
];

const SearchBar = ({
    searchQuery,
    setSearchQuery,
    searchCategory,
    setSearchCategory,
    handleSearch,
    currentSearchContext,
    hasSearchQuery,
    handleClearSearch,
    isMobile,
}) => {
    const [showMobileCatSelect, setShowMobileCatSelect] = useState(false);

    if (isMobile) {
        return (
            <div className="relative px-4 py-2 bg-surface">
                <form onSubmit={handleSearch} className="relative flex w-full">
                    <button
                        type="button"
                        onClick={() => setShowMobileCatSelect(!showMobileCatSelect)}
                        aria-haspopup="listbox"
                        aria-expanded={showMobileCatSelect}
                        className="flex items-center gap-0.5 px-3 min-h-11 bg-page-bg border border-r-0 border-border-default rounded-l-lg text-sm text-text-secondary hover:bg-surface-hover shrink-0"
                    >
                        {SEARCH_CATEGORIES.find(c => c.value === searchCategory)?.label}
                        <ChevronDown size={14} />
                    </button>
                    <input
                        type="text"
                        inputMode="search"
                        placeholder={currentSearchContext.placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search"
                        className="flex-1 min-w-0 border border-border-default bg-background px-3 py-3 text-base text-text-primary focus:outline-none focus:border-trust focus:ring-2 focus:ring-trust/20"
                    />
                    <button
                        type="submit"
                        aria-label="Search"
                        className="flex items-center justify-center min-w-11 bg-trust hover:bg-trust/90 rounded-r-lg text-white transition-colors shrink-0"
                    >
                        <Search size={18} />
                    </button>
                </form>
                {showMobileCatSelect && (
                    <div
                        role="listbox"
                        className="absolute left-4 right-4 mt-1 bg-surface border border-border-default rounded-lg shadow-card z-50"
                    >
                        {SEARCH_CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => { setSearchCategory(cat.value); setShowMobileCatSelect(false); }}
                                role="option"
                                aria-selected={searchCategory === cat.value}
                                className={`block w-full text-left px-4 py-3 min-h-11 text-sm hover:bg-surface-hover transition-colors ${searchCategory === cat.value ? 'text-trust font-medium' : 'text-text-primary'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-w-0 px-1">
            <form onSubmit={handleSearch} className="mx-auto w-full max-w-2xl">
                <div className="relative flex w-full rounded-lg overflow-hidden border-2 border-trust focus-within:border-trust shadow-sm">
                    <select
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
                        className="bg-page-bg border-r border-border-default px-2 py-2 text-xs text-text-secondary focus:outline-none cursor-pointer hover:bg-surface-hover"
                    >
                        {SEARCH_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder={currentSearchContext.placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search"
                        className="flex-1 min-w-0 px-3 py-2 bg-white text-sm text-text-primary focus:outline-none"
                    />
                    {hasSearchQuery && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="px-2 text-text-muted hover:text-text-primary transition-colors"
                            aria-label="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        type="submit"
                        className="px-3 bg-trust hover:bg-trust/90 text-white transition-colors"
                        aria-label="Search"
                    >
                        <Search size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SearchBar;
