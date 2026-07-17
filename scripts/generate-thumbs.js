#!/usr/bin/env node
// Usage: node scripts/generate-thumbs.js [--width=400] [--quality=80]

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const THUMBS_DIR = path.join(__dirname, '..', 'public', 'thumbs');

const argv = require('minimist')(process.argv.slice(2));
const WIDTH = parseInt(argv.width || argv.w || 400, 10);
const QUALITY = parseInt(argv.quality || argv.q || 80, 10);
const CATEGORY = argv.category || argv.c || null;
const ANIMATED_ONLY = Boolean(argv['animated-only']);
const FORCE = Boolean(argv.force || argv.f);
const supportedImage = /\.(?:jpe?g|png|gif|webp|bmp)$/i;

if (CATEGORY && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(CATEGORY)) {
  throw new Error(`Invalid category slug: ${CATEGORY}`);
}

async function listImages(dir = IMAGES_DIR) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listImages(fullPath);
    return entry.isFile() && supportedImage.test(entry.name) ? [fullPath] : [];
  }));
  return nested.flat();
}

async function generate() {
  const sourceDir = CATEGORY ? path.join(IMAGES_DIR, CATEGORY) : IMAGES_DIR;
  let images = await listImages(sourceDir);
  if (ANIMATED_ONLY) images = images.filter((file) => /\.gif$/i.test(file));
  images.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const scope = CATEGORY ? ` for category "${CATEGORY}"` : '';
  const mode = ANIMATED_ONLY ? ' animated' : '';
  console.log(`Found ${images.length}${mode} images${scope}. Generating ${WIDTH}px WebP thumbnails.`);
  let generated = 0;
  let skipped = 0;

  for (const inputPath of images) {
    const relativePath = path.relative(IMAGES_DIR, inputPath);
    const outputPath = path.join(
      THUMBS_DIR,
      relativePath.replace(/\.[^/.]+$/, '.webp'),
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    try {
      if (!FORCE) {
        const [inputStat, outputStat] = await Promise.all([
          fs.stat(inputPath),
          fs.stat(outputPath).catch(() => null),
        ]);
        if (outputStat && outputStat.mtimeMs >= inputStat.mtimeMs) {
          skipped++;
          continue;
        }
      }
      await sharp(inputPath, { animated: /\.gif$/i.test(inputPath) })
        .resize({ width: WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 4 })
        .toFile(outputPath);
      generated++;
      console.log('OK', relativePath, '->', path.relative(process.cwd(), outputPath));
    } catch (error) {
      console.warn('Failed', relativePath, error.message);
    }
  }

  console.log(`Done. Generated ${generated}; skipped ${skipped} unchanged.`);
}

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
