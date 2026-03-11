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

export const deleteImage = async (publicId) => {
    ensureConfig();
    await cloudinary.uploader.destroy(publicId);
};

export const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary')) return null;
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const pathWithExt = parts[1].replace(/^v\d+\//, '');
    return pathWithExt.replace(/\.\w+$/, '');
};

export default cloudinary;
