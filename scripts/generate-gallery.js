const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const mediaDir = path.join(root, 'media');
const imagesDir = path.join(mediaDir, 'images');
const configPath = path.join(root, 'categories.json');
const outputPath = path.join(publicDir, 'gallery.json');
const supportedImage = /\.(?:jpe?g|png|gif|webp|bmp)$/i;

function naturalSort(a, b) {
  return a.localeCompare(b, 'en', { numeric: true });
}

function readCategoryConfig() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(config.categories)) {
    throw new Error('categories.json must contain a categories array.');
  }

  const ids = new Set();
  for (const category of config.categories) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.id)) {
      throw new Error(`Invalid category id: ${category.id}`);
    }
    if (ids.has(category.id)) throw new Error(`Duplicate category id: ${category.id}`);
    ids.add(category.id);
  }
  return config.categories;
}

function discoverCategories(configured) {
  const configuredIds = new Set(configured.map((category) => category.id));
  const directories = fs.readdirSync(imagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  for (const entry of directories) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
      throw new Error(`Category directory must use a lowercase ASCII slug: ${entry.name}`);
    }
  }
  const discovered = directories
    .filter((entry) => !configuredIds.has(entry.name))
    .map((entry) => ({
      id: entry.name,
      name: entry.name,
      romanized: entry.name,
      description: `${entry.name} 表情包合集。`,
      color: '#6b7280',
    }))
    .sort((a, b) => naturalSort(a.id, b.id));

  return [...configured, ...discovered];
}

async function buildCategory(category) {
  const categoryDir = path.join(imagesDir, category.id);
  if (!fs.existsSync(categoryDir)) {
    throw new Error(`Missing category directory: images/${category.id}`);
  }

  const files = fs.readdirSync(categoryDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && supportedImage.test(entry.name))
    .map((entry) => entry.name)
    .sort(naturalSort);

  const items = await Promise.all(files.map(async (filename) => {
    const id = filename.replace(/\.[^/.]+$/, '');
    const src = `images/${category.id}/${filename}`;
    const thumb = `thumbs/${category.id}/${id}.webp`;
    if (!fs.existsSync(path.join(mediaDir, thumb))) {
      throw new Error(`Missing thumbnail: ${thumb}`);
    }
    const metadata = await sharp(path.join(mediaDir, src), { animated: true }).metadata();
    const width = metadata.width || 1;
    const height = metadata.pageHeight || metadata.height || 1;
    return {
      id,
      src,
      thumb,
      animated: /\.gif$/i.test(filename),
      width,
      height,
    };
  }));

  return {
    ...category,
    count: items.length,
    cover: items[0]?.thumb || null,
    items,
  };
}

async function main() {
  const categories = await Promise.all(
    discoverCategories(readCategoryConfig()).map(buildCategory),
  );
const gallery = {
  version: 1,
  total: categories.reduce((sum, category) => sum + category.count, 0),
  categories,
};

fs.writeFileSync(outputPath, `${JSON.stringify(gallery, null, 2)}\n`, 'utf8');
console.log(`Generated gallery.json with ${categories.length} categories and ${gallery.total} images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
