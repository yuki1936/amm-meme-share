#!/usr/bin/env bun

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const mediaDir = path.join(root, 'media');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'gallery.json'), 'utf8'));
const errors = [];
const paths = new Set();
let itemCount = 0;

async function main() {
for (const category of manifest.categories || []) {
  if (typeof category.description !== 'string' || !category.description.trim()) {
    errors.push(`${category.id}: missing category description`);
  }
  if (category.count !== category.items.length) {
    errors.push(`${category.id}: count does not match items.length`);
  }
  for (const [index, item] of category.items.entries()) {
    itemCount++;
    if (!item.id.startsWith(`${category.id}_`)) errors.push(`${category.id}: invalid item id ${item.id}`);
    if (paths.has(item.src)) errors.push(`Duplicate source path: ${item.src}`);
    paths.add(item.src);
    const sourcePath = path.join(mediaDir, item.src);
    const thumbPath = path.join(mediaDir, item.thumb);
    const sourceExists = fs.existsSync(sourcePath);
    const thumbExists = fs.existsSync(thumbPath);
    if (!sourceExists) errors.push(`Missing source: ${item.src}`);
    if (!thumbExists) errors.push(`Missing thumbnail: ${item.thumb}`);
    if (!/^[a-f0-9]{12}$/.test(item.revision)) errors.push(`Invalid revision: ${item.id}`);
    if (!Number.isInteger(item.width) || !Number.isInteger(item.height) || item.width < 1 || item.height < 1) {
      errors.push(`${item.id}: invalid dimensions ${item.width}x${item.height}`);
    }
    if (index > 0 && category.items[index - 1].id.localeCompare(item.id, 'en', { numeric: true }) >= 0) {
      errors.push(`${category.id}: items are not naturally sorted at ${item.id}`);
    }
    if (sourceExists && thumbExists) {
      const [sourceMetadata, thumbMetadata] = await Promise.all([
        sharp(sourcePath, { animated: true }).metadata(),
        sharp(thumbPath, { animated: true }).metadata(),
      ]);
      const sourceWidth = sourceMetadata.width || 1;
      const sourceHeight = sourceMetadata.pageHeight || sourceMetadata.height || 1;
      const thumbWidth = thumbMetadata.width || 1;
      const thumbHeight = thumbMetadata.pageHeight || thumbMetadata.height || 1;
      if (item.width !== sourceWidth || item.height !== sourceHeight) {
        errors.push(`${item.id}: manifest ${item.width}x${item.height} does not match source ${sourceWidth}x${sourceHeight}`);
      }
      const sourceRatio = sourceWidth / sourceHeight;
      const thumbRatio = thumbWidth / thumbHeight;
      if (Math.abs(sourceRatio - thumbRatio) / sourceRatio > 0.01) {
        errors.push(`${item.id}: thumbnail ratio ${thumbWidth}x${thumbHeight} does not match source ${sourceWidth}x${sourceHeight}`);
      }
    }
  }
}

if (manifest.total !== itemCount) errors.push(`Manifest total ${manifest.total} does not match ${itemCount}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${manifest.categories.length} categories and ${itemCount} images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
