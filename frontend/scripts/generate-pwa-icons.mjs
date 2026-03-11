/**
 * PWA Icon Generator
 *
 * Generates all required PWA icon sizes from a source icon.
 *
 * Usage:
 *   1. Place your source icon (1024x1024+ PNG) at public/icon-source.png
 *   2. Run: node scripts/generate-pwa-icons.mjs
 *
 * Requires: npm install sharp --save-dev
 *
 * If no source PNG exists, falls back to the SVG at public/icon.svg
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const iconsDir = resolve(publicDir, 'icons');

const SIZES = [48, 72, 96, 128, 144, 152, 180, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const APPLE_SIZES = [120, 152, 167, 180];
const SHORTCUT_NAMES = ['shortcut-orders', 'shortcut-services', 'shortcut-courses', 'shortcut-shop'];

async function generate() {
    let sharp;
    try {
        sharp = (await import('sharp')).default;
    } catch {
        console.error(
            'sharp is not installed. Run: npm install sharp --save-dev'
        );
        process.exit(1);
    }

    const { mkdirSync } = await import('fs');
    mkdirSync(iconsDir, { recursive: true });

    const screenshotsDir = resolve(publicDir, 'screenshots');
    mkdirSync(screenshotsDir, { recursive: true });

    const pngSource = resolve(publicDir, 'icon-source.png');
    const svgSource = resolve(publicDir, 'icon.svg');

    const source = existsSync(pngSource) ? pngSource : svgSource;
    console.log(`Using source: ${source}`);

    for (const size of SIZES) {
        const filename = `icon-${size}x${size}.png`;
        await sharp(source)
            .resize(size, size, { fit: 'contain', background: { r: 233, g: 30, b: 99, alpha: 1 } })
            .png()
            .toFile(resolve(iconsDir, filename));
        console.log(`  ✓ ${filename}`);
    }

    const brandBg = { r: 233, g: 30, b: 99, alpha: 1 };

    for (const size of MASKABLE_SIZES) {
        const innerSize = Math.round(size * 0.8);
        const offset = Math.round((size - innerSize) / 2);

        const inner = await sharp(source)
            .resize(innerSize, innerSize, { fit: 'contain', background: brandBg })
            .png()
            .toBuffer();

        await sharp({
            create: { width: size, height: size, channels: 4, background: brandBg }
        })
            .composite([{ input: inner, left: offset, top: offset }])
            .png()
            .toFile(resolve(iconsDir, `icon-${size}x${size}-maskable.png`));
        console.log(`  ✓ icon-${size}x${size}-maskable.png (maskable)`);
    }

    for (const size of APPLE_SIZES) {
        const filename = `apple-touch-icon-${size}x${size}.png`;
        await sharp(source)
            .resize(size, size, { fit: 'contain', background: brandBg })
            .png()
            .toFile(resolve(iconsDir, filename));
        console.log(`  ✓ ${filename}`);
    }

    for (const name of SHORTCUT_NAMES) {
        const filename = `${name}.png`;
        await sharp(source)
            .resize(96, 96, { fit: 'contain', background: brandBg })
            .png()
            .toFile(resolve(iconsDir, filename));
        console.log(`  ✓ ${filename} (shortcut)`);
    }

    // Placeholder screenshots (solid pink with text overlay via SVG)
    for (const name of ['home', 'products']) {
        const svgOverlay = Buffer.from(`
            <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
                <rect width="1080" height="1920" fill="#e91e63"/>
                <text x="540" y="900" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="120" fill="#fff">CMGROUPS</text>
                <text x="540" y="1050" text-anchor="middle" font-family="sans-serif" font-weight="400" font-size="48" fill="rgba(255,255,255,0.8)">Replace with real screenshot</text>
                <text x="540" y="1130" text-anchor="middle" font-family="sans-serif" font-weight="400" font-size="40" fill="rgba(255,255,255,0.6)">${name}.png</text>
            </svg>
        `);
        await sharp(svgOverlay).png().toFile(resolve(screenshotsDir, `${name}.png`));
        console.log(`  ✓ screenshots/${name}.png (placeholder)`);
    }

    console.log('\n⚠️  ICON FILES NEEDED: Replace placeholder icons in public/icons/ with real CMGROUPS logo icons before Play Store submission');
    console.log('⚠️  SCREENSHOT FILES NEEDED: Replace placeholder screenshots in public/screenshots/ with real app screenshots (1080x1920px)');
    console.log('\nDone! Icons generated in public/icons/');
}

generate().catch(console.error);
