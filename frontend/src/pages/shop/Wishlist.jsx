import React from 'react';
import { useShop } from '../../context/ShopContext';
import ProductCard from '../../components/shop/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';

const Wishlist = () => {
    const { wishlist, products } = useShop();

    const wishlistItems = products.filter(p => wishlist.includes(p.id));

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
                <Heart size={32} className="text-primary fill-primary" />
                <h1 className="text-3xl font-heading font-bold">My Wishlist</h1>
                <span className="text-text-muted text-lg">({wishlistItems.length})</span>
            </div>

            {wishlistItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {wishlistItems.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="glass-panel p-16 text-center max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
                        <Heart size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Your wishlist is empty</h2>
                    <p className="text-text-muted mb-8">Save items you love so you can find them easily later.</p>
                    <Link to="/products">
                        <Button size="lg">
                            <ShoppingBag size={20} className="mr-2" /> Start Shopping
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Wishlist;
