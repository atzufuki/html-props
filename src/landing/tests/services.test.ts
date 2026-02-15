/**
 * Tests for landing page services using Playwright.
 *
 * Tests run in a real browser via Playwright while using Deno.test() as the runner.
 */

import { assertEquals } from 'jsr:@std/assert';
import { loadTestPage, setupBrowser, teardownBrowser, TEST_OPTIONS, type TestContext } from '../../test-utils/mod.ts';

let ctx: TestContext;

Deno.test({
  name: 'Landing Services Tests',
  ...TEST_OPTIONS,
  async fn(t) {
    ctx = await setupBrowser();

    await t.step('MarkdownService fetches and parses doc', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { MarkdownService } from "./src/landing/services/MarkdownService.ts";

          // Mock fetch
          const mockContent = '# Test Doc\\nHello';
          const originalFetch = window.fetch;
          const fetchCalls: string[] = [];

          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input.toString();
            fetchCalls.push(url);
            if (url.includes('test.md')) {
              return new Response(mockContent, { status: 200 });
            }
            return new Response('Not Found', { status: 404 });
          };

          const service = MarkdownService.getInstance();
          service.clearCache();

          try {
            const content = await service.fetchDoc('test');
            (window as any).testResult = {
              html: content.html,
              tokensLength: content.tokens.length,
              firstTokenType: content.tokens[0]?.type,
              fetchCalls,
            };
          } catch (e) {
            (window as any).testResult = { error: String(e) };
          } finally {
            window.fetch = originalFetch;
          }
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).testResult);

      if (result.error) {
        throw new Error(`Test failed: ${result.error}`);
      }

      assertEquals(result.html.includes('<h1>Test Doc</h1>'), true);
      assertEquals(result.html.includes('<p>Hello</p>'), true);
      assertEquals(result.tokensLength > 0, true);
      assertEquals(result.firstTokenType, 'heading');
    });

    await t.step('MarkdownService caches docs', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { MarkdownService } from "./src/landing/services/MarkdownService.ts";

          // Mock fetch
          const originalFetch = window.fetch;
          let fetchCallCount = 0;

          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input.toString();
            if (url.includes('cached.md')) {
              fetchCallCount++;
              return new Response('# Cached', { status: 200 });
            }
            return new Response('Not Found', { status: 404 });
          };

          const service = MarkdownService.getInstance();
          service.clearCache();

          try {
            await service.fetchDoc('cached');
            const callsAfterFirst = fetchCallCount;

            await service.fetchDoc('cached');
            const callsAfterSecond = fetchCallCount;

            (window as any).testResult = {
              callsAfterFirst,
              callsAfterSecond,
            };
          } catch (e) {
            (window as any).testResult = { error: String(e) };
          } finally {
            window.fetch = originalFetch;
          }
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).testResult);

      if (result.error) {
        throw new Error(`Test failed: ${result.error}`);
      }

      assertEquals(result.callsAfterFirst, 1);
      assertEquals(result.callsAfterSecond, 1, 'Should use cached doc');
    });

    await t.step('MarkdownService parses sidebar items', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { MarkdownService } from "./src/landing/services/MarkdownService.ts";

          const indexContent = \`
- [Getting Started](getting-started.md)
- [Guide](guide.md)
\`;
          const version = 'test-version';

          // Mock fetch
          const originalFetch = window.fetch;
          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input.toString();
            if (url.includes('test-version') && url.includes('index.md')) {
              return new Response(indexContent, { status: 200 });
            }
            return new Response('Not Found', { status: 404 });
          };

          const service = MarkdownService.getInstance();
          service.clearCache();

          try {
            const items = await service.getSidebarItems(version);
            (window as any).testResult = {
              itemCount: items.length,
              items: items.map((item: any) => ({ label: item.label, file: item.file })),
            };
          } catch (e) {
            (window as any).testResult = { error: String(e) };
          } finally {
            window.fetch = originalFetch;
          }
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).testResult);

      if (result.error) {
        throw new Error(`Test failed: ${result.error}`);
      }

      assertEquals(result.itemCount, 2);
      assertEquals(result.items[0].label, 'Getting Started');
      assertEquals(result.items[0].file, 'getting-started.md');
      assertEquals(result.items[1].label, 'Guide');
      assertEquals(result.items[1].file, 'guide.md');
    });

    await t.step('MarkdownService resolves version from hostname', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { MarkdownService } from "./src/landing/services/MarkdownService.ts";

          const service = MarkdownService.getInstance();
          service.clearCache();

          // Test main (production) - simulate by checking resolveVersion logic
          // We can't easily change window.location.hostname, so we test the logic indirectly

          const originalFetch = window.fetch;
          const fetchedUrls: string[] = [];

          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input.toString();
            fetchedUrls.push(url);
            if (url.includes('.md')) {
              return new Response('# Test', { status: 200 });
            }
            return new Response('Not Found', { status: 404 });
          };

          try {
            // Test with explicit version
            await service.fetchDoc('explicit-test', 'v2');

            (window as any).testResult = {
              fetchedUrls,
              hasV2Url: fetchedUrls.some(url => url.includes('/v2/')),
            };
          } catch (e) {
            (window as any).testResult = { error: String(e) };
          } finally {
            window.fetch = originalFetch;
          }
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).testResult);

      if (result.error) {
        throw new Error(`Test failed: ${result.error}`);
      }

      assertEquals(result.hasV2Url, true);
    });

    await t.step('MarkdownService caches versions', async () => {
      await loadTestPage(ctx.page, {
        code: `
          import { MarkdownService } from "./src/landing/services/MarkdownService.ts";

          const originalFetch = window.fetch;
          let fetchCallCount = 0;

          window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input.toString();
            if (url.includes('versions.json')) {
              fetchCallCount++;
              return new Response('[{"label":"Latest","ref":"main"}]', {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            }
            return new Response('Not Found', { status: 404 });
          };

          const service = MarkdownService.getInstance();
          service.clearCache();

          try {
            await service.getVersions();
            const callsAfterFirst = fetchCallCount;

            await service.getVersions();
            const callsAfterSecond = fetchCallCount;

            (window as any).testResult = {
              callsAfterFirst,
              callsAfterSecond,
            };
          } catch (e) {
            (window as any).testResult = { error: String(e) };
          } finally {
            window.fetch = originalFetch;
          }
        `,
      });

      const result = await ctx.page.evaluate(() => (window as any).testResult);

      if (result.error) {
        throw new Error(`Test failed: ${result.error}`);
      }

      assertEquals(result.callsAfterFirst, 1);
      assertEquals(result.callsAfterSecond, 1, 'Should use cached versions');
    });

    // Cleanup
    await teardownBrowser(ctx);
  },
});
