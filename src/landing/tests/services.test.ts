import { assertEquals } from 'jsr:@std/assert';
import { setup, teardown } from './setup.ts';
import { mockFetch } from './mocks.ts';

let MarkdownService: any;

// @ts-ignore: Deno.test.beforeAll is available in Deno 2+
Deno.test.beforeAll(async () => {
  setup();
  MarkdownService = (await import('../services/MarkdownService.ts')).MarkdownService;
});

// @ts-ignore: Deno.test.afterAll is available in Deno 2+
Deno.test.afterAll(() => {
  teardown();
});

Deno.test('MarkdownService fetches and parses doc', async () => {
  const mockContent = '# Test Doc\nHello';
  const fetchMock = mockFetch({
    '/docs/test.md': mockContent,
  });

  try {
    const service = MarkdownService.getInstance();
    const content = await service.fetchDoc('test');

    assertEquals(content.html.includes('<h1>Test Doc</h1>'), true);
    assertEquals(content.html.includes('<p>Hello</p>'), true);

    assertEquals(content.tokens.length > 0, true);
    assertEquals(content.tokens[0].type, 'heading');
  } finally {
    fetchMock.restore();
  }
});

Deno.test('MarkdownService caches docs', async () => {
  const fetchMock = mockFetch({
    '/docs/cached.md': '# Cached',
  });

  try {
    const service = MarkdownService.getInstance();

    await service.fetchDoc('cached');
    assertEquals(fetchMock.stub.calls.length, 1);

    await service.fetchDoc('cached');
    assertEquals(fetchMock.stub.calls.length, 1);
  } finally {
    fetchMock.restore();
  }
});

Deno.test('MarkdownService parses sidebar items', async () => {
  const indexContent = `
- [Getting Started](getting-started.md)
- [Guide](guide.md)
`;
  const version = 'test-version';
  const fetchMock = mockFetch({
    'https://raw.githubusercontent.com/atzufuki/html-props/test-version/docs/index.md': indexContent,
  });

  try {
    const service = MarkdownService.getInstance();
    const items = await service.getSidebarItems(version);

    assertEquals(items.length, 2);
    assertEquals(items[0].label, 'Getting Started');
    assertEquals(items[0].file, 'getting-started.md');
    assertEquals(items[1].label, 'Guide');
    assertEquals(items[1].file, 'guide.md');
  } finally {
    fetchMock.restore();
  }
});

Deno.test('MarkdownService resolves version from hostname', async () => {
  const originalHostname = window.location.hostname;

  try {
    const service = MarkdownService.getInstance();

    // Test production main fallback
    (window.location as any).hostname = 'html-props.deno.dev';
    let fetchMock = mockFetch({
      'https://raw.githubusercontent.com/atzufuki/html-props/main/docs/test-main.md': '# Main',
    });

    (service as any).cache.clear();
    await service.fetchDoc('test-main');

    // Check the URL called
    const callArgs = fetchMock.stub.calls[0].args;
    const url = callArgs[0].toString();
    assertEquals(url, 'https://raw.githubusercontent.com/atzufuki/html-props/main/docs/test-main.md');

    fetchMock.restore();

    // Test branch version
    (window.location as any).hostname = 'html-props--v2.deno.dev';
    fetchMock = mockFetch({
      'https://raw.githubusercontent.com/atzufuki/html-props/v2/docs/test-v2.md': '# V2',
    });

    (service as any).cache.clear();
    await service.fetchDoc('test-v2');

    const callArgs2 = fetchMock.stub.calls[0].args;
    const url2 = callArgs2[0].toString();
    assertEquals(url2, 'https://raw.githubusercontent.com/atzufuki/html-props/v2/docs/test-v2.md');

    fetchMock.restore();
  } finally {
    (window.location as any).hostname = originalHostname;
  }
});
