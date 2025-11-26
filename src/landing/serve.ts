import { serveFile } from 'jsr:@std/http/file-server';
import { dirname, fromFileUrl, join } from 'jsr:@std/path';

const BASE_DIR = dirname(fromFileUrl(import.meta.url));
const DIST_DIR = join(BASE_DIR, 'dist');

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = join(BASE_DIR, 'index.html');
    try {
      let content = await Deno.readTextFile(indexPath);
      // Remove HMR client script
      content = content.replace('<script type="module" src="./hmr-client.js"></script>', '');
      return new Response(content, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    } catch (e) {
      console.error('Error serving index.html:', e);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  // Serve bundled js
  if (pathname === '/main.bundle.js') {
    return serveFile(req, join(DIST_DIR, 'main.bundle.js'));
  }

  // Serve static assets (styles.css, etc.)
  // We try to serve from the landing directory.
  const filePath = join(BASE_DIR, pathname);

  // Ensure we don't escape the directory
  if (!filePath.startsWith(BASE_DIR)) {
    return new Response('Forbidden', { status: 403 });
  }

  return serveFile(req, filePath);
});
