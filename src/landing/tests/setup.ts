import { parseHTML } from 'npm:linkedom';

if (!globalThis.document) {
  const {
    window,
    document,
    customElements,
    HTMLElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
    Text,
  } = parseHTML('<!DOCTYPE html><html><body></body></html>');

  Object.assign(globalThis, {
    window,
    document,
    customElements,
    HTMLElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
    Text,
  });

  // Mock common HTML elements
  const elements = [
    'HTMLDivElement',
    'HTMLSpanElement',
    'HTMLButtonElement',
    'HTMLParagraphElement',
    'HTMLAnchorElement',
    'HTMLImageElement',
    'HTMLHeadingElement',
    'HTMLUListElement',
    'HTMLOListElement',
    'HTMLLIElement',
    'HTMLPreElement',
    'HTMLQuoteElement',
    'HTMLTableElement',
    'HTMLTableRowElement',
    'HTMLTableCellElement',
    'HTMLInputElement',
    'HTMLFormElement',
    'HTMLLabelElement',
    'HTMLTextAreaElement',
    'HTMLSelectElement',
    'HTMLOptionElement',
  ];

  for (const key of elements) {
    if ((window as any)[key]) {
      (globalThis as any)[key] = (window as any)[key];
    }
  }

  // Manually mock missing elements in linkedom
  if (!(globalThis as any).HTMLTableSectionElement) {
    (globalThis as any).HTMLTableSectionElement = class HTMLTableSectionElement extends HTMLElement {};
  }

  // Mock window.location
  if (!(window as any).location) {
    (window as any).location = {
      hash: '',
      href: 'http://localhost/',
      pathname: '/',
      search: '',
      origin: 'http://localhost',
      reload: () => {},
      replace: () => {},
      assign: () => {},
    };
  }

  // Ensure globalThis.location is also set
  if (!(globalThis as any).location) {
    Object.defineProperty(globalThis, 'location', {
      get: () => (window as any).location,
      set: (v) => {
        (window as any).location = v;
      },
    });
  }

  // Mock window.scrollTo
  (window as any).scrollTo = () => {};
  (globalThis as any).scrollTo = (window as any).scrollTo;

  // Patch global fetch to handle relative URLs in tests
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      // console.warn('Fetch called with relative URL in test (returning 404):', url);
      return new Response('Not Found', { status: 404 });
    }
    return originalFetch(input, init);
  };
}
