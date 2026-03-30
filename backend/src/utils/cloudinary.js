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

export const uploadImage = async (base64Data, folder = 'products') => {
    ensureConfig();
    const result = await cloudinary.uploader.upload(base64Data, {
        folder: `cmgroups/${folder}`,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
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

export const deleteImage = async (publicId, resourceType = 'image') => {
    ensureConfig();
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
