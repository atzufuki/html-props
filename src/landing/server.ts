import { serveFile } from 'jsr:@std/http/file-server';
import { dirname, fromFileUrl, join } from 'jsr:@std/path';

const BASE_DIR = dirname(fromFileUrl(import.meta.url));
const DIST_DIR = join(BASE_DIR, 'dist');

function shouldCompress(contentType: string | null) {
  if (!contentType) return false;
  return /^(text\/|application\/(javascript|json|xml|wasm)|image\/svg\+xml)/.test(contentType);
}

async function getProcessedIndexHtml() {
  const indexPath = join(BASE_DIR, 'index.html');
  let content = await Deno.readTextFile(indexPath);

  // Get bundle version
  let bundleVersion = Date.now().toString();
  try {
    const bundlePath = join(DIST_DIR, 'main.bundle.js');
    const fileInfo = await Deno.stat(bundlePath);
    if (fileInfo.mtime) {
      bundleVersion = fileInfo.mtime.getTime().toString();
    }
  } catch (e) {
    // ignore
  }

  // Inject version
  content = content.replace('src="/main.bundle.js"', `src="/main.bundle.js?v=${bundleVersion}"`);

  // Remove HMR client script
  content = content.replace(/<script[^>]+src="\/hmr-client\.js"[^>]*><\/script>/, '');

  return content;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const acceptEncoding = req.headers.get('accept-encoding') || '';

  let response: Response;

  // Serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    try {
      const content = await getProcessedIndexHtml();
      response = new Response(content, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // 1 hour
        },
      });
    } catch (e) {
      console.error('Error serving index.html:', e);
      return new Response('Internal Server Error', { status: 500 });
    }
  } // Serve bundled js
  else if (pathname === '/main.bundle.js') {
    response = await serveFile(req, join(DIST_DIR, 'main.bundle.js'));
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } // Serve static assets (styles.css, etc.)
  else {
    const filePath = join(BASE_DIR, pathname);

    // Ensure we don't escape the directory
    if (!filePath.startsWith(BASE_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    response = await serveFile(req, filePath);

    // If 404 and looks like a route (no extension), try serving index.html
    if (response.status === 404 && !pathname.includes('.')) {
      try {
        const content = await getProcessedIndexHtml();
        response = new Response(content, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (e) {
        // Keep original 404 if index fails
      }
    }

    // Cache images and css
    if (pathname.match(/\.(png|jpg|jpeg|gif|svg|css)$/)) {
      response.headers.set('Cache-Control', 'public, max-age=86400');
    }
  }

  // Handle Compression
  if (response.ok && response.body && shouldCompress(response.headers.get('content-type'))) {
    if (acceptEncoding.includes('gzip')) {
      const compressedBody = response.body.pipeThrough(new CompressionStream('gzip'));
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Content-Encoding', 'gzip');
      newHeaders.set('Vary', 'Accept-Encoding');
      newHeaders.delete('Content-Length');

      return new Response(compressedBody, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
  }

  return response;
});
