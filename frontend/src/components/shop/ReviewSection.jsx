import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reviewsAPI } from '../../lib/api';
import { Star, ThumbsUp, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const ReviewSection = ({ productId }) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [images, setImages] = useState([]); // Array of base64 strings
    const [submitting, setSubmitting] = useState(false);

    const fetchReviews = async () => {
        try {
            const data = await reviewsAPI.getForProduct(productId);
            setReviews(data);
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        if (images.length + files.length > 3) {
            toast.error('Maximum 3 images allowed');
            return;
        }

        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) {
                toast.error(`${file.name} is too large. Max 2MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImages(prev => [...prev, ev.target.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) return toast.error('Please select a rating');
        setSubmitting(true);
        try {
            await reviewsAPI.create(productId, rating, comment, images);
            toast.success('Review submitted successfully!');
            setShowForm(false);
            setRating(5);
            setComment('');
            setImages([]);
            fetchReviews();
        } catch (error) {
            toast.error(error.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const handleHelpful = async (reviewId) => {
        if (!user) return toast.error('Please login to vote');
        try {
            await reviewsAPI.voteHelpful(reviewId);
            fetchReviews(); // Refresh to get updated votes
        } catch (error) {
            toast.error('Failed to vote');
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl my-8"></div>;

    const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;

    return (
        <div className="mt-16 bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
            {/* Summary Header */}
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between mb-8 bg-surface p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className="text-5xl font-bold text-text-main mb-1">{avgRating}</div>
                        <div className="flex text-warning justify-center mb-1">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} size={16} fill={star <= Math.round(Number(avgRating)) ? "currentColor" : "none"} />
                            ))}
                        </div>
                        <div className="text-sm text-text-muted font-medium">{reviews.length} Reviews</div>
                    </div>
                </div>
                {user ? (
                    <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "primary"}>
                        {showForm ? 'Cancel Review' : 'Write a Review'}
                    </Button>
                ) : (
                    <p className="text-sm text-text-muted bg-gray-100 px-4 py-2 rounded-lg">Please log in to write a review.</p>
                )}
            </div>

            {/* Review Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-xl mb-6">Write Your Review</h3>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-text-main mb-2">Rating</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                >
                                    <Star size={32} className={star <= rating ? "text-warning fill-warning" : "text-gray-200"} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-text-main mb-2">Comment</label>
                        <textarea
                            required
                            className="input-field min-h-[120px] resize-y"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your experience with this product..."
                        />
                    </div>
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-text-main mb-2">Add Photos (Max 3)</label>
                        <div className="flex flex-wrap gap-4">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm group">
                                    <img src={img} alt="Upload preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {images.length < 3 && (
                                <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary hover:text-primary transition-colors text-gray-500 bg-gray-50 hover:bg-primary/5">
                                    <ImageIcon size={28} className="mb-2" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </Button>
                    </div>
                </form>
            )}

            {/* Reviews List */}
            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-gray-200">
                        <Star size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-text-main font-bold text-lg mb-1">No reviews yet</p>
                        <p className="text-text-muted text-sm">Be the first to share your experience!</p>
                    </div>
                ) : (
                    reviews.map(review => {
                        const hasVoted = user && review.voters?.includes(user.id);
                        return (
                            <div key={review.id} className="bg-surface p-6 rounded-2xl border border-gray-100 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner font-black text-lg rounded-full flex items-center justify-center uppercase">
                                            {review.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-base flex flex-wrap items-center gap-2">
                                                {review.user?.name || 'User'}
                                                {review.isVerified && (
                                                    <span className="flex items-center gap-1 text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-success/20">
                                                        <CheckCircle size={10} /> Verified Buyer
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-text-muted mt-0.5 font-medium">
                                                {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 text-warning bg-warning/5 px-3 py-1.5 rounded-full border border-warning/10">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} size={14} fill={star <= review.rating ? "currentColor" : "none"} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-text-main text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>

                                {review.images && review.images.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        {review.images.map((img, idx) => (
                                            <div key={idx} className="relative group overflow-hidden rounded-xl border border-gray-200 cursor-pointer" onClick={() => window.open(img, '_blank')}>
                                                <img src={img} alt="Review attachment" className="w-20 h-20 object-cover group-hover:scale-110 transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-xs text-text-muted">Was this review helpful?</span>
                                    <button
                                        onClick={() => handleHelpful(review.id)}
                                        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${hasVoted ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-gray-50 text-text-muted border border-gray-200 hover:bg-gray-100 hover:text-text-main'}`}
                                    >
                                        <ThumbsUp size={14} className={hasVoted ? 'fill-primary' : ''} />
                                        {review.helpfulVotes || 0}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ReviewSection;
