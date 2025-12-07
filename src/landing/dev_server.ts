// deno-lint-ignore-file no-explicit-any

// Simple dev server that:
// - serves files from src/landing
// - runs Deno.bundle on src/landing/main.ts to src/landing/main.bundle.js on startup
// - watches src/landing for changes, rebundles, and notifies HMR clients via SSE

const clients = new Set<ReadableStreamDefaultController<any>>();

async function bundle() {
  try {
    await Deno.mkdir('src/landing/dist', { recursive: true });

    // @ts-ignore: Deno.bundle is unstable
    const mainResult = await Deno.bundle({
      entrypoints: ['src/landing/main.ts'],
      platform: 'browser',
      minify: false,
      write: false,
    });

    if (mainResult.outputFiles && mainResult.outputFiles.length > 0) {
      const text = await mainResult.outputFiles[0].text();
      await Deno.writeTextFile('src/landing/dist/main.bundle.js', text);
    } else {
      console.error('[landing] main bundle failed: no output');
    }

    // @ts-ignore: Deno.bundle is unstable
    const hmrResult = await Deno.bundle({
      entrypoints: ['src/landing/hmr-client.ts'],
      platform: 'browser',
      minify: false,
      write: false,
    });

    if (hmrResult.outputFiles && hmrResult.outputFiles.length > 0) {
      const text = await hmrResult.outputFiles[0].text();
      await Deno.writeTextFile('src/landing/dist/hmr-client.js', text);
    } else {
      console.error('[landing] hmr bundle failed: no output');
    }

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

      const ext = filename.split('.').pop()?.toLowerCase();
      let contentType = 'text/markdown; charset=utf-8';

      if (ext === 'png') contentType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'svg') contentType = 'image/svg+xml';

      return new Response(file, {
        headers: { 'Content-Type': contentType },
      });
    } catch (_) {
      return new Response('Doc not found', { status: 404 });
    }
  }

  if (path === '/') path = '/index.html';

  if (path === '/main.bundle.js' || path === '/hmr-client.js') {
    path = '/dist' + path;
  }

  try {
    const fileUrl = new URL('.' + path, import.meta.url);
    const file = await Deno.readFile(fileUrl);

    const ext = path.split('.').pop();
    const type = ext === 'html'
      ? 'text/html; charset=utf-8'
      : ext === 'js'
      ? 'text/javascript; charset=utf-8'
      : ext === 'ts'
      ? 'text/typescript; charset=utf-8'
      : ext === 'css'
      ? 'text/css; charset=utf-8'
      : ext === 'svg'
      ? 'image/svg+xml'
      : 'application/octet-stream';

    return new Response(file, {
      headers: { 'Content-Type': type },
    });
  } catch (_) {
    // SPA Fallback: Serve index.html for unknown paths (if not an API call)
    if (!path.startsWith('/api/')) {
      try {
        const indexUrl = new URL('./index.html', import.meta.url);
        const index = await Deno.readFile(indexUrl);
        return new Response(index, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      } catch (e) {
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
