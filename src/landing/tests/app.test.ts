import './setup.ts';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { App } from '../App.ts';
import { DocsPage } from '../views/DocsPage.ts';
import { mockFetch } from './mocks.ts';

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

  // Simulate navigation
  window.location.hash = '#/docs';
  window.dispatchEvent(new Event('hashchange'));

  await new Promise((resolve) => setTimeout(resolve, 100));

  // DocsPage renders a Sidebar (Aside)
  const sidebar = app.querySelector('aside');
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

    const links = page.querySelectorAll('aside a');
    // Should have links from the mock index.md
    // Note: Sidebar items are mapped from index.md tokens.
    // MarkdownService.getSidebarItems parses the list.
    // Let's verify we get at least some links.
    // The mock index.md has 2 items.
    assertEquals(links.length > 0, true, 'Sidebar should have links');

    const firstLink = links[0] as HTMLAnchorElement;
    assertEquals(firstLink.textContent, 'Intro');
  } finally {
    fetchMock.restore();
  }
});

Deno.test('DocsPage passes correct src to MarkdownViewer', async () => {
  const app = new App();
  // Note: App.connectedCallback sets route from window.location.hash
  // So setting app.route manually might be overwritten if we don't update hash or if connectedCallback runs after

  // Let's set hash first
  window.location.hash = '#/docs/installation';
  document.body.appendChild(app);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const viewer = app.querySelector('markdown-viewer') as any;
  assertExists(viewer);

  assertEquals(viewer.src, 'installation');

  // Check default route
  window.location.hash = '#/docs';
  window.dispatchEvent(new Event('hashchange'));

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Re-query viewer as the app might have re-rendered and replaced the element
  const updatedViewer = app.querySelector('markdown-viewer') as any;
  assertEquals(updatedViewer.src, 'introduction');
});
