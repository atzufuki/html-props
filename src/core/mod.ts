// deno-lint-ignore-file
import { type Constructor, dedupeMixin } from '@open-wc/dedupe-mixin';
import type { HTMLProps, RenderObject } from './types.ts';

export const HTMLPropsMixin = dedupeMixin(
  <T>(superclass: Constructor<HTMLElement>) => {
    interface HTMLPropsInterface extends HTMLElement {
      props: HTMLProps<T>;
      connectedCallback(): void;
      disconnectedCallback(): void;
      adoptedCallback(): void;
      attributeChangedCallback(
        name: string,
        oldValue: string,
        newValue: string,
      ): void;
      getDefaultProps(props: this['props']): this['props'];
      render(): RenderObject;
      build(): void;
      update(): void;
    }

    interface HTMLPropsInterfaceConstructor
      extends Constructor<HTMLPropsInterface> {
      new (props?: HTMLPropsInterface['props']): HTMLPropsInterface;
      observedAttributes: string[];
      define(name: string, options?: ElementDefinitionOptions): this;
      getName(): string | null;
      getSelectors(selector: string): string;
    }

    class HTMLPropsMixin extends superclass implements HTMLPropsInterface {
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

      props: HTMLProps<T>;

      // deno-lint-ignore no-explicit-any
      constructor(...rest: any[]) {
        super();
        this.props = rest[0] ?? {};
      }

      /**
       * Called each time the element is added to the document.
       */
      connectedCallback(): void {
        // If the element is a built-in element, the is-attribute can be added automatically.
        if (!customElements.get(this.localName)) {
          const constructor = this.constructor as typeof HTMLPropsMixin;
          const name = constructor.getName();
          if (name) {
            this.setAttribute('is', name);
          }
        }

        const {
          children,
          child,
          textContent,
          innerHTML,
          innerText,
          style,
          dataset,
          ...rest
        } = merge(this.getDefaultProps(this.props), this.props);

        if (style) {
          Object.assign(this.style, style);
        }

        if (dataset) {
          Object.assign(this.dataset, dataset);
        }

        Object.assign(this, rest);

        this.build();

        this.update();
      }

      /**
       * Called each time the element is removed from the document.
       */
      disconnectedCallback(): void {}

      /**
       * Called each time the element is moved to a new document.
       */
      adoptedCallback(): void {}

      /**
       * Called each time any attributes that are listed in the observedAttributes static property are changed, added, removed, or replaced.
       */
      attributeChangedCallback(
        name: string,
        oldValue: string,
        newValue: string,
      ): void {}

      /**
       * Define default props for this component.
       * @returns {this['props']}
       */
      getDefaultProps(props: this['props']): this['props'] {
        return {};
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
        const { children, child, textContent, innerHTML, innerText } =
          this.props;

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

        const content = this.render() ??
          children ??
          child ??
          textContent ??
          innerHTML ??
          innerText;

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

      /**
       * Implement side effects according to current properties state.
       */
      update(): void {}
    }

    return HTMLPropsMixin as HTMLPropsInterfaceConstructor;
  },
);

// deno-lint-ignore no-explicit-any
function merge(...objects: any[]) {
  // deno-lint-ignore no-explicit-any
  const isTruthy = (item: any) => !!item;
  // deno-lint-ignore no-explicit-any
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
