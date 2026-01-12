import { Window } from 'happy-dom';

if (!globalThis.document) {
  const happyWindow = new Window();

  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  // Polyfill missing elements that happy-dom might not have
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

  const polyfills: Record<string, unknown> = {};
  missingElements.forEach((name) => {
    if (!w[name]) {
      polyfills[name] = class extends w.HTMLElement {};
    } else {
      polyfills[name] = w[name];
    }
  });

  Object.assign(globalThis, {
    window: happyWindow,
    document: w.document,
    customElements: w.customElements,
    HTMLElement: w.HTMLElement,
    HTMLDivElement: w.HTMLDivElement || w.HTMLElement,
    HTMLSpanElement: w.HTMLSpanElement || w.HTMLElement,
    HTMLButtonElement: w.HTMLButtonElement || w.HTMLElement,
    HTMLParagraphElement: w.HTMLParagraphElement || w.HTMLElement,
    HTMLAnchorElement: w.HTMLAnchorElement || w.HTMLElement,
    HTMLImageElement: w.HTMLImageElement || w.HTMLElement,
    HTMLInputElement: w.HTMLInputElement || w.HTMLElement,
    HTMLLabelElement: w.HTMLLabelElement || w.HTMLElement,
    HTMLHeadingElement: w.HTMLHeadingElement || w.HTMLElement,
    HTMLUListElement: w.HTMLUListElement || w.HTMLElement,
    HTMLOListElement: w.HTMLOListElement || w.HTMLElement,
    HTMLLIElement: w.HTMLLIElement || w.HTMLElement,
    HTMLTableElement: w.HTMLTableElement || w.HTMLElement,
    HTMLTableSectionElement: w.HTMLTableSectionElement || w.HTMLElement,
    HTMLTableRowElement: w.HTMLTableRowElement || w.HTMLElement,
    HTMLTableCellElement: w.HTMLTableCellElement || w.HTMLElement,
    HTMLFormElement: w.HTMLFormElement || w.HTMLElement,
    HTMLSelectElement: w.HTMLSelectElement || w.HTMLElement,
    HTMLOptionElement: w.HTMLOptionElement || w.HTMLElement,
    HTMLPreElement: w.HTMLPreElement || w.HTMLElement,
    Node: w.Node,
    CustomEvent: w.CustomEvent,
    MutationObserver: w.MutationObserver,
    ...polyfills,
  });
}
