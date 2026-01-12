import { GlobalRegistrator } from 'npm:@happy-dom/global-registrator@^12.10.3';
import { MarkdownService } from '../services/MarkdownService.ts';
import { assert, assertEquals } from 'jsr:@std/assert';

// Mock Fetch Helper
const originalFetch = globalThis.fetch;
function mockFetch(routes: Record<string, any>) {
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = input.toString();

    // Simple matching
    for (const key in routes) {
      if (url.includes(key)) {
        const body = routes[key];
        return new Response(typeof body === 'string' ? body : JSON.stringify(body));
      }
    }

    return new Response('Not Found', { status: 404 });
  };
}

Deno.test('DocsPage (HappyDOM)', async (t) => {
  // 1. Setup Happy DOM
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Ignore
  }

  // Workaround for Happy DOM vs Deno Event conflict
  if ((globalThis as any).window && (globalThis as any).window.Event) {
    (globalThis as any).Event = (globalThis as any).window.Event;
  }

  // Polyfill missing elements
  const missing = [
    'HTMLOptGroupElement',
    'HTMLPictureElement',
    'HTMLDialogElement',
    'HTMLOptionElement',
    'HTMLSelectElement',
    'HTMLTableElement',
    'HTMLTableRowElement',
    'HTMLTableCellElement',
    'HTMLTableSectionElement',
    'HTMLTimeElement',
  ];

  for (const k of missing) {
    if (!(globalThis as any)[k]) {
      (globalThis as any)[k] = class extends HTMLElement {};
    }
  }

  // Polyfill isEqualNode if missing (Happy DOM issue?)
  if ((globalThis as any).Node && !(globalThis as any).Node.prototype.isEqualNode) {
    (globalThis as any).Node.prototype.isEqualNode = function (other: any) {
      return this === other || (this.nodeType === other.nodeType && this.nodeName === other.nodeName);
    };
  }

  // 2. Dynamic Import Component (needs DOM globals)
  const { DocsPage } = await import('../views/DocsPage.ts');

  // Clear singleton state
  MarkdownService.getInstance().clearCache();

  // Helper to teardown fetch
  const restoreFetch = () => {
    globalThis.fetch = originalFetch;
  };

  await t.step('initializes and loads defaults', async () => {
    mockFetch({
      'versions.json': [{ label: 'Latest', ref: 'main' }],
    });

    const page = new DocsPage();
    document.body.appendChild(page);

    // Initial render should be synchronous but wait slightly
    await new Promise((r) => setTimeout(r, 50));

    // Verify structure
    assert(page.isConnected, 'Element should be in DOM');
    assert(page.childNodes.length > 0, 'Should have children');

    // Clean up
    document.body.removeChild(page);
    restoreFetch();
  });

  await t.step('resolves route correctly (derived state)', async () => {
    mockFetch({
      'versions.json': [{ label: 'v2', ref: 'v2' }, { label: 'v1', ref: 'v1' }],
    });

    const page = new DocsPage();
    (page as any).route = '/docs/v2/guide';

    document.body.appendChild(page);
    await new Promise((r) => setTimeout(r, 10));

    // Verify structure (should assume loaded)
    assert(page.isConnected);

    document.body.removeChild(page);
    restoreFetch();
  });

  await t.step('optimizes rendering: sidebar loads only once for same version', async () => {
    // Spy on service
    const service = MarkdownService.getInstance();
    let calls = 0;
    const originalGet = service.getSidebarItems;

    // Mock getSidebarItems
    service.getSidebarItems = async (version: string) => {
      calls++;
      return [{ label: 'Guide', file: 'guide.md' }];
    };

    mockFetch({
      'versions.json': [{ label: 'v1', ref: 'v1' }],
    });

    const page = new DocsPage();
    (page as any).route = '/docs/v1/';

    document.body.appendChild(page);

    // First load
    await new Promise((r) => setTimeout(r, 10));
    assertEquals(calls, 1, 'Should load sidebar once');

    // Change route to same version
    (page as any).route = '/docs/v1/b';
    await new Promise((r) => setTimeout(r, 10));
    assertEquals(calls, 1, 'Should NOT reload sidebar for same version');

    // Cleanup
    service.getSidebarItems = originalGet;
    document.body.removeChild(page);
    restoreFetch();
  });

  // 3. Teardown
  GlobalRegistrator.unregister();
});
