import { Window } from 'happy-dom';

let originalGlobals: Record<string, any> = {};
let cachedWindow: any = null;

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

function getWindow() {
  if (cachedWindow) return cachedWindow;

  const happyWindow = new Window();
  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  // Mock missing elements
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
    if (!w[name]) {
      w[name] = class extends w.HTMLElement {};
    }
  });

  // Mock window.scrollTo if not present
  if (!w.scrollTo) {
    w.scrollTo = () => {};
  }

  // Mock window.matchMedia if not present
  if (!w.matchMedia) {
    w.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  cachedWindow = happyWindow;
  return happyWindow;
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

  const happyWindow = getWindow();
  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  // Assign basic globals
  Object.assign(globalThis, {
    window: happyWindow,
    document: w.document,
    customElements: w.customElements,
    HTMLElement: w.HTMLElement,
    Node: w.Node,
    MutationObserver: w.MutationObserver,
    Text: w.Text,
    Event: w.Event,
    CustomEvent: w.CustomEvent,
  });

  // Assign globals from window based on keysToPolyfill
  for (const key of keysToPolyfill) {
    if (w[key]) {
      (globalThis as any)[key] = w[key];
    }
  }

  // Ensure globalThis.location is also set
  if (!(globalThis as any).location) {
    Object.defineProperty(globalThis, 'location', {
      get: () => w.location,
      set: (v) => {
        w.location = v;
      },
      configurable: true,
    });
  }

  (globalThis as any).scrollTo = w.scrollTo;

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
