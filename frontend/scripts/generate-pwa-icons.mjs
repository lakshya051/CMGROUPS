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

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

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

    // Maskable icon (512x512 with 20% safe-zone padding)
    const maskableSize = 512;
    const innerSize = Math.round(maskableSize * 0.8);
    const offset = Math.round((maskableSize - innerSize) / 2);

    const inner = await sharp(source)
        .resize(innerSize, innerSize, { fit: 'contain', background: { r: 233, g: 30, b: 99, alpha: 1 } })
        .png()
        .toBuffer();

    await sharp({
        create: { width: maskableSize, height: maskableSize, channels: 4, background: { r: 233, g: 30, b: 99, alpha: 1 } }
    })
        .composite([{ input: inner, left: offset, top: offset }])
        .png()
        .toFile(resolve(iconsDir, 'icon-512x512-maskable.png'));
    console.log('  ✓ icon-512x512-maskable.png (maskable)');

    // Apple touch icon (180x180)
    const { copyFileSync } = await import('fs');
    copyFileSync(
        resolve(iconsDir, 'icon-180x180.png'),
        resolve(iconsDir, 'apple-touch-icon-180x180.png')
    );
    console.log('  ✓ apple-touch-icon-180x180.png');

    console.log('\nDone! Icons generated in public/icons/');
}

generate().catch(console.error);
