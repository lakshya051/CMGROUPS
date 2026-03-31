import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { bundlesAPI, reviewsAPI } from '../../lib/api';
import { useSEO } from '../../hooks/useSEO';
import { handleImageError } from '../../utils/image';
import PriceDisplay from '../../components/common/PriceDisplay';
import { EmptyState } from '../../components/ui/index';
import Button from '../../components/ui/Button';
import {
    ShoppingCart, Zap, Layers, Package, ChevronRight,
    AlertCircle, Tag, Wrench, GraduationCap, Star, ThumbsUp, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const BundleReviewSection = ({ bundleId }) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchReviews = async () => {
        try {
            const data = await reviewsAPI.getForBundle(bundleId);
            setReviews(Array.isArray(data) ? data : []);
        } catch { setReviews([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { setLoading(true); fetchReviews(); }, [bundleId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) return toast.error('Please select a rating');
        setSubmitting(true);
        try {
            await reviewsAPI.createBundleReview(bundleId, rating, comment);
            toast.success('Review submitted!');
            setShowForm(false);
            setRating(5);
            setComment('');
            fetchReviews();
        } catch (err) { toast.error(err.message || 'Failed to submit review'); }
        finally { setSubmitting(false); }
    };

    const handleHelpful = async (reviewId) => {
        if (!user) return toast.error('Please login to vote');
        try { await reviewsAPI.voteBundleHelpful(reviewId); fetchReviews(); }
        catch { toast.error('Failed to vote'); }
    };

    if (loading) return <div className="animate-pulse h-32 bg-page-bg rounded-lg my-8" />;

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;

    return (
        <div className="mt-12 bg-page-bg rounded-lg p-6 border border-border-default">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-6 bg-surface p-4 rounded-lg border border-border-default">
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-text-primary">{avgRating}</div>
                        <div className="flex text-warning justify-center mb-0.5">
                            {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= Math.round(Number(avgRating)) ? 'currentColor' : 'none'} />)}
                        </div>
                        <div className="text-xs text-text-muted font-medium">{reviews.length} Reviews</div>
                    </div>
                </div>
                {user ? (
                    <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'primary'} className="text-sm">
                        {showForm ? 'Cancel' : 'Write a Review'}
                    </Button>
                ) : (
                    <p className="text-sm text-text-muted">Log in to write a review.</p>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-surface p-5 rounded-lg border border-border-default mb-6">
                    <h3 className="font-bold text-lg mb-4">Review this Bundle</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-1">Rating</label>
                        <div className="flex gap-1.5">
                            {[1,2,3,4,5].map(s => (
                                <button key={s} type="button" onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                                    <Star size={28} className={s <= rating ? 'text-warning fill-warning' : 'text-border-default'} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-1">Comment</label>
                        <textarea className="input-field min-h-[100px] resize-y" value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-10 bg-surface rounded-lg border border-dashed border-border-default">
                        <Star size={40} className="mx-auto text-text-muted/50 mb-3" />
                        <p className="text-text-primary font-bold">No reviews yet</p>
                        <p className="text-text-muted text-sm">Be the first to review this bundle!</p>
                    </div>
                ) : reviews.map(review => {
                    const hasVoted = user && Array.isArray(review.voters) && review.voters.includes(user.id);
                    return (
                        <div key={review.id} className="bg-surface p-4 rounded-lg border border-border-default">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-primary/10 text-primary font-bold rounded-full flex items-center justify-center text-sm">
                                        {review.user?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm flex items-center gap-1.5">
                                            {review.user?.name || 'User'}
                                            {review.isVerified && <span className="text-[9px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-bold"><CheckCircle size={8} className="inline mr-0.5" />Verified</span>}
                                        </div>
                                        <div className="text-[11px] text-text-muted">{new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                    </div>
                                </div>
                                <div className="flex gap-0.5 text-warning">
                                    {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={s <= review.rating ? 'currentColor' : 'none'} />)}
                                </div>
                            </div>
                            {review.comment && <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">{review.comment}</p>}
                            <div className="mt-3 pt-2 border-t border-border-default flex items-center justify-between">
                                <span className="text-[11px] text-text-muted">Helpful?</span>
                                <button onClick={() => handleHelpful(review.id)} className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${hasVoted ? 'bg-primary/10 text-primary' : 'bg-surface text-text-secondary border border-border-default hover:bg-surface-hover'}`}>
                                    <ThumbsUp size={12} className={hasVoted ? 'fill-primary' : ''} /> {review.helpfulVotes || 0}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const BundleDetail = () => {
    const { idOrSlug } = useParams();
    const { addBundleToCart, initBuyNowMultiple } = useShop();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [bundle, setBundle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [relatedBundles, setRelatedBundles] = useState([]);

    useSEO({
        title: bundle ? `${bundle.name} — Bundle Deal` : 'Bundle Deal',
        description: bundle?.description || 'Save more with this bundle deal.',
    });

    useEffect(() => {
        setLoading(true);
        setError(false);

        const isNumeric = /^\d+$/.test(idOrSlug);
        const fetchPromise = isNumeric
            ? bundlesAPI.getById(idOrSlug)
            : bundlesAPI.getBySlug(idOrSlug);

        fetchPromise
            .then(data => {
                setBundle(data);
                return bundlesAPI.getAll({ displayOn: 'home' });
            })
            .then(allBundles => {
                const related = (allBundles || []).filter(b => b.id !== bundle?.id).slice(0, 4);
                setRelatedBundles(related);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [idOrSlug]);

    const handleAddToCart = () => {
        if (!user) {
            toast.error('Please sign in to add items to your cart');
            return;
        }
        addBundleToCart(bundle);
    };

    const handleBuyNow = () => {
        if (!user) {
            toast.error('Please sign in to continue');
            return;
        }
        const bundleInstanceId = `bundle-${bundle.id}-${Date.now()}`;
        const bundleInfo = {
            bundleId: bundle.id,
            bundleInstanceId,
            bundleName: bundle.name,
            bundlePrice: bundle.bundlePrice,
            isGiftable: bundle.isGiftable,
        };
        const productItems = (bundle.items || []).filter(bi => bi.itemType === 'product' && bi.product && bi.product.stock > 0);
        const entries = productItems.map(bi => {
            const prod = bi.product;
            const variant = prod.hasVariants && prod.variants?.length > 0
                ? (bi.variantId ? prod.variants.find(v => v.id === bi.variantId) : prod.variants[0])
                : null;
            return { product: prod, quantity: bi.quantity, variant, bundleInfo };
        });
        if (entries.length === 0) {
            toast.error('No in-stock items in this bundle');
            return;
        }
        if (initBuyNowMultiple(entries)) {
            navigate('/checkout', { state: { buyNow: true } });
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-64 bg-surface rounded-xl" />
                    <div className="h-8 bg-surface rounded w-1/3" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-surface rounded-lg" />)}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !bundle) {
        return (
            <div className="container mx-auto px-4 py-16">
                <EmptyState
                    icon={AlertCircle}
                    title="Bundle not found"
                    subtitle="This bundle may have expired or been removed."
                    ctaLabel="Browse Products"
                    onCta={() => navigate('/products')}
                />
            </div>
        );
    }

    const productItems = bundle.items.filter(bi => bi.itemType === 'product' && bi.product);
    const serviceItems = bundle.items.filter(bi => bi.itemType === 'service' && bi.serviceType);
    const courseItems = bundle.items.filter(bi => bi.itemType === 'course' && bi.course);
    const inStockCount = productItems.filter(bi => bi.product.stock > 0).length;

    return (
        <div className="container mx-auto px-4 py-6 pb-28 lg:pb-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-4">
                <Link to="/" className="hover:text-trust">Home</Link>
                <ChevronRight size={12} />
                <Link to="/products" className="hover:text-trust">Shop</Link>
                <ChevronRight size={12} />
                <span className="text-text-primary font-medium truncate">{bundle.name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
                {/* Left: Hero + Items */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Hero */}
                    <div className="relative bg-surface border border-border-default rounded-xl overflow-hidden">
                        {bundle.image ? (
                            <img
                                src={bundle.image}
                                alt={bundle.name}
                                onError={handleImageError}
                                className="w-full h-48 sm:h-64 object-cover"
                            />
                        ) : (
                            <div className="w-full h-48 sm:h-64 bg-gradient-to-br from-trust/10 to-primary/10 flex items-center justify-center">
                                <Package size={64} className="text-trust/30" />
                            </div>
                        )}
                        {bundle.savingsPercent > 0 && (
                            <div className="absolute top-3 left-3 bg-success text-white px-3 py-1 rounded-full text-sm font-bold">
                                Save {bundle.savingsPercent}%
                            </div>
                        )}
                        {bundle.isGiftable && (
                            <div className="absolute top-3 right-3 bg-primary text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <Tag size={12} /> Gift Ready
                            </div>
                        )}
                    </div>

                    <div>
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">{bundle.name}</h1>
                        {bundle.description && (
                            <p className="text-text-secondary mt-2 text-sm sm:text-base">{bundle.description}</p>
                        )}
                    </div>

                    {/* Items Grid */}
                    <div>
                        <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                            <Layers size={18} className="text-trust" />
                            What's Included ({bundle.items.length} items)
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {productItems.map(bi => (
                                <Link
                                    key={bi.id}
                                    to={`/products/${bi.product.id}`}
                                    className="flex gap-3 p-3 bg-surface border border-border-default rounded-lg hover:border-trust/40 transition-colors group"
                                >
                                    <div className="w-16 h-16 bg-page-bg border border-border-default rounded flex items-center justify-center p-1 shrink-0">
                                        <img
                                            src={bi.product.images?.[0]}
                                            alt={bi.product.title}
                                            onError={handleImageError}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-trust transition-colors">{bi.product.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <PriceDisplay sellingPrice={bi.product.price} size="sm" showBadge={false} />
                                            {bi.quantity > 1 && <span className="text-xs text-text-muted">x{bi.quantity}</span>}
                                        </div>
                                        {bi.product.stock <= 0 && (
                                            <p className="text-[10px] text-deal font-medium mt-0.5">Out of stock</p>
                                        )}
                                    </div>
                                </Link>
                            ))}

                            {serviceItems.map(bi => (
                                <div
                                    key={bi.id}
                                    className="flex gap-3 p-3 bg-trust/5 border border-trust/20 rounded-lg"
                                >
                                    <div className="w-16 h-16 bg-trust/10 rounded flex items-center justify-center shrink-0">
                                        <Wrench size={24} className="text-trust" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary">{bi.serviceType.title}</p>
                                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{bi.serviceType.description}</p>
                                        <p className="text-[10px] text-trust font-medium mt-1">Service included — schedule after purchase</p>
                                    </div>
                                </div>
                            ))}

                            {courseItems.map(bi => (
                                <div
                                    key={bi.id}
                                    className="flex gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
                                >
                                    <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center shrink-0">
                                        {bi.course.thumbnail ? (
                                            <img src={bi.course.thumbnail} alt={bi.course.title} className="w-full h-full object-cover rounded" onError={handleImageError} />
                                        ) : (
                                            <GraduationCap size={24} className="text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text-primary">{bi.course.title}</p>
                                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{bi.course.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Price + CTA (sticky) */}
                <div className="lg:col-span-2">
                    <div className="lg:sticky lg:top-24 bg-surface border border-border-default rounded-xl p-5 space-y-4">
                        <div className="text-center">
                            {bundle.itemTotal > bundle.bundlePrice && (
                                <p className="text-sm text-text-muted line-through">₹{bundle.itemTotal.toLocaleString('en-IN')}</p>
                            )}
                            <p className="text-3xl font-bold text-text-primary">₹{bundle.bundlePrice.toLocaleString('en-IN')}</p>
                            {bundle.savings > 0 && (
                                <p className="text-sm font-semibold text-success mt-1">
                                    You save ₹{bundle.savings.toLocaleString('en-IN')} ({bundle.savingsPercent}%)
                                </p>
                            )}
                        </div>

                        <div className="text-xs text-text-muted space-y-1.5 border-t border-border-default pt-3">
                            <p className="flex items-center gap-1.5"><Zap size={12} className="text-trust" /> 24-Hour Express Delivery</p>
                            <p>{inStockCount} of {productItems.length} products in stock</p>
                            {serviceItems.length > 0 && (
                                <p className="flex items-center gap-1.5"><Wrench size={12} className="text-trust" /> Includes {serviceItems.length} service{serviceItems.length > 1 ? 's' : ''}</p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddToCart}
                            disabled={inStockCount === 0}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-buy-primary hover:bg-buy-primary-hover text-text-primary text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ShoppingCart size={18} />
                            Add Bundle to Cart
                        </button>

                        <button
                            type="button"
                            onClick={handleBuyNow}
                            disabled={inStockCount === 0}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 border-2 border-primary text-primary hover:bg-primary hover:text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Zap size={18} />
                            Buy Bundle Now
                        </button>
                    </div>
                </div>
            </div>

            {/* Bundle Reviews */}
            <BundleReviewSection bundleId={bundle.id} />

            {/* Related Bundles */}
            {relatedBundles.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-lg font-bold text-text-primary mb-4">More Bundle Deals</h2>
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4">
                        {relatedBundles.map(rb => (
                            <Link
                                key={rb.id}
                                to={`/bundles/${rb.slug || rb.id}`}
                                className="snap-start flex-shrink-0 w-[240px] bg-surface border border-border-default rounded-lg overflow-hidden hover:border-trust transition-colors group"
                            >
                                <div className="h-28 bg-page-bg flex items-center justify-center relative">
                                    {rb.image ? (
                                        <img src={rb.image} alt={rb.name} className="w-full h-full object-cover" onError={handleImageError} />
                                    ) : (
                                        <Package size={32} className="text-text-muted" />
                                    )}
                                    {rb.savingsPercent > 0 && (
                                        <span className="absolute top-2 left-2 bg-success text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                                            Save {rb.savingsPercent}%
                                        </span>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-trust transition-colors">{rb.name}</p>
                                    <p className="text-xs text-text-muted mt-0.5">{rb.items?.length || 0} items</p>
                                    <p className="text-base font-bold text-primary mt-1">₹{rb.bundlePrice?.toLocaleString('en-IN')}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Mobile sticky CTA */}
            <div className="lg:hidden fixed left-0 right-0 z-[45] border-t border-border-default bg-surface/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-4 py-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
                <div className="flex items-center gap-3 max-w-7xl mx-auto">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-text-muted">Bundle Price</p>
                        <p className="text-lg font-bold text-text-primary">₹{bundle.bundlePrice.toLocaleString('en-IN')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={inStockCount === 0}
                        className="flex-1 min-w-0 max-w-[180px] font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 bg-buy-primary hover:bg-buy-primary-hover text-text-primary disabled:opacity-40"
                    >
                        <ShoppingCart size={16} />
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BundleDetail;
