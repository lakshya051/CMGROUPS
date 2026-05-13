import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function ensureConfig() {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env (from Cloudinary Dashboard → API Keys).');
    }
}

// Maximum decoded image size (actual bytes, not base64 length).
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

/**
 * Sniff the first few bytes of a decoded image buffer to verify it's an
 * actual image we accept. Relying on client-supplied MIME is unsafe.
 */
function sniffImageType(buf) {
    if (!buf || buf.length < 12) return null;
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) return 'image/png';
    // GIF: 47 49 46 38 (GIF8)
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
    // WEBP: "RIFF....WEBP"
    if (
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) return 'image/webp';
    return null;
}

/**
 * Validate the decoded bytes of a client-supplied base64 image payload.
 * Throws a descriptive error when the input is not an acceptable image.
 * Returns the decoded Buffer for optional reuse by callers.
 */
function validateBase64Image(base64Data) {
    if (typeof base64Data !== 'string' || base64Data.length === 0) {
        const err = new Error('Image payload must be a non-empty string');
        err.isClientError = true;
        throw err;
    }
    // Accept either a data URI or a bare base64 payload.
    let b64 = base64Data;
    const match = base64Data.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
        const mime = match[1].toLowerCase();
        if (!mime.startsWith('image/')) {
            const err = new Error('Only image uploads are allowed');
            err.isClientError = true;
            throw err;
        }
        b64 = match[2];
    }
    let buf;
    try {
        buf = Buffer.from(b64, 'base64');
    } catch {
        const err = new Error('Invalid base64 image payload');
        err.isClientError = true;
        throw err;
    }
    if (buf.length === 0) {
        const err = new Error('Invalid or empty image payload');
        err.isClientError = true;
        throw err;
    }
    if (buf.length > MAX_IMAGE_BYTES) {
        const err = new Error(`Image too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB)`);
        err.isClientError = true;
        throw err;
    }
    const sniffed = sniffImageType(buf);
    if (!sniffed) {
        const err = new Error('Unsupported image format (expected JPEG, PNG, GIF or WEBP)');
        err.isClientError = true;
        throw err;
    }
    return buf;
}

export const uploadImage = async (base64Data, folder = 'products') => {
    ensureConfig();
    // SECURITY: sniff bytes + enforce size before handing off to Cloudinary.
    validateBase64Image(base64Data);
    const result = await cloudinary.uploader.upload(base64Data, {
        folder: `cmgroups/${folder}`,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        resource_type: 'image',
    });
    return result.secure_url;
};

export const uploadPdfBuffer = async (buffer, folder = 'invoices') => {
    ensureConfig();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: `cmgroups/${folder}`, resource_type: 'raw' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

/**
 * Namespace guard: we only ever delete assets that live under the
 * `cmgroups/` Cloudinary folder prefix. This prevents an admin (or a
 * compromised admin account) from passing a URL pointing at another tenant /
 * application on the same Cloudinary account and destroying it.
 */
const CLOUDINARY_NAMESPACE = 'cmgroups/';

export const deleteImage = async (publicId, resourceType = 'image') => {
    ensureConfig();
    if (typeof publicId !== 'string' || publicId.length === 0) {
        const err = new Error('publicId is required');
        err.isClientError = true;
        throw err;
    }
    if (!publicId.startsWith(CLOUDINARY_NAMESPACE)) {
        const err = new Error('Refusing to delete asset outside of the application namespace');
        err.isClientError = true;
        throw err;
    }
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary')) return null;
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let pathAfterUpload = parts[1];
    // Strip transformation segments (e.g. w_100,h_200/) before version
    pathAfterUpload = pathAfterUpload.replace(/^(?:[a-z]_[^/]+\/)*/, '');
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    return pathAfterUpload.replace(/\.\w+$/, '');
};

export default cloudinary;
