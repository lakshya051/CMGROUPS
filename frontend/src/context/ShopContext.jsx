import { createContext, useContext } from 'react';

export const ShopContext = createContext(null);

export const useShop = () => {
    const context = useContext(ShopContext);
    if (context === null) {
        throw new Error('useShop must be used within a ShopProvider');
    }
    return context;
};
