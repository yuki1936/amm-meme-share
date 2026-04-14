#!/usr/bin/env node
// generate-thumbs.js
// Usage: node scripts/generate-thumbs.js [--width=400] [--quality=80]
// Generates WebP thumbnails into ./thumbs/ with same basename and .webp extension.

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const THUMBS_DIR = path.join(__dirname, '..', 'thumbs');

const argv = require('minimist')(process.argv.slice(2));
const WIDTH = parseInt(argv.width || argv.w || 400, 10);
const QUALITY = parseInt(argv.quality || argv.q || 80, 10);

async function ensureDir(dir){
  try{ await fs.mkdir(dir, { recursive: true }); }catch(e){}
}

async function listImages(){
  const entries = await fs.readdir(IMAGES_DIR, { withFileTypes: true });
  return entries.filter(e=>e.isFile()).map(e=>e.name).filter(n=>/\.(jpe?g|png|gif|webp|bmp)$/i.test(n));
}

async function generate(){
  await ensureDir(THUMBS_DIR);
  const imgs = await listImages();
  console.log(`Found ${imgs.length} images. Generating ${WIDTH}px webp thumbnails to ${THUMBS_DIR}`);
  for (const name of imgs){
    const inPath = path.join(IMAGES_DIR, name);
    const base = name.replace(/\.[^/.]+$/, '');
    const outName = base + '.webp';
    const outPath = path.join(THUMBS_DIR, outName);
    try{
      await sharp(inPath)
        .resize({ width: WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(outPath);
      console.log('✓', name, '→', path.relative(process.cwd(), outPath));
    }catch(err){
      console.warn('✗ failed', name, err.message);
    }
  }
  console.log('Done.');
}

generate().catch(err=>{ console.error(err); process.exit(1); });
