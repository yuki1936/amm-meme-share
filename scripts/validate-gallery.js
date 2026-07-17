#!/usr/bin/env bun

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const mediaDir = path.join(root, 'media');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'gallery.json'), 'utf8'));
const errors = [];
const paths = new Set();
let itemCount = 0;

for (const category of manifest.categories || []) {
  if (typeof category.description !== 'string' || !category.description.trim()) {
    errors.push(`${category.id}: missing category description`);
  }
  if (category.count !== category.items.length) {
    errors.push(`${category.id}: count does not match items.length`);
  }
  category.items.forEach((item, index) => {
    itemCount++;
    if (!item.id.startsWith(`${category.id}_`)) errors.push(`${category.id}: invalid item id ${item.id}`);
    if (paths.has(item.src)) errors.push(`Duplicate source path: ${item.src}`);
    paths.add(item.src);
    if (!fs.existsSync(path.join(mediaDir, item.src))) errors.push(`Missing source: ${item.src}`);
    if (!fs.existsSync(path.join(mediaDir, item.thumb))) errors.push(`Missing thumbnail: ${item.thumb}`);
    if (!Number.isInteger(item.width) || !Number.isInteger(item.height) || item.width < 1 || item.height < 1) {
      errors.push(`${item.id}: invalid dimensions ${item.width}x${item.height}`);
    }
    if (index > 0 && category.items[index - 1].id.localeCompare(item.id, 'en', { numeric: true }) >= 0) {
      errors.push(`${category.id}: items are not naturally sorted at ${item.id}`);
    }
  });
}

if (manifest.total !== itemCount) errors.push(`Manifest total ${manifest.total} does not match ${itemCount}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${manifest.categories.length} categories and ${itemCount} images.`);
