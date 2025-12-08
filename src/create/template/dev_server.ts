// deno-lint-ignore-file no-explicit-any

// Simple dev server that:
// - serves files from public/
// - runs Deno.bundle on src/main.ts to public/bundle.js on startup
// - watches src/ for changes, rebundles, and notifies HMR clients via SSE

const clients = new Set<ReadableStreamDefaultController<any>>();

async function bundleCSS() {
  try {
    const cssFiles = ['src/index.css', 'src/App.css'];
    const contents = await Promise.all(
      cssFiles.map((f) =>
        Deno.readTextFile(f).catch((e) => {
          console.warn(`[dev] failed to read css file ${f}`, e);
          return '';
        })
      ),
    );
    await Deno.writeTextFile('public/bundle.css', contents.join('\n'));
    console.log('[dev] css bundle ok');
  } catch (e) {
    console.error('[dev] css bundle failed', e);
  }
}

async function bundleJS(entry: string, out: string) {
  // @ts-ignore: Deno.bundle is unstable
  const result = await Deno.bundle({
    entrypoints: [entry],
    platform: 'browser',
    minify: false,
    write: false,
  });

  let code = '';
  if (result.outputFiles?.length > 0) {
    code = await result.outputFiles[0].text();
  } else if (result.code) {
    code = result.code;
  } else {
    throw new Error(`No output for ${entry}`);
  }
  await Deno.writeTextFile(out, code);
}

async function bundle() {
  try {
    console.log('[dev] bundling...');
    await Promise.all([
      bundleCSS(),
      bundleJS('src/main.ts', 'public/bundle.js'),
      bundleJS('hmr_client.ts', 'public/hmr-client.js'),
    ]);
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
    } catch {
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
    const fileUrl = new URL('./public' + path, import.meta.url);
    const file = await Deno.readFile(fileUrl);
    const ext = path.split('.').pop() || '';
    const types: Record<string, string> = {
      html: 'text/html',
      js: 'text/javascript',
      css: 'text/css',
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      ico: 'image/x-icon',
      json: 'application/json',
    };

    return new Response(file, {
      headers: { 'Content-Type': types[ext] || 'application/octet-stream' },
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
