import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const mediaDir = resolve(fileURLToPath(new URL('.', import.meta.url)), 'media');
const mediaTypes: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function localMedia(): Plugin {
  return {
    name: 'local-media',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/images/') && !pathname.startsWith('/thumbs/')) {
          next();
          return;
        }

        const filePath = resolve(mediaDir, decodeURIComponent(pathname.slice(1)));
        if (!filePath.startsWith(`${mediaDir}${sep}`)) {
          next();
          return;
        }

        try {
          if (!(await stat(filePath)).isFile()) throw new Error('Not a file');
          response.setHeader('Content-Type', mediaTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
          response.setHeader('Cache-Control', 'no-cache');
          createReadStream(filePath).pipe(response);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [localMedia(), react(), tailwindcss()],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
