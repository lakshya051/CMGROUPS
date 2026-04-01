export const PLACEHOLDER_IMAGE = '/placeholder-product.svg';

function trimmedUrl(url) {
    if (typeof url !== 'string') return null;
    const t = url.trim();
    return t.length > 0 ? t : null;
}

/**
 * Primary image for a product-like object (`images[]` and/or `image`), or placeholder.
 */
export function getProductImageUrl(source, index = 0) {
    if (!source) return PLACEHOLDER_IMAGE;

    const rawList = Array.isArray(source.images) ? source.images : null;
    const list = rawList && rawList.length > 0
        ? rawList.map(trimmedUrl).filter(Boolean)
        : [];

    const single = trimmedUrl(source.image);
    const urls = list.length > 0 ? list : (single ? [single] : []);

    if (urls.length === 0) return PLACEHOLDER_IMAGE;

    const idx = Number.isFinite(index) ? Math.max(0, Math.min(index, urls.length - 1)) : 0;
    return urls[idx] || urls[0] || PLACEHOLDER_IMAGE;
}

/** Single URL (e.g. gallery thumb) — empty/invalid → placeholder */
export function resolveImageUrl(url) {
    return trimmedUrl(url) ?? PLACEHOLDER_IMAGE;
}

/** Cart/order line: variant image wins, then product gallery */
export function getLineItemImageUrl(item) {
    if (!item) return PLACEHOLDER_IMAGE;
    const v = trimmedUrl(item.variant?.image);
    if (v) return v;
    return getProductImageUrl(item.product, 0);
}

/** Admin order row: bundle cover image, else product */
export function getOrderLineThumbUrl(item) {
    if (!item) return PLACEHOLDER_IMAGE;
    const b = trimmedUrl(item.bundle?.image);
    if (b) return b;
    return getProductImageUrl(item.product || {}, 0);
}

export const handleImageError = (event) => {
    const image = event.currentTarget;
    if (!image) return;

    image.onerror = null;
    image.src = PLACEHOLDER_IMAGE;
};
