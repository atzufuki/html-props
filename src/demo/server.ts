const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  let filePath = `.${url.pathname}`;

  if (url.pathname === '/') {
    filePath = './src/demo/static/index.html';
  } else if (url.pathname.startsWith('/static')) {
    filePath = url.pathname.replace('/static', './src/demo/static');
  }

  try {
    const file = await Deno.readFile(filePath);
    const contentType = filePath.endsWith('.html')
      ? 'text/html'
      : 'application/javascript';
    return new Response(file, {
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    console.error(error);
    return new Response('Not Found', { status: 404 });
  }
};

console.log('HTTP server is running. Access it at: http://localhost:3000/');
await Deno.serve({ port: 3000 }, handler);
