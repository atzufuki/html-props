if (!globalThis.document) {
  class MockElement {
    tagName: string;
    style = {};
    attributes: Record<string, string> = {};
    children: any[] = [];
    events: Record<string, Function> = {};

    constructor(tagName: string) {
      this.tagName = tagName ? tagName.toUpperCase() : 'DIV'; // Default to DIV if undefined?
      // Actually HTMLDivElement constructor doesn't take args usually, but our mock might need to be flexible
    }

    setAttribute(k: string, v: string) {
      this.attributes[k] = v;
    }
    removeAttribute(k: string) {
      delete this.attributes[k];
    }
    getAttribute(k: string) {
      return this.attributes[k] || null;
    }
    hasAttribute(k: string) {
      return k in this.attributes;
    }
    addEventListener(type: string, fn: Function) {
      this.events[type] = fn;
    }
    replaceChildren(...nodes: any[]) {
      this.children = nodes;
    }
    dispatchEvent(event: any) {
      return true;
    }
    connectedCallback() {}
    disconnectedCallback() {}
    attributeChangedCallback() {}
  }

  (globalThis as any).document = {
    createElement: (tag: string) => new MockElement(tag),
    createTextNode: (text: string) => text,
    body: new MockElement('BODY'),
  };
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).HTMLDivElement = class extends MockElement {
    constructor() {
      super('DIV');
    }
  };
  (globalThis as any).HTMLSpanElement = class extends MockElement {
    constructor() {
      super('SPAN');
    }
  };
  (globalThis as any).HTMLButtonElement = class extends MockElement {
    constructor() {
      super('BUTTON');
    }
  };
  (globalThis as any).HTMLParagraphElement = class extends MockElement {
    constructor() {
      super('P');
    }
  };
  (globalThis as any).HTMLAnchorElement = class extends MockElement {
    constructor() {
      super('A');
    }
  };
  (globalThis as any).HTMLImageElement = class extends MockElement {
    constructor() {
      super('IMG');
    }
  };
  (globalThis as any).HTMLInputElement = class extends MockElement {
    constructor() {
      super('INPUT');
    }
  };
  (globalThis as any).HTMLLabelElement = class extends MockElement {
    constructor() {
      super('LABEL');
    }
  };
  (globalThis as any).HTMLHeadingElement = class extends MockElement {
    constructor() {
      super('H1');
    }
  }; // Simplified
  (globalThis as any).HTMLUListElement = class extends MockElement {
    constructor() {
      super('UL');
    }
  };
  (globalThis as any).HTMLOListElement = class extends MockElement {
    constructor() {
      super('OL');
    }
  };
  (globalThis as any).HTMLLIElement = class extends MockElement {
    constructor() {
      super('LI');
    }
  };
  (globalThis as any).HTMLTableElement = class extends MockElement {
    constructor() {
      super('TABLE');
    }
  };
  (globalThis as any).HTMLTableSectionElement = class extends MockElement {
    constructor() {
      super('TBODY');
    }
  };
  (globalThis as any).HTMLTableRowElement = class extends MockElement {
    constructor() {
      super('TR');
    }
  };
  (globalThis as any).HTMLTableCellElement = class extends MockElement {
    constructor() {
      super('TD');
    }
  };
  (globalThis as any).HTMLFormElement = class extends MockElement {
    constructor() {
      super('FORM');
    }
  };

  (globalThis as any).Node = class {};
  (globalThis as any).CustomEvent = class {
    constructor(public type: string, public detail: any) {}
  };
  (globalThis as any).customElements = {
    define: () => {},
    get: () => {},
  };
}
