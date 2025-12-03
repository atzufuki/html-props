import { assertEquals, assertExists } from 'jsr:@std/assert';
import { setup, teardown } from './setup.ts';
import { mockFetch } from './mocks.ts';

let App: any;
let DocsPage: any;

Deno.test.beforeAll(async () => {
  setup();
  const appMod = await import('../App.ts');
  App = appMod.App;
  const docsMod = await import('../views/DocsPage.ts');
  DocsPage = docsMod.DocsPage;
});

Deno.test.afterAll(() => {
  teardown();
});

Deno.test('App renders LandingPage by default', async () => {
  const app = new App();
  document.body.appendChild(app);

  await new Promise((resolve) => setTimeout(resolve, 0));

  // Check for Hero title
  const heroTitle = app.innerHTML.includes('Reactive Custom Elements');
  assertEquals(heroTitle, true, 'Landing page should render hero title');
});

Deno.test('App routes to DocsPage', async () => {
  const app = new App();
  document.body.appendChild(app);

  // Manually trigger route change since we can't easily mock window.location in Deno test runner
  app.route = '/docs';

  await new Promise((resolve) => setTimeout(resolve, 100));

  // DocsPage renders a Sidebar (docs-sidebar)
  const sidebar = app.querySelector('docs-sidebar');
  assertExists(sidebar, 'Docs page should render sidebar');
});

Deno.test('DocsPage loads sidebar', async () => {
  const fetchMock = mockFetch({
    '/api/docs': ['introduction.md', 'installation.md'], // Mock manifest if used
    '/docs/index.md': '- [Intro](introduction.md)\n- [Install](installation.md)',
  });

  try {
    const page = new DocsPage();
    document.body.appendChild(page);

    // Wait for async load
    await new Promise((resolve) => setTimeout(resolve, 100));

    const links = page.querySelectorAll('docs-sidebar a');
    assertEquals(links.length > 0, true, 'Sidebar should have links');

    const firstLink = links[0] as HTMLAnchorElement;
    assertEquals(firstLink.textContent, 'Intro');
  } finally {
    fetchMock.restore();
  }
});

Deno.test('DocsPage passes correct src to MarkdownViewer', async () => {
  const app = new App();
  document.body.appendChild(app);
  app.route = '/docs/installation';

  await new Promise((resolve) => setTimeout(resolve, 100));

  const viewer = app.querySelector('markdown-viewer') as any;
  assertExists(viewer);

  assertEquals(viewer.src, 'installation');

  app.route = '/docs';

  await new Promise((resolve) => setTimeout(resolve, 100));
  const updatedViewer = app.querySelector('markdown-viewer') as any;
  assertEquals(updatedViewer.src, 'introduction');
});
