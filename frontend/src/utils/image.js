export const PLACEHOLDER_IMAGE = '/placeholder-product.svg';

export const handleImageError = (event) => {
    const image = event.currentTarget;
    if (!image) return;

    image.onerror = null;
    image.src = PLACEHOLDER_IMAGE;
};
