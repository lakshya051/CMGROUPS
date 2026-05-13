export const PLACEHOLDER_IMAGE = '/placeholder-product.svg';

function trimmedUrl(url) {
    if (typeof url !== 'string') return null;
    const t = url.trim();
    return t.length > 0 ? t : null;
}

// ─── Cloudinary URL transformer ──────────────────────────────────────────────
// Cloudinary URLs look like:
//   https://res.cloudinary.com/<cloud>/image/upload/v1234567/folder/file.jpg
// Inserting `t_` parameters between `/upload/` and the version segment causes
// Cloudinary to do server-side resize + format conversion. We rely on:
//   f_auto  → AVIF/WebP/JPEG depending on browser support
//   q_auto  → adaptive quality (typically 60–80% bandwidth saving)
//   c_fill,w_X,h_Y → crop to fit
//   dpr_auto → respect device pixel ratio for retina displays
//
// Non-Cloudinary URLs (placeholder SVGs, third-party images) pass through
// unchanged.
const CLOUDINARY_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)\/(.+)$/;

const PRESETS = {
    // Product card on grid: 400×400 covers 2x retina up to 200×200 display.
    card: 'f_auto,q_auto,c_fill,w_400,h_400,dpr_auto',
    // Product detail hero: bigger.
    detail: 'f_auto,q_auto,c_fill,w_800,h_800,dpr_auto',
    // Cart/checkout thumb.
    thumb: 'f_auto,q_auto,c_fill,w_200,h_200,dpr_auto',
    // Hero banner — wide aspect, no crop.
    banner: 'f_auto,q_auto,w_1600,dpr_auto',
};

/** Inject Cloudinary transforms into a URL. Pass through any URL we don't recognize. */
export function transformImage(url, preset = 'card') {
    if (typeof url !== 'string' || !url) return url;
    const m = url.match(CLOUDINARY_RE);
    if (!m) return url;
    // If the URL already contains a transform segment (e.g. `c_fill,w_100/`),
    // don't double-transform — return unchanged.
    if (/\/(?:[a-z]_[\w,]+\/)+v\d+\//.test(url)) return url;
    const params = PRESETS[preset] || PRESETS.card;
    return `${m[1]}/${params}/${m[2]}`;
}

/**
 * Primary image for a product-like object (`images[]` and/or `image`), or placeholder.
 * Pass `preset` to control the Cloudinary transform applied (default: 'card').
 */
export function getProductImageUrl(source, index = 0, preset = 'card') {
    if (!source) return PLACEHOLDER_IMAGE;

    const rawList = Array.isArray(source.images) ? source.images : null;
    const list = rawList && rawList.length > 0
        ? rawList.map(trimmedUrl).filter(Boolean)
        : [];

    const single = trimmedUrl(source.image);
    const urls = list.length > 0 ? list : (single ? [single] : []);

    if (urls.length === 0) return PLACEHOLDER_IMAGE;

    const idx = Number.isFinite(index) ? Math.max(0, Math.min(index, urls.length - 1)) : 0;
    const chosen = urls[idx] || urls[0] || PLACEHOLDER_IMAGE;
    return transformImage(chosen, preset);
}

/** Single URL (e.g. gallery thumb) — empty/invalid → placeholder */
export function resolveImageUrl(url, preset) {
    const t = trimmedUrl(url);
    if (!t) return PLACEHOLDER_IMAGE;
    return preset ? transformImage(t, preset) : t;
}

/** Cart/order line: variant image wins, then product gallery */
export function getLineItemImageUrl(item, preset = 'thumb') {
    if (!item) return PLACEHOLDER_IMAGE;
    const v = trimmedUrl(item.variant?.image);
    if (v) return transformImage(v, preset);
    return getProductImageUrl(item.product, 0, preset);
}

/** Admin order row: bundle cover image, else product */
export function getOrderLineThumbUrl(item, preset = 'thumb') {
    if (!item) return PLACEHOLDER_IMAGE;
    const b = trimmedUrl(item.bundle?.image);
    if (b) return transformImage(b, preset);
    return getProductImageUrl(item.product || {}, 0, preset);
}

export const handleImageError = (event) => {
    const image = event.currentTarget;
    if (!image) return;

    image.onerror = null;
    image.src = PLACEHOLDER_IMAGE;
};
