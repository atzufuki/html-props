// deno-lint-ignore-file no-explicit-any

// Simple dev server that:
// - serves files from public/
// - runs Deno.bundle on src/main.ts to public/bundle.js on startup
// - watches src/ for changes, rebundles, and notifies HMR clients via SSE

const clients = new Set<ReadableStreamDefaultController<any>>();

async function bundleCSS() {
  try {
    const cssFiles = ['src/index.css', 'src/App.css'];
    let bundleContent = '';
    for (const file of cssFiles) {
      try {
        const content = await Deno.readTextFile(file);
        bundleContent += content + '\n';
      } catch (e) {
        console.warn(`[dev] failed to read css file ${file}`, e);
      }
    }
    await Deno.writeTextFile('public/bundle.css', bundleContent);
    console.log('[dev] css bundle ok');
  } catch (e) {
    console.error('[dev] css bundle failed', e);
  }
}

async function bundle() {
  try {
    await bundleCSS();

    // @ts-ignore: Deno.bundle is unstable
    const mainResult = await Deno.bundle({
      entrypoints: ['src/main.ts'],
      platform: 'browser',
      minify: false,
      write: false,
    });

    if (mainResult.outputFiles && mainResult.outputFiles.length > 0) {
      const text = await mainResult.outputFiles[0].text();
      await Deno.writeTextFile('public/bundle.js', text);
    } else {
      console.error('[dev] main bundle failed: no output');
    }

    // @ts-ignore: Deno.bundle is unstable
    const hmrResult = await Deno.bundle({
      entrypoints: ['hmr-client.ts'],
      platform: 'browser',
      minify: false,
      write: false,
    });

    if (hmrResult.outputFiles && hmrResult.outputFiles.length > 0) {
      const text = await hmrResult.outputFiles[0].text();
      await Deno.writeTextFile('public/hmr-client.js', text);
    } else {
      console.error('[dev] hmr bundle failed: no output');
    }

    console.log('[dev] bundle ok');
    broadcastReload();
  } catch (e) {
    console.error('[dev] bundle failed', e);
  }
}

function broadcastReload() {
  const msg = new TextEncoder().encode('data: reload\n\n');
  for (const client of clients) {
    try {
      client.enqueue(msg);
    } catch (_err) {
      clients.delete(client);
    }
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/hmr') {
    let controller: ReadableStreamDefaultController<any>;
    const stream = new ReadableStream({
      start(c) {
        controller = c;
        clients.add(controller);
        controller.enqueue(new TextEncoder().encode(': connected\n\n'));
      },
      cancel() {
        if (controller) clients.delete(controller);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  let path = url.pathname;
  if (path === '/') path = '/index.html';

  try {
    // Serve from public/
    const fileUrl = new URL('./public' + path, import.meta.url);
    const file = await Deno.readFile(fileUrl);

    const ext = path.split('.').pop();
    const type = ext === 'html'
      ? 'text/html'
      : ext === 'js'
      ? 'text/javascript'
      : ext === 'css'
      ? 'text/css'
      : 'application/octet-stream';

    return new Response(file, {
      headers: { 'Content-Type': type },
    });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}

// Initial bundle
await bundle();

// Watcher
(async () => {
  const watcher = Deno.watchFs(['src']);
  let timer: number | undefined;
  for await (const _event of watcher) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      console.log('[dev] file change detected, bundling...');
      bundle();
    }, 100);
  }
})();

console.log('Dev server running at http://localhost:8000');
Deno.serve({ port: 8000 }, handleRequest);
