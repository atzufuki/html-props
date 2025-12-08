// deno-lint-ignore-file no-explicit-any

// Simple dev server that:
// - serves files from src/landing
// - runs Deno.bundle on src/landing/main.ts to src/landing/main.bundle.js on startup
// - watches src/landing for changes, rebundles, and notifies HMR clients via SSE

const clients = new Set<ReadableStreamDefaultController<any>>();

const MIME_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  ts: 'text/typescript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  ico: 'image/x-icon',
  md: 'text/markdown; charset=utf-8',
};

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
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
    await Deno.mkdir('src/landing/dist', { recursive: true });
    console.log('[landing] bundling...');
    await Promise.all([
      bundleJS('src/landing/main.ts', 'src/landing/dist/main.bundle.js'),
      bundleJS('src/landing/hmr-client.ts', 'src/landing/dist/hmr-client.js'),
    ]);

    console.log('[landing] bundle ok');
    broadcastReload();
  } catch (e) {
    console.error('[landing] bundle failed', e);
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
  const path = url.pathname;

  if (path === '/hmr') {
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

  if (path === '/api/docs') {
    try {
      const docsUrl = new URL('../../docs', import.meta.url);
      const files = [];
      for await (const dirEntry of Deno.readDir(docsUrl)) {
        if (dirEntry.isFile && dirEntry.name.endsWith('.md')) {
          files.push(dirEntry.name);
        }
      }
      return new Response(JSON.stringify(files), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }

  // Serve docs from project root
  if (path.startsWith('/api/docs/content/')) {
    try {
      const filename = path.replace('/api/docs/content/', '');
      const docsUrl = new URL(`../../docs/${filename}`, import.meta.url);
      const file = await Deno.readFile(docsUrl);

      return new Response(file, {
        headers: { 'Content-Type': getContentType(filename) },
      });
    } catch {
      return new Response('Doc not found', { status: 404 });
    }
  }

  let filePath = path;
  if (filePath === '/') filePath = '/index.html';
  if (filePath === '/main.bundle.js' || filePath === '/hmr-client.js') {
    filePath = '/dist' + filePath;
  }

  try {
    const fileUrl = new URL('.' + filePath, import.meta.url);
    const file = await Deno.readFile(fileUrl);

    return new Response(file, {
      headers: { 'Content-Type': getContentType(filePath) },
    });
  } catch {
    // SPA Fallback: Serve index.html for unknown paths (if not an API call)
    if (!path.startsWith('/api/')) {
      try {
        const indexUrl = new URL('./index.html', import.meta.url);
        const index = await Deno.readFile(indexUrl);
        return new Response(index, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    }
    return new Response('Not found', { status: 404 });
  }
}

async function main() {
  await bundle();

  // Watch for changes under src/landing and rebundle
  (async () => {
    const watcher = Deno.watchFs(['src/landing']);
    for await (const event of watcher) {
      const shouldIgnore = event.paths.every((path) =>
        path.includes('dist') || path.endsWith('main.bundle.js') || path.endsWith('hmr-client.js')
      );
      if (shouldIgnore) continue;

      if (
        event.kind === 'modify' || event.kind === 'create' ||
        event.kind === 'remove'
      ) {
        console.log('[landing] change detected, rebuilding…');
        await bundle();
      }
    }
  })();

  console.log('[landing] dev server on http://localhost:5173');
  Deno.serve({ port: 5173, hostname: '0.0.0.0' }, handleRequest);
}

if (import.meta.main) {
  main();
}
