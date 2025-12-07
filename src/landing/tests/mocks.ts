import { stub } from 'jsr:@std/testing/mock';

export function mockFetch(responses: Record<string, string | object>) {
  const fetchStub = stub(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();

    // Find matching response
    for (const [key, value] of Object.entries(responses)) {
      if (url.includes(key)) {
        const body = typeof value === 'string' ? value : JSON.stringify(value);
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': typeof value === 'string' ? 'text/plain' : 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  });

  return {
    restore: () => fetchStub.restore(),
    stub: fetchStub,
  };
}
