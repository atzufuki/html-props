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
  });
}
