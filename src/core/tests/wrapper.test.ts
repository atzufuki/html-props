import { assert, assertEquals } from "jsr:@std/assert";
import { HTMLPropsMixin } from "../mixin.ts";
import { Window } from "happy-dom";

if (!globalThis.document) {
  const happyWindow = new Window();

  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  // Polyfill missing elements that happy-dom might not have
  const missingElements = [
    "HTMLHRElement",
    "HTMLQuoteElement",
    "HTMLDListElement",
    "HTMLDataElement",
    "HTMLTimeElement",
    "HTMLBRElement",
    "HTMLAudioElement",
    "HTMLVideoElement",
    "HTMLSourceElement",
    "HTMLTrackElement",
    "HTMLMapElement",
    "HTMLAreaElement",
    "HTMLIFrameElement",
    "HTMLEmbedElement",
    "HTMLObjectElement",
    "HTMLParamElement",
    "HTMLPictureElement",
    "HTMLCanvasElement",
    "HTMLScriptElement",
    "HTMLModElement",
    "HTMLTableCaptionElement",
    "HTMLTableColElement",
    "HTMLDataListElement",
    "HTMLFieldSetElement",
    "HTMLLegendElement",
    "HTMLMeterElement",
    "HTMLOptGroupElement",
    "HTMLOutputElement",
    "HTMLProgressElement",
    "HTMLTextAreaElement",
    "HTMLDetailsElement",
    "HTMLDialogElement",
    "HTMLMenuElement",
    "HTMLSlotElement",
    "HTMLTemplateElement",
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
    // Extra mocks for WiredElements
    Document: w.Document,
    SVGSVGElement: w.SVGSVGElement || w.HTMLElement,
    CSSStyleSheet: w.CSSStyleSheet || class CSSStyleSheet {
      replaceSync() {}
    },
    requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
  });

  // Mock Canvas getContext for WiredElements/RoughJS
  if ((globalThis as any).HTMLCanvasElement) {
    (globalThis as any).HTMLCanvasElement.prototype.getContext =
      ((contextId: string) => {
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

Deno.test({
  name: "HTMLPropsMixin: wraps WiredButton without props config",

  fn: async () => {
    // Dynamic import to ensure DOM polyfills are ready before Lit loads
    const { WiredButton } = await import("wired-button");

    // Wrap without config - should use simple wrapper mode
    const Wrapped = HTMLPropsMixin(WiredButton);

    const tagName = "wrapped-wired-button-1";
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
  },
});

Deno.test({
  name: "HTMLPropsMixin: wraps WiredButton with props API",

  fn: async () => {
    // Dynamic import to ensure DOM polyfills are ready before Lit loads
    const { WiredButton } = await import("wired-button");

    // Import prop config for custom props
    const { prop } = await import("../prop.ts");

    // Wrap WITH custom props - add custom reactive props alongside native ones
    const Wrapped = HTMLPropsMixin(WiredButton, {
      label: prop("Click me"),
      count: prop(0),
    });

    const tagName = "wrapped-wired-button-2";
    if (!customElements.get(tagName)) {
      Wrapped.define(tagName);
    }

    // Use props API to set both native and custom properties
    const el = new Wrapped({
      elevation: 2,
      disabled: false,
      label: "Submit Form",
      count: 5,
    });
    document.body.appendChild(el);

    // Verify native props were set via constructor
    assertEquals(el.elevation, 2);
    assertEquals(el.disabled, false);

    // Verify custom props were set
    assertEquals(el.label, "Submit Form");
    assertEquals(el.count, 5);

    // Update custom prop via property setter
    el.count = 10;
    assertEquals(el.count, 10);

    // Update native prop
    el.elevation = 4;
    assertEquals(el.elevation, 4);
  },
});

Deno.test({
  name: "HTMLPropsMixin: handles elements with null/undefined style property",

  fn: () => {
    // Simulate a Lit element where style might be null/undefined before first render
    class ElementWithNullStyle extends HTMLElement {
      _style: CSSStyleDeclaration | null = null;

      get style(): CSSStyleDeclaration {
        // Return null to simulate Lit element before updateComplete
        return this._style as unknown as CSSStyleDeclaration;
      }

      set style(value: string | CSSStyleDeclaration) {
        // Ignore for this test
      }
    }

    customElements.define("element-with-null-style", ElementWithNullStyle);

    // This should not throw even when style is null
    const Wrapped = HTMLPropsMixin(ElementWithNullStyle);
    Wrapped.define("wrapped-null-style");

    // Should not throw when passing style prop
    const el = new Wrapped({
      style: { backgroundColor: "red", padding: "10px" },
    });

    document.body.appendChild(el);

    // Should survive without crashing
    assert(el instanceof ElementWithNullStyle);

    document.body.removeChild(el);
  },
});

Deno.test({
  name: "HTMLPropsMixin: handles elements with undefined dataset property",

  fn: () => {
    // Simulate element where dataset might be undefined
    class ElementWithNoDataset extends HTMLElement {
      // Override dataset to return undefined
      get dataset(): DOMStringMap {
        return undefined as unknown as DOMStringMap;
      }
    }

    customElements.define("element-with-no-dataset", ElementWithNoDataset);

    const Wrapped = HTMLPropsMixin(ElementWithNoDataset);
    Wrapped.define("wrapped-no-dataset");

    // Should not throw when passing dataset prop
    const el = new Wrapped({
      dataset: { key: "value" },
    });

    document.body.appendChild(el);

    assert(el instanceof ElementWithNoDataset);

    document.body.removeChild(el);
  },
});
