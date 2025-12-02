import { assertEquals } from 'jsr:@std/assert';
import { setup, teardown } from './setup.ts';
import { effect, signal } from '@html-props/signals';
import { mockFetch } from './mocks.ts';

let MarkdownViewer: any;
let NavBar: any;
let Sidebar: any;
let FeatureCard: any;
let CodeBlock: any;
let AppButton: any;
let Hero: any;

// @ts-ignore: Deno.test.beforeAll is available in Deno 2+
Deno.test.beforeAll(async () => {
  setup();
  MarkdownViewer = (await import('../components/MarkdownViewer.ts')).MarkdownViewer;
  NavBar = (await import('../components/NavBar.ts')).NavBar;
  Sidebar = (await import('../components/Sidebar.ts')).Sidebar;
  FeatureCard = (await import('../components/FeatureCard.ts')).FeatureCard;
  CodeBlock = (await import('../components/CodeBlock.ts')).CodeBlock;
  AppButton = (await import('../components/AppButton.ts')).AppButton;
  Hero = (await import('../components/Hero.ts')).Hero;
});

// @ts-ignore: Deno.test.afterAll is available in Deno 2+
Deno.test.afterAll(() => {
  teardown();
});

Deno.test('MarkdownViewer renders markdown content', async () => {
  const viewer = new MarkdownViewer({
    markdown: '# Hello World\nThis is a test.',
  });
  document.body.appendChild(viewer);

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

  const activeLink = links[0] as HTMLElement;
  const inactiveLink = links[1] as HTMLElement;

  assertEquals(activeLink.style.backgroundColor !== 'transparent', true);
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

  const divs = card.querySelectorAll('div');
  let iconFound = false;
  divs.forEach((div: any) => {
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
  assertEquals(pre?.textContent?.includes('const x = 1;'), true);
});

Deno.test('MarkdownViewer handles loading state', async () => {
  const viewer = new MarkdownViewer({ src: 'loading-test' });

  const originalFetch = globalThis.fetch;
  let resolveFetch: (value: Response) => void;
  const fetchPromise = new Promise<Response>((resolve) => {
    resolveFetch = resolve;
  });

  globalThis.fetch = () => fetchPromise;

  try {
    document.body.appendChild(viewer);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assertEquals(viewer.textContent?.includes('Loading'), true);

    resolveFetch!(new Response('# Loaded', { status: 200 }));

    await new Promise((resolve) => setTimeout(resolve, 100));

    const h1 = viewer.querySelector('h1');
    assertEquals(h1?.textContent, 'Loaded');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('MarkdownViewer handles error state', async () => {
  const viewer = new MarkdownViewer({ src: 'error-test' });
  const fetchMock = mockFetch({});

  try {
    document.body.appendChild(viewer);
    await new Promise((resolve) => setTimeout(resolve, 100));

    assertEquals(viewer.textContent?.includes('Error'), true);
  } finally {
    fetchMock.restore();
  }
});

Deno.test('AppButton renders correctly', async () => {
  // Test button variant
  const btn = new AppButton({ label: 'Click Me' });
  document.body.appendChild(btn);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const buttonEl = btn.querySelector('button');
  assertEquals(!!buttonEl, true);
  assertEquals(buttonEl.textContent, 'Click Me');

  // Test link variant
  const linkBtn = new AppButton({ label: 'Go Home', href: '/' });
  document.body.appendChild(linkBtn);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const linkEl = linkBtn.querySelector('a');
  assertEquals(!!linkEl, true);
  assertEquals(linkEl.getAttribute('href'), '/');
});

Deno.test('Hero renders buttons', async () => {
  const hero = new Hero({
    primaryCta: 'Start',
    secondaryCta: 'Learn More',
  });
  document.body.appendChild(hero);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const buttons = hero.querySelectorAll('app-button');
  assertEquals(buttons.length, 2);
  assertEquals(buttons[0].label, 'Start');
  assertEquals(buttons[1].label, 'Learn More');
});
