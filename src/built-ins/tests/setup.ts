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
    HTMLPreElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
  } = parseHTML('<!DOCTYPE html><html><body></body></html>');

  const HTMLTableSectionElementPolyfill = HTMLTableSectionElement ||
    class HTMLTableSectionElement extends HTMLElement {};

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
    HTMLPreElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
  });
}
