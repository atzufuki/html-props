import { assert, assertEquals } from 'jsr:@std/assert';
import { HTMLPropsMixin } from '../mixin.ts';
import { parseHTML } from 'linkedom';

if (!globalThis.document) {
  const {
    window,
    document,
    customElements,
    HTMLElement,
    HTMLDivElement,
    HTMLSpanElement,
    HTMLButtonElement,
    HTMLParagraphElement,
    HTMLAnchorElement,
    HTMLImageElement,
    HTMLInputElement,
    HTMLLabelElement,
    HTMLHeadingElement,
    HTMLUListElement,
    HTMLOListElement,
    HTMLLIElement,
    HTMLTableElement,
    HTMLTableSectionElement,
    HTMLTableRowElement,
    HTMLTableCellElement,
    HTMLFormElement,
    HTMLSelectElement,
    HTMLOptionElement,
    HTMLPreElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
  } = parseHTML('<!DOCTYPE html><html><body></body></html>');

  const HTMLTableSectionElementPolyfill = HTMLTableSectionElement ||
    class HTMLTableSectionElement extends HTMLElement {};

  // Polyfill missing elements
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

  const polyfills: Record<string, any> = {};
  missingElements.forEach((name) => {
    if (!(window as any)[name]) {
      polyfills[name] = class extends HTMLElement {};
    } else {
      polyfills[name] = (window as any)[name];
    }
  });

  Object.assign(globalThis, {
    window,
    document,
    customElements,
    HTMLElement,
    HTMLDivElement,
    HTMLSpanElement,
    HTMLButtonElement,
    HTMLParagraphElement,
    HTMLAnchorElement,
    HTMLImageElement,
    HTMLInputElement,
    HTMLLabelElement,
    HTMLHeadingElement,
    HTMLUListElement,
    HTMLOListElement,
    HTMLLIElement,
    HTMLTableElement,
    HTMLTableSectionElement: HTMLTableSectionElementPolyfill,
    HTMLTableRowElement,
    HTMLTableCellElement,
    HTMLFormElement,
    HTMLSelectElement,
    HTMLOptionElement,
    HTMLPreElement,
    Node,
    CustomEvent,
    MutationObserver,
    ...polyfills,
    // Extra mocks for WiredElements
    Document: window.Document,
    SVGSVGElement: HTMLElement,
    CSSStyleSheet: class CSSStyleSheet {
      replaceSync() {}
    },
    requestAnimationFrame: (cb: any) => setTimeout(cb, 0),
    cancelAnimationFrame: (id: any) => clearTimeout(id),
  });

  // Mock Canvas getContext for WiredElements/RoughJS
  if ((globalThis as any).HTMLCanvasElement) {
    (globalThis as any).HTMLCanvasElement.prototype.getContext = ((contextId: string) => {
      return {
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        clearRect: () => {},
        fillRect: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        arc: () => {},
        bezierCurveTo: () => {},
      };
    }) as any;
  }
}

Deno.test('HTMLPropsMixin: wraps WiredButton without props config', async () => {
  // Dynamic import to ensure DOM is ready before Lit loads
  const { WiredButton } = await import('https://esm.sh/wired-elements@3.0.0-rc.6?target=es2022');

  // Wrap without config - should use simple wrapper mode
  const Wrapped = HTMLPropsMixin(WiredButton);

  const tagName = 'wrapped-wired-button-1';
  if (!customElements.get(tagName)) {
    Wrapped.define(tagName);
  }

  const el = new Wrapped();
  document.body.appendChild(el);

  // Check if it didn't crash
  assert(el instanceof WiredButton);
  assert(el instanceof Wrapped);

  // Check that we can set properties (WiredButton's native API)
  el.elevation = 5;
  assertEquals(el.elevation, 5);

  // Check constructor props API
  const el2 = new Wrapped({
    elevation: 3,
    disabled: false,
    onclick: () => {},
  });
  document.body.appendChild(el2);
  assertEquals(el2.elevation, 3);
});

Deno.test('HTMLPropsMixin: wraps WiredButton with props API', async () => {
  // Dynamic import to ensure DOM is ready before Lit loads
  const { WiredButton } = await import('https://esm.sh/wired-elements@3.0.0-rc.6?target=es2022');

  // Wrap WITHOUT custom props - just expose native props via constructor API
  const Wrapped = HTMLPropsMixin(WiredButton);

  const tagName = 'wrapped-wired-button-2';
  if (!customElements.get(tagName)) {
    Wrapped.define(tagName);
  }

  // Use props API to set native properties
  const el = new Wrapped({
    elevation: 2,
    disabled: false,
  });
  document.body.appendChild(el);

  // Verify props were set via constructor
  assertEquals(el.elevation, 2);
  assertEquals(el.disabled, false);

  // Update via property setter
  el.elevation = 4;
  assertEquals(el.elevation, 4);
});
