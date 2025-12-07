import { assertEquals, assertExists } from 'jsr:@std/assert';
import { setup, teardown } from './setup.ts';
import { mockFetch } from './mocks.ts';
import { MarkdownService } from '../services/MarkdownService.ts';

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
  const heroTitle = app.innerHTML.includes('HTML Props');
  assertEquals(heroTitle, true, 'Landing page should render hero title');
});

Deno.test('App routes to DocsPage', async () => {
  const fetchMock = mockFetch({
    '/docs/index.md': '- [Intro](introduction.md)',
  });

  try {
    const app = new App();
    document.body.appendChild(app);

    // Manually trigger route change since we can't easily mock window.location in Deno test runner
    app.route = '/docs';

    await new Promise((resolve) => setTimeout(resolve, 100));

    // DocsPage renders a Sidebar (docs-sidebar)
    const sidebar = app.querySelector('docs-sidebar');
    assertExists(sidebar, 'Docs page should render sidebar');
  } finally {
    fetchMock.restore();
  }
});

Deno.test('DocsPage loads sidebar', async () => {
  const fetchMock = mockFetch({
    '/api/docs/content/index.md': '- [Intro](introduction.md)\n- [Install](installation.md)',
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
  const fetchMock = mockFetch({
    '/api/docs/content/index.md': '- [Intro](introduction.md)',
  });

  try {
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
  } finally {
    fetchMock.restore();
  }
});

Deno.test('DocsPage renders version selector (local)', async () => {
  const fetchMock = mockFetch({
    '/docs/index.md': '- [Intro](introduction.md)',
    '/api/docs/content/versions.json': [
      { label: 'Latest', ref: 'main' },
      { label: 'v1.0 Beta', ref: 'v1.0.0-beta.1' },
    ],
  });

  try {
    const page = new DocsPage();
    document.body.appendChild(page);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const select = page.querySelector('select');
    assertExists(select, 'Version selector should exist');

    // Should have 'local', 'main', 'v1.0.0-beta.1'
    assertEquals(select.options.length, 3);
    assertEquals(select.options[0].value, 'local');
    assertEquals(select.options[1].value, 'main');
    assertEquals(select.options[2].value, 'v1.0.0-beta.1');
  } finally {
    fetchMock.restore();
  }
});

Deno.test('DocsPage fetches versions from GitHub when not local', async () => {
  // Save original hostname
  const originalHostname = window.location.hostname;
  Object.defineProperty(window.location, 'hostname', {
    value: 'example.com',
    writable: true,
  });

  const fetchMock = mockFetch({
    'https://raw.githubusercontent.com/atzufuki/html-props/main/docs/versions.json': [
      { label: 'Latest', ref: 'main' },
      { label: 'v1.0 Beta', ref: 'v1.0.0-beta.1' },
    ],
    'https://raw.githubusercontent.com/atzufuki/html-props/main/docs/index.md': '- [Beta](beta.md)',
  });

  try {
    const page = new DocsPage();
    document.body.appendChild(page);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const select = page.querySelector('select');
    assertExists(select, 'Version selector should exist');

    // Should have 'main', 'v1.0.0-beta.1'
    assertEquals(select.options.length, 2);
    assertEquals(select.options[0].value, 'main');
    assertEquals(select.options[1].value, 'v1.0.0-beta.1');
  } finally {
    // Restore
    Object.defineProperty(window.location, 'hostname', {
      value: originalHostname,
      writable: true,
    });
    fetchMock.restore();
  }
});

Deno.test('DocsPage displays error when fetch fails', async () => {
  MarkdownService.getInstance().clearCache();
  const fetchMock = mockFetch({}); // No routes mocked, will return 404

  try {
    const page = new DocsPage();
    document.body.appendChild(page);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check innerHTML because textContent might be tricky with shadow DOM or custom elements
    const html = page.innerHTML;
    if (!html.includes('Oops! Something went wrong')) {
      console.log('Page content:', html);
    }
    assertEquals(html.includes('Oops! Something went wrong'), true);
    assertEquals(html.includes('Failed to fetch doc'), true);

    const retryBtn = page.querySelector('button');
    assertExists(retryBtn, 'Retry button should exist');
  } finally {
    fetchMock.restore();
  }
});
