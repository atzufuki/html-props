import './setup.ts';
import { assertEquals } from 'jsr:@std/assert';
import { MarkdownService } from '../services/MarkdownService.ts';
import { mockFetch } from './mocks.ts';

Deno.test('MarkdownService fetches and parses doc', async () => {
  const mockContent = '# Test Doc\nHello';
  const fetchMock = mockFetch({
    '/docs/test.md': mockContent,
  });

  try {
    const service = MarkdownService.getInstance();
    const content = await service.fetchDoc('test');

    // Check HTML generation
    // marked parser wraps content in tags
    // Note: marked output depends on version/config, but usually:
    // <h1>Test Doc</h1>\n<p>Hello</p>\n
    // Let's check if it contains the expected tags
    assertEquals(content.html.includes('<h1>Test Doc</h1>'), true);
    assertEquals(content.html.includes('<p>Hello</p>'), true);

    // Check tokens
    assertEquals(content.tokens.length > 0, true);
    assertEquals(content.tokens[0].type, 'heading');
  } finally {
    fetchMock.restore();
  }
});

Deno.test('MarkdownService caches docs', async () => {
  let fetchCount = 0;
  const fetchMock = mockFetch({
    '/docs/cached.md': '# Cached',
  });

  // Spy on fetch to count calls
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    fetchCount++;
    return originalFetch(input, init);
  };

  try {
    const service = MarkdownService.getInstance();

    // First fetch
    await service.fetchDoc('cached');
    assertEquals(fetchCount, 1);

    // Second fetch should be cached
    await service.fetchDoc('cached');
    assertEquals(fetchCount, 1);
  } finally {
    fetchMock.restore();
  }
});

Deno.test('MarkdownService parses sidebar items', async () => {
  const indexContent = `
- [Home](home.md)
- [Guide](guide.md)
  - [Setup](setup.md)
`;
  const fetchMock = mockFetch({
    '/docs/index.md': indexContent,
  });

  try {
    const service = MarkdownService.getInstance();
    // Clear cache for index if any (singleton persists across tests)
    // We can't easily clear private cache, but we can use a unique version or ensure fresh state?
    // Or we can just rely on the fact that 'index' hasn't been fetched in this test run yet?
    // Actually, previous tests might have fetched 'index'.
    // Let's use a different version string to bypass cache if needed, but fetchDoc uses version.
    // Default version is 'local'.

    // To be safe, let's assume cache might be populated.
    // But we can't clear it.
    // However, the mockFetch will intercept the request if it's made.
    // If it's cached, it won't call fetch.
    // But we want to test parsing logic which happens after fetch (or on cached content).
    // Wait, if it's cached, it returns cached content.
    // So if previous tests cached 'index', we get that content.
    // We need to ensure we test with OUR content.

    // Workaround: Use a unique version for this test
    const version = 'test-version';
    // We need to mock the URL for that version
    // URL: https://raw.githubusercontent.com/atzufuki/html-props/test-version/docs/index.md

    // We can't nest mockFetch calls becaue they stub the same global method.
    // We should update the existing mock or create a new one that handles both.,
    //
    // Let's just use one mockFetch for everything in this test.

    fetchMock.restore(); // Restore first

    const combinedMock = mockFetch({
      '/docs/index.md': indexContent,
      'https://raw.githubusercontent.com/atzufuki/html-props/test-version/docs/index.md': indexContent,
    });

    try {
      const items = await service.getSidebarItems(version);

      assertEquals(items.length, 2);
      assertEquals(items[0].label, 'Home');
      assertEquals(items[0].file, 'home.md');
      assertEquals(items[1].label, 'Guide');
      assertEquals(items[1].file, 'guide.md');
    } finally {
      combinedMock.restore();
    }
  } finally {
    // fetchMock already restored
  }
});
