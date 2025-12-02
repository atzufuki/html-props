import './setup.ts';
import { assertEquals } from 'jsr:@std/assert';
import { MarkdownViewer } from '../components/MarkdownViewer.ts';
import { effect, signal } from '@html-props/signals';
import { NavBar } from '../components/NavBar.ts';
import { Sidebar } from '../components/Sidebar.ts';
import { FeatureCard } from '../components/FeatureCard.ts';
import { CodeBlock } from '../components/CodeBlock.ts';
import { mockFetch } from './mocks.ts';

Deno.test('MarkdownViewer renders markdown content', async () => {
  const viewer = new MarkdownViewer({
    markdown: '# Hello World\nThis is a test.',
  });
  document.body.appendChild(viewer);

  // Wait for async rendering if needed, though initial render might be sync depending on implementation
  // MarkdownViewer uses marked.parse which can be async or sync depending on options,
  // but usually sync for strings. However, the component might render asynchronously.

  // Let's check the structure after a microtask to be safe
  await new Promise((resolve) => setTimeout(resolve, 0));

  const h1 = viewer.querySelector('h1');
  assertEquals(h1?.textContent, 'Hello World');

  const p = viewer.querySelector('p');
  assertEquals(p?.textContent, 'This is a test.');
});

Deno.test('MarkdownViewer updates content when prop changes', async () => {
  const viewer = new MarkdownViewer({
    markdown: '# Initial',
  });
  document.body.appendChild(viewer);

  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(viewer.querySelector('h1')?.textContent, 'Initial');

  viewer.markdown = '# Updated';

  await new Promise((resolve) => setTimeout(resolve, 0));
  assertEquals(viewer.querySelector('h1')?.textContent, 'Updated');
});

Deno.test('Signals work as expected', async () => {
  const count = signal(0);
  let runCount = 0;

  effect(() => {
    count();
    runCount++;
  });

  assertEquals(runCount, 1);

  count.set(1);
  assertEquals(runCount, 2);
});

Deno.test('NavBar renders links correctly', async () => {
  const nav = new NavBar({
    links: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
    ],
  });
  document.body.appendChild(nav);

  await new Promise((resolve) => setTimeout(resolve, 0));

  const links = nav.querySelectorAll('a');
  assertEquals(links.length, 2);
  assertEquals(links[0].textContent, 'Home');
  assertEquals(links[0].getAttribute('href'), '/');
  assertEquals(links[1].textContent, 'About');
  assertEquals(links[1].getAttribute('href'), '/about');
});

Deno.test('Sidebar renders items and highlights active', async () => {
  const sidebar = new Sidebar({
    items: [
      { label: 'Intro', href: '/intro', active: true },
      { label: 'Setup', href: '/setup' },
    ],
  });
  document.body.appendChild(sidebar);

  await new Promise((resolve) => setTimeout(resolve, 0));

  const links = sidebar.querySelectorAll('a');
  assertEquals(links.length, 2);

  // Check active styling (background color is set for active items)
  // Note: styles are inline, so we can check style property
  const activeLink = links[0] as HTMLElement;
  const inactiveLink = links[1] as HTMLElement;

  // Active link has background color
  assertEquals(activeLink.style.backgroundColor !== 'transparent', true);

  // Inactive link has transparent background
  assertEquals(inactiveLink.style.backgroundColor, 'transparent');
});

Deno.test('FeatureCard renders content', async () => {
  const card = new FeatureCard({
    icon: '🚀',
    heading: 'Fast',
    description: 'Very fast indeed.',
  });
  document.body.appendChild(card);

  await new Promise((resolve) => setTimeout(resolve, 0));

  const h3 = card.querySelector('h3');
  assertEquals(h3?.textContent, 'Fast');

  const p = card.querySelector('p');
  assertEquals(p?.textContent, 'Very fast indeed.');

  // Icon is in a div
  const divs = card.querySelectorAll('div');
  // First div is container, second is icon
  // Or we can search by text content
  let iconFound = false;
  divs.forEach((div) => {
    if (div.textContent === '🚀') iconFound = true;
  });
  assertEquals(iconFound, true);
});

Deno.test('CodeBlock renders code', async () => {
  const code = 'const x = 1;';
  const block = new CodeBlock({ code });
  document.body.appendChild(block);

  await new Promise((resolve) => setTimeout(resolve, 0));

  const pre = block.querySelector('pre');
  // CodeBlock highlights code, so textContent might be same but innerHTML will have spans
  // But textContent should match the code (minus HTML tags)
  // Actually CodeBlock replaces special chars, so let's check if it contains the code text
  assertEquals(pre?.textContent?.includes('const x = 1;'), true);
});

Deno.test('MarkdownViewer handles loading state', async () => {
  const viewer = new MarkdownViewer({ src: 'loading-test' });

  // Mock a slow fetch
  const originalFetch = globalThis.fetch;
  let resolveFetch: (value: Response) => void;
  const fetchPromise = new Promise<Response>((resolve) => {
    resolveFetch = resolve;
  });

  globalThis.fetch = () => fetchPromise;

  try {
    document.body.appendChild(viewer);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should show loading
    assertEquals(viewer.textContent?.includes('Loading'), true);

    // Resolve fetch
    resolveFetch!(new Response('# Loaded', { status: 200 }));

    // Wait for update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show content
    const h1 = viewer.querySelector('h1');
    assertEquals(h1?.textContent, 'Loaded');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('MarkdownViewer handles error state', async () => {
  const viewer = new MarkdownViewer({ src: 'error-test' });
  const fetchMock = mockFetch({}); // No routes defined = 404

  try {
    document.body.appendChild(viewer);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should show error
    assertEquals(viewer.textContent?.includes('Error'), true);
  } finally {
    fetchMock.restore();
  }
});
