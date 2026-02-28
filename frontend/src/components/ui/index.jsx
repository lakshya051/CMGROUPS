import { Minus, Plus } from 'lucide-react'
import { MAX_CART_QUANTITY } from '../../constants'

// ─── 1. PriceDisplay ────────────────────────────────────────────────────────────
export function PriceDisplay({ price, size = 'base', originalPrice }) {
  const formatted = price.toLocaleString('en-IN')
  const sizeClass =
    size === 'xl' ? 'text-price-xl' : size === 'lg' ? 'text-price-lg' : 'text-price'
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className={`${sizeClass} text-text-primary font-bold`}>
        <sup className="text-sm align-super">₹</sup>{formatted}
      </span>
      {originalPrice && (
        <>
          <span className="text-sm text-text-muted line-through">
            ₹{originalPrice.toLocaleString('en-IN')}
          </span>
          <span className="text-sm text-deal font-semibold">-{discount}%</span>
        </>
      )}
    </div>
  )
}

// ─── 2. StarRating ──────────────────────────────────────────────────────────────
export function StarRating({ rating, count }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) return 'full'
    if (i < rating) return 'partial'
    return 'empty'
  })

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {stars.map((type, i) => (
          <span
            key={i}
            className={type === 'empty' ? 'text-text-muted' : 'text-buy-secondary'}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-xs text-trust">{rating}</span>
      {count != null && (
        <span className="text-xs text-text-muted">
          ({count.toLocaleString('en-IN')})
        </span>
      )}
    </div>
  )
}

// ─── 3. Badge ───────────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  bestseller: 'bg-badge-bestseller text-white',
  deal: 'bg-deal text-white',
  choice: 'bg-badge-choice text-badge-choice-text',
  new: 'bg-trust text-white',
}
const BADGE_LABELS = {
  bestseller: 'Best Seller',
  deal: 'Limited Time Deal',
  choice: '★ TechNova Choice',
  new: 'New',
}

export function Badge({ type }) {
  if (!type || !BADGE_STYLES[type]) return null
  return (
    <span className={`text-xs font-bold px-sm py-xs rounded ${BADGE_STYLES[type]}`}>
      {BADGE_LABELS[type]}
    </span>
  )
}

// ─── 4. SkeletonCard ────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div
      className="bg-surface rounded border border-border-default p-md animate-pulse"
      aria-busy="true"
    >
      <div className="bg-page-bg h-48 rounded mb-md" />
      <div className="bg-page-bg h-4  rounded w-3/4 mb-sm" />
      <div className="bg-page-bg h-4  rounded w-1/2 mb-sm" />
      <div className="bg-page-bg h-6  rounded w-1/3 mb-md" />
      <div className="bg-page-bg h-9  rounded" />
    </div>
  )
}

// ─── 5. QuantitySelector ────────────────────────────────────────────────────────
export function QuantitySelector({ value, onChange, min = 1, max = MAX_CART_QUANTITY }) {
  return (
    <div className="flex items-center border border-border-default rounded overflow-hidden">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="px-sm py-xs hover:bg-surface-hover disabled:opacity-40 transition-colors duration-base"
      >
        <Minus size={14} />
      </button>
      <span className="px-md py-xs text-sm font-medium min-w-[2rem] text-center">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="px-sm py-xs hover:bg-surface-hover disabled:opacity-40 transition-colors duration-base"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

// ─── 6. ProgressBar ─────────────────────────────────────────────────────────────
const COLOR_MAP = {
  'buy-primary': 'bg-buy-primary',
  'success': 'bg-success',
  'deal': 'bg-deal',
  'urgency': 'bg-urgency',
  'trust': 'bg-trust',
}

export function ProgressBar({ value, max, color = 'buy-primary' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const bgClass = COLOR_MAP[color] || 'bg-buy-primary'

  return (
    <div className="w-full bg-page-bg border border-border-default rounded-full h-2 overflow-hidden">
      <div
        className={`h-full ${bgClass} rounded-full transition-all duration-slow`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── 7. EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, ctaLabel, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center py-2xl text-center gap-md">
      {Icon && <Icon size={48} className="text-text-muted" />}
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {subtitle && (
        <p className="text-sm text-text-secondary max-w-xs">{subtitle}</p>
      )}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-sm bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold px-lg py-sm rounded transition-colors duration-base"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
