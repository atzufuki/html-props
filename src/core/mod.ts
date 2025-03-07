import { type Constructor, dedupeMixin } from '@open-wc/dedupe-mixin';
import type { IncomingProps, RenderObject } from './types.ts';

export type HTMLProps<T = unknown> = IncomingProps<HTMLElement, T>;

export const HTMLPropsMixin = dedupeMixin(
  <T extends Constructor<HTMLElement>>(SuperClass: T) => {
    class HTMLPropsMixin extends SuperClass {
      static get observedAttributes(): string[] {
        return [];
      }

      static define(name: string) {
        const defined = customElements.get(name) ??
          customElements.getName(this);

        if (!defined) {
          customElements.define(name, this);
        }
      }

      static getName() {
        return customElements.getName(this);
      }

      static getSelector() {
        return this.getName();
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
        const {
          // deno-lint-ignore no-unused-vars
          children,
          // deno-lint-ignore no-unused-vars
          child,
          // deno-lint-ignore no-unused-vars
          textContent,
          // deno-lint-ignore no-unused-vars
          innerHTML,
          // deno-lint-ignore no-unused-vars
          innerText,
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
        // deno-lint-ignore no-unused-vars
        name: string,
        // deno-lint-ignore no-unused-vars
        oldValue: string,
        // deno-lint-ignore no-unused-vars
        newValue: string,
      ): void {}

      /**
       * Define default props for this component.
       * @returns {Partial<HTMLProps>} Partial props.
       */
      getDefaultProps(): Partial<HTMLProps<T>> {
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

        if (content instanceof Array) {
          this.replaceChildren(...content.map(convert));
        } else {
          if (typeof content === 'string' && isHTML(content)) {
            this.innerHTML = content;
          } else {
            this.replaceChildren(convert(content));
          }
        }
      }

      /**
       * Implement side effects according to current properties state.
       */
      update(): void {}
    }

    return HTMLPropsMixin as unknown as {
      new (props?: HTMLProps): HTMLPropsMixin;
    };
  },
);

export default HTMLPropsMixin;

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
