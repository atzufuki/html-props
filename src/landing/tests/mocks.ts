/**
 * Mock fetch for testing. Uses direct assignment instead of stub
 * because setup.ts already patches globalThis.fetch.
 */
export function mockFetch(responses: Record<string, string | object>) {
  const originalFetch = globalThis.fetch;
  const calls: { args: [string | URL | Request, RequestInit?] }[] = [];

  const mockFn = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    calls.push({ args: [input, init] });

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
  };

  globalThis.fetch = mockFn;

  return {
    restore: () => {
      globalThis.fetch = originalFetch;
    },
    stub: { calls },
  };
}
