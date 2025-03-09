// deno-lint-ignore-file no-explicit-any

import type { HTMLProps, RenderObject } from './types.ts';

type Constructor<T> = new (...args: any[]) => T;

declare global {
  interface HTMLElement {
    connectedCallback?(): void;
    disconnectedCallback?(): void;
    adoptedCallback?(): void;
    attributeChangedCallback?(
      name: string,
      oldValue: string,
      newValue: string,
    ): void;
  }
}

export const HTMLPropsMixin = <
  P,
  T extends Constructor<HTMLElement> = Constructor<HTMLElement>,
>(
  superClass: T,
) => {
  type Constructor<T> = new (props?: HTMLProps<P>) => T;

  class HTMLPropsMixinClass extends superClass {
    props: HTMLProps<P>;

    constructor(...rest: any[]) {
      super();
      this.props = rest[0] ?? {};
    }

    connectedCallback(): void {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      const {
        style,
        dataset,
        ...rest
      } = merge(this.getDefaultProps(), this.props);

      if (style) {
        Object.assign(this.style, style);
      }

      if (dataset) {
        Object.assign(this.dataset, dataset);
      }

      Object.assign(this, rest);
    }

    /**
     * Define default props for this component.
     * @returns {this['props']}
     */
    getDefaultProps(): this['props'] {
      return {};
    }
  }

  return HTMLPropsMixinClass as Constructor<HTMLPropsMixinClass>;
};

export const HTMLRenderMixin = <T extends Constructor<HTMLElement>>(
  superClass: T,
) => {
  class HTMLRenderMixinClass extends superClass {
    connectedCallback(): void {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      this.build();
    }

    /**
     * Implement a child tree for this component.
     * @returns {RenderObject} The rendered object.
     */
    render(): RenderObject {
      return null;
    }

    /**
     * Builds a child tree for this element.
     */
    build(): void {
      const isHTML = (string: string) => {
        const doc = new DOMParser().parseFromString(string, 'text/html');
        return Array.from(doc.body.childNodes).some(
          (node) => node.nodeType === 1,
        );
      };

      const convert = (content: Node | string | null | undefined) => {
        const isNode = content instanceof Node;
        const isString = typeof content === 'string';
        const isNull = content === null;
        const isUndefined = content === undefined;
        const isSomethingElse = !isNode && !isString && !isNull &&
          !isUndefined;

        if (isSomethingElse) {
          throw new Error(
            'Invalid render type provided. Must follow RenderObject.',
          );
        }

        return content ?? '';
      };

      const content = this.render();

      switch (true) {
        case content instanceof Array:
          this.replaceChildren(...content.map(convert));
          break;
        case content instanceof Node:
          this.replaceChildren(convert(content));
          break;
        case typeof content === 'string':
          if (isHTML(content)) {
            this.innerHTML = content;
          } else {
            this.replaceChildren(content);
          }
          break;
        default:
          this.replaceChildren();
          break;
      }
    }
  }

  return HTMLRenderMixinClass;
};

export const HTMLHelperMixin = <T extends Constructor<HTMLElement>>(
  superClass: T,
) => {
  class HTMLHelperMixinClass extends superClass {
    static get observedAttributes(): string[] {
      return [];
    }

    static define(
      name: string,
      options?: ElementDefinitionOptions,
    ): typeof this {
      customElements.define(name, this, options);
      return this;
    }

    static getName(): string | null {
      return customElements.getName(this);
    }

    static getSelectors(selectors: string = ''): string {
      const name = this.getName();
      const localName = new this().localName;

      if (name !== localName) {
        return `${localName}[is="${name}"]${selectors}`;
      }

      return `${name}${selectors}`;
    }

    /**
     * Called each time the element is added to the document.
     */
    connectedCallback(): void {
      if (super.connectedCallback) {
        super.connectedCallback();
      }
    }

    /**
     * Called each time the element is removed from the document.
     */
    disconnectedCallback(): void {
      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }
    }

    /**
     * Called each time the element is moved to a new document.
     */
    adoptedCallback(): void {
      if (super.adoptedCallback) {
        super.adoptedCallback();
      }
    }

    /**
     * Called each time any attributes that are listed in the observedAttributes static property are changed, added, removed, or replaced.
     */
    attributeChangedCallback(
      name: string,
      oldValue: string,
      newValue: string,
    ): void {
      if (super.attributeChangedCallback) {
        super.attributeChangedCallback(name, oldValue, newValue);
      }
    }
  }

  return HTMLHelperMixinClass;
};

function merge(...objects: any[]) {
  const isTruthy = (item: any) => !!item;
  const prepped = (objects as any[]).filter(isTruthy);

  if (prepped.length === 0) {
    return;
  }

  return prepped.reduce((result, current) => {
    Object.entries(current).forEach(([key, value]) => {
      if (typeof value === 'object') {
        result[key] = merge(result[key], current[key]);
      } else {
        result[key] = current[key];
      }
    });
    return result;
  });
}

const HTMLProps = <P>(elementClass: Constructor<HTMLElement>) =>
  HTMLHelperMixin(
    HTMLRenderMixin(
      HTMLPropsMixin<P>(elementClass),
    ),
  );

export default HTMLProps;
