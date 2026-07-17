#!/usr/bin/env bun

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '..', 'media', 'images');
const supportedImage = /\.(?:jpe?g|png|gif|webp|bmp)$/i;
const extensions = {
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  webp: 'webp',
  heif: 'heic',
  tiff: 'tiff',
};

async function renameCategory(entry) {
  const category = entry.name;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) {
    throw new Error(`Category directory must use a lowercase ASCII slug: ${category}`);
  }

  const categoryDir = path.join(IMAGES_DIR, category);
  const entries = await fs.readdir(categoryDir, { withFileTypes: true });
  const files = entries.filter((item) => item.isFile() && supportedImage.test(item.name));
  const pattern = new RegExp(`^${category}_(\\d{5})\\.[^.]+$`);
  let maxNumber = files.reduce((max, file) => {
    const match = file.name.match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  const pending = await Promise.all(files
    .filter((file) => !pattern.test(file.name))
    .map(async (file) => ({
      file,
      stat: await fs.stat(path.join(categoryDir, file.name)),
    })));
  pending.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs || a.file.name.localeCompare(b.file.name, 'en'));

  const plan = [];
  for (const { file } of pending) {
    const source = path.join(categoryDir, file.name);
    const metadata = await sharp(source, { animated: true }).metadata();
    const extension = extensions[metadata.format];
    if (!extension) throw new Error(`Unsupported image format: ${source} (${metadata.format})`);
    maxNumber++;
    const targetName = `${category}_${String(maxNumber).padStart(5, '0')}.${extension}`;
    const temporary = path.join(categoryDir, `.rename-${crypto.randomUUID()}.tmp`);
    plan.push({ source, temporary, target: path.join(categoryDir, targetName), sourceName: file.name, targetName });
  }

  const staged = [];
  const finalized = [];
  try {
    for (const item of plan) {
      await fs.rename(item.source, item.temporary);
      staged.push(item);
    }
    for (const item of staged) {
      await fs.rename(item.temporary, item.target);
      finalized.push(item);
      console.log(`${category}/${item.sourceName} -> ${category}/${item.targetName}`);
    }
  } catch (error) {
    for (const item of finalized.reverse()) {
      await fs.rename(item.target, item.source).catch(() => {});
    }
    for (const item of staged.filter((item) => !finalized.includes(item)).reverse()) {
      await fs.rename(item.temporary, item.source).catch(() => {});
    }
    throw error;
  }
  return plan.length;
}

async function main() {
  const entries = (await fs.readdir(IMAGES_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  let renamed = 0;
  for (const entry of entries) renamed += await renameCategory(entry);
  console.log(`Renamed ${renamed} new images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
