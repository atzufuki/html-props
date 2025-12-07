import { parseHTML } from 'linkedom';

let originalGlobals: Record<string, any> = {};
let cachedDom: any = null;

const keysToPolyfill = [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'Node',
  'MutationObserver',
  'Text',
  'Event',
  'CustomEvent',
  'HTMLTableSectionElement',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'fetch',
  'location',
  'scrollTo',
  'matchMedia',
  'history',
  // HTML Elements
  'HTMLDivElement',
  'HTMLSpanElement',
  'HTMLButtonElement',
  'HTMLParagraphElement',
  'HTMLAnchorElement',
  'HTMLImageElement',
  'HTMLInputElement',
  'HTMLLabelElement',
  'HTMLHeadingElement',
  'HTMLUListElement',
  'HTMLOListElement',
  'HTMLLIElement',
  'HTMLTableElement',
  'HTMLTableRowElement',
  'HTMLTableCellElement',
  'HTMLFormElement',
  'HTMLSelectElement',
  'HTMLOptionElement',
  'HTMLPreElement',
  'HTMLHRElement',
  'HTMLQuoteElement',
  'HTMLDListElement',
  'HTMLDataElement',
  'HTMLTimeElement',
  'HTMLBRElement',
  'HTMLAudioElement',
  'HTMLVideoElement',
  'HTMLSourceElement',
  'HTMLTrackElement',
  'HTMLMapElement',
  'HTMLAreaElement',
  'HTMLIFrameElement',
  'HTMLEmbedElement',
  'HTMLObjectElement',
  'HTMLParamElement',
  'HTMLPictureElement',
  'HTMLCanvasElement',
  'HTMLScriptElement',
  'HTMLModElement',
  'HTMLTableCaptionElement',
  'HTMLTableColElement',
  'HTMLDataListElement',
  'HTMLFieldSetElement',
  'HTMLLegendElement',
  'HTMLMeterElement',
  'HTMLOptGroupElement',
  'HTMLOutputElement',
  'HTMLProgressElement',
  'HTMLTextAreaElement',
  'HTMLDetailsElement',
  'HTMLDialogElement',
  'HTMLMenuElement',
  'HTMLSlotElement',
  'HTMLTemplateElement',
];

function getDom() {
  if (cachedDom) return cachedDom;

  const dom = parseHTML('<!DOCTYPE html><html><body></body></html>');
  const { window } = dom;

  // Manually mock missing elements in linkedom
  if (!(window as any).HTMLTableSectionElement) {
    (window as any).HTMLTableSectionElement = class HTMLTableSectionElement extends (dom.HTMLElement as any) {};
  }

  // Mock other missing elements
  const missingElements = [
    'HTMLHRElement',
    'HTMLQuoteElement',
    'HTMLDListElement',
    'HTMLDataElement',
    'HTMLTimeElement',
    'HTMLBRElement',
    'HTMLAudioElement',
    'HTMLVideoElement',
    'HTMLSourceElement',
    'HTMLTrackElement',
    'HTMLMapElement',
    'HTMLAreaElement',
    'HTMLIFrameElement',
    'HTMLEmbedElement',
    'HTMLObjectElement',
    'HTMLParamElement',
    'HTMLPictureElement',
    'HTMLCanvasElement',
    'HTMLScriptElement',
    'HTMLModElement',
    'HTMLTableCaptionElement',
    'HTMLTableColElement',
    'HTMLDataListElement',
    'HTMLFieldSetElement',
    'HTMLLegendElement',
    'HTMLMeterElement',
    'HTMLOptGroupElement',
    'HTMLOutputElement',
    'HTMLProgressElement',
    'HTMLTextAreaElement',
    'HTMLDetailsElement',
    'HTMLDialogElement',
    'HTMLMenuElement',
    'HTMLSlotElement',
    'HTMLTemplateElement',
  ];

  missingElements.forEach((name) => {
    if (!(window as any)[name]) {
      (window as any)[name] = class extends (dom.HTMLElement as any) {};
    }
  });

  // Mock window.location
  if (!(window as any).location) {
    (window as any).location = {
      hash: '',
      href: 'http://localhost/',
      pathname: '/',
      search: '',
      origin: 'http://localhost',
      hostname: 'localhost',
      reload: () => {},
      replace: () => {},
      assign: () => {},
    };
  }

  // Mock window.scrollTo
  (window as any).scrollTo = () => {};

  // Mock window.matchMedia
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });

  cachedDom = dom;
  return dom;
}

export function setup() {
  // Save originals
  if (Object.keys(originalGlobals).length === 0) {
    for (const key of keysToPolyfill) {
      if (key in globalThis) {
        originalGlobals[key] = (globalThis as any)[key];
      }
    }
  }

  const dom = getDom();
  const {
    window,
    document,
    customElements,
    HTMLElement,
    Node,
    MutationObserver,
    Text,
    Event,
    CustomEvent,
  } = dom;

  // Assign basic globals
  Object.assign(globalThis, {
    window,
    document,
    customElements,
    HTMLElement,
    Node,
    MutationObserver,
    Text,
    Event,
    CustomEvent,
  });

  // Assign globals from window based on keysToPolyfill
  for (const key of keysToPolyfill) {
    if ((dom as any)[key]) {
      (globalThis as any)[key] = (dom as any)[key];
    } else if ((window as any)[key]) {
      (globalThis as any)[key] = (window as any)[key];
    }
  }

  // Ensure globalThis.location is also set
  if (!(globalThis as any).location) {
    Object.defineProperty(globalThis, 'location', {
      get: () => (window as any).location,
      set: (v) => {
        (window as any).location = v;
      },
      configurable: true,
    });
  }

  (globalThis as any).scrollTo = (window as any).scrollTo;

  // Mock requestAnimationFrame
  (globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 0);
  };

  // Mock cancelAnimationFrame
  (globalThis as any).cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };

  // Patch global fetch
  const originalFetch = originalGlobals.fetch || globalThis.fetch;
  (globalThis as any).fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return new Response('Not Found', { status: 404 });
    }
    if (originalFetch) {
      return originalFetch(input, init);
    }
    throw new Error('No fetch implementation found');
  };
}

export function teardown() {
  // Restore
  for (const key of keysToPolyfill) {
    if (key in originalGlobals) {
      (globalThis as any)[key] = originalGlobals[key];
    } else {
      delete (globalThis as any)[key];
    }
  }
}
