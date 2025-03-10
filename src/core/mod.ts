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

/**
 * A mixin that adds HTML props handling to a custom element.
 *
 * @template P - The type of the props.
 * @template T - The type of the custom element.
 * @param {T} superClass - The base class to extend.
 * @returns {Constructor<HTMLPropsMixinClass>} The extended class with HTML props handling.
 */
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

      const merge = (...objects: any[]) => {
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
      };

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
     * Returns the default properties for the component.
     * This method can be overridden by subclasses to provide default values for properties.
     *
     * @returns {this['props']} An object containing the default properties.
     */
    getDefaultProps(): this['props'] {
      return {};
    }
  }

  return HTMLPropsMixinClass as Constructor<HTMLPropsMixinClass>;
};

/**
 * A mixin that adds rendering capabilities to a custom element.
 *
 * @template T - The type of the custom element.
 * @param {T} superClass - The base class to extend.
 * @returns {Constructor<HTMLRenderMixinClass>} The extended class with rendering capabilities.
 */
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
     * Renders the content of the component.
     *
     * This method should be overridden by subclasses to provide the specific rendering logic.
     * The return value can be a Node, a string, an array of Nodes, or null/undefined.
     *
     * @returns {RenderObject} The rendered content of the component.
     */
    render(): RenderObject {
      return null;
    }

    /**
     * Builds the component by rendering its content based on the output of the `render` method.
     *
     * The `build` method processes the result of the `render` method, which can be a Node, a string,
     * an array of Nodes, or null/undefined. It then updates the component's children accordingly.
     *
     * @throws {Error} If the render result is of an invalid type.
     */
    build(): void {
      const isHTML = (string: string) => {
        const doc = new DOMParser().parseFromString(string, 'text/html');
        return Array.from(doc.body.childNodes).some(
          (node) => node.nodeType === 1,
        );
      };

      const convert = (render: Node | string | null | false | undefined) => {
        const isNode = render instanceof Node;
        const isString = typeof render === 'string';
        const isNull = render === null;
        const isFalse = render === false;
        const isUndefined = render === undefined;
        const isSomethingElse = !isNode && !isString && !isNull && !isFalse &&
          !isUndefined;

        if (isSomethingElse) {
          throw new Error(
            'Invalid render type provided. Must follow RenderObject.',
          );
        }

        return render || '';
      };

      const render = this.render();

      switch (true) {
        case render instanceof Array:
          this.replaceChildren(...render.map(convert));
          break;
        case render instanceof Node:
          this.replaceChildren(convert(render));
          break;
        case typeof render === 'string':
          if (isHTML(render)) {
            this.innerHTML = render;
          } else {
            this.replaceChildren(convert(render));
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

/**
 * A mixin that adds helper methods and lifecycle callbacks to a custom element.
 *
 * @template T - The type of the custom element.
 * @param {T} superClass - The base class to extend.
 * @returns {Constructor<HTMLHelperMixinClass>} The extended class with helper methods and lifecycle callbacks.
 */
export const HTMLHelperMixin = <T extends Constructor<HTMLElement>>(
  superClass: T,
) => {
  class HTMLHelperMixinClass extends superClass {
    /**
     * Returns an array of attribute names to be observed for changes.
     * This method is used by the browser to determine which attributes
     * should trigger the `attributeChangedCallback` when they are modified.
     *
     * @returns An array of attribute names to observe.
     */
    static get observedAttributes(): string[] {
      return [];
    }

    /**
     * Defines a custom element with the specified name and options.
     *
     * @param name - The name of the custom element to define.
     * @param options - Optional configuration options for the custom element.
     * @returns The class itself, allowing for method chaining.
     */
    static define(
      name: string,
      options?: ElementDefinitionOptions,
    ): typeof this {
      customElements.define(name, this, options);
      return this;
    }

    /**
     * Retrieves the name of the custom element.
     *
     * @returns The name of the custom element as a string, or null if the element is not defined.
     */
    static getName(): string | null {
      return customElements.getName(this);
    }

    /**
     * Generates a selector string for the custom element.
     *
     * @param selectors - Additional selectors to append to the element's selector.
     * @returns The complete selector string for the custom element.
     */
    static getSelectors(selectors: string = ''): string {
      const name = this.getName();
      const localName = new this().localName;

      if (name !== localName) {
        return `${localName}[is="${name}"]${selectors}`;
      }

      return `${name}${selectors}`;
    }

    /**
     * Called when the element is inserted into a document.
     * This can be useful for initializing the element's state or setting up event listeners.
     */
    connectedCallback(): void {
      if (super.connectedCallback) {
        super.connectedCallback();
      }
    }

    /**
     * Called when the element is removed from a document.
     * This can be useful for cleaning up any resources or event listeners that were set up in connectedCallback.
     */
    disconnectedCallback(): void {
      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }
    }

    /**
     * Called when the element is moved to a new document.
     * This can be useful for reinitializing the element's state or setting up event listeners in the new document.
     */
    adoptedCallback(): void {
      if (super.adoptedCallback) {
        super.adoptedCallback();
      }
    }

    /**
     * Called when one of the element's attributes is added, removed, or changed.
     * @param name - The name of the attribute that was changed.
     * @param oldValue - The previous value of the attribute.
     * @param newValue - The new value of the attribute.
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

/**
 * Combines HTMLPropsMixin, HTMLRenderMixin and HTMLHelperMixin to create a custom element with HTML props, rendering, and helper methods.
 *
 * @template P - The type of the props.
 * @param {Constructor<HTMLElement>} elementClass - The base class to extend.
 * @returns {Constructor<HTMLElement>} The extended class with combined mixins.
 */
const HTMLProps = <P>(elementClass: Constructor<HTMLElement>) =>
  HTMLHelperMixin(
    HTMLRenderMixin(
      HTMLPropsMixin<P>(elementClass),
    ),
  );

export default HTMLProps;
