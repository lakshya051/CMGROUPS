import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (base64Data, folder = 'products') => {
    const result = await cloudinary.uploader.upload(base64Data, {
        folder: `cmgroups/${folder}`,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
    return result.secure_url;
};

export const deleteImage = async (publicId) => {
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
