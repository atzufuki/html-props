// deno-lint-ignore-file no-explicit-any

import type { Content, HTMLProps } from './types.ts';

import { createRef, type RefObject } from './ref.ts';

export { createRef, type RefObject };

type Constructor<T> = new (...args: any[]) => T;

function insertContent(element: HTMLElement, content: Content) {
  const isHTML = (string: string) => {
    const doc = new DOMParser().parseFromString(string, 'text/html');
    return Array.from(doc.body.childNodes).some(
      (node) => node.nodeType === 1,
    );
  };

  const createFragmentFromHTML = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const fragment = document.createDocumentFragment();
    Array.from(tempDiv.childNodes).forEach((node) => fragment.appendChild(node));
    return fragment;
  };

  const convertContent = (contentItem: Node | string | unknown): Node | string => {
    if (contentItem instanceof Node) {
      return contentItem;
    }

    if (typeof contentItem === 'string') {
      return contentItem;
    }

    if (Array.isArray(contentItem)) {
      const fragment = document.createDocumentFragment();
      contentItem.forEach((item) => {
        const child = convertContent(item);
        if (typeof child === 'string') {
          fragment.appendChild(createFragmentFromHTML(child));
        } else {
          fragment.appendChild(child);
        }
      });
      return fragment;
    }

    return '';
  };

  const child = convertContent(content);

  if (typeof child === 'string' && isHTML(child)) {
    element.innerHTML = child;
  } else if (child instanceof DocumentFragment || child instanceof Node) {
    element.replaceChildren(child);
  }
}

interface ExtendedHTMLElement extends HTMLElement {
  /**
   * Called when the element is inserted into a document.
   * This can be useful for initializing the element's state or setting up event listeners.
   */
  connectedCallback?(): void;
  /**
   * Called when the element is removed from a document.
   * This can be useful for cleaning up any resources or event listeners that were set up in connectedCallback.
   */
  disconnectedCallback?(): void;
  /**
   * Called when the element is moved to a new document.
   * This can be useful for reinitializing the element's state or setting up event listeners in the new document.
   */
  adoptedCallback?(): void;
  /**
   * Called when one of the element's attributes is added, removed, or changed.
   * @param name - The name of the attribute that was changed.
   * @param oldValue - The previous value of the attribute.
   * @param newValue - The new value of the attribute.
   */
  attributeChangedCallback?(
    name: string,
    oldValue: string,
    newValue: string,
  ): void;

  /**
   * Called when a property is added, removed, or changed.
   * @param name - The name of the property that was changed.
   * @param oldValue - The previous value of the property.
   * @param newValue - The new value of the property.
   */
  propertyChangedCallback?(name: string, oldValue: any, newValue: any): void;
}

interface HTMLPropsMixinClass<P = {}> extends ExtendedHTMLElement {
  props: HTMLProps<P>;
  ref?: RefObject<this>;
  content?: Content;
  getDefaultProps(): this['props'];
}

interface HTMLPropsMixinClassContructor<P, T> {
  /**
   * Constructor signature for the custom element.
   * @param props - The properties to be mapped to the custom element.
   * @returns The custom element instance.
   * @example
   * ```ts
   * const element = new MyElement({ foo: 'bar' });
   * ```
   */
  new (props?: HTMLProps<P>): T;

  /**
   * The observed attributes for the custom element.
   */
  observedAttributes?: string[];

  /**
   * The observed properties for the custom element.
   */
  observedProperties?: string[];
}

type HTMLPropsMixinReturnType<P> = HTMLPropsMixinClassContructor<P, HTMLPropsMixinClass<P>>;

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
  T extends Constructor<ExtendedHTMLElement> = Constructor<
    ExtendedHTMLElement
  >,
>(
  superClass: T,
): HTMLPropsMixinReturnType<P> => {
  class HTMLPropsMixinClass extends superClass {
    props: HTMLProps<P>;
    ref?: RefObject<this>;
    content?: Content;

    constructor(...rest: any[]) {
      super();
      this.props = rest[0] ?? {};
    }

    connectedCallback(): void {
      if (super.connectedCallback) {
        super.connectedCallback();
      }
      const constructor = this.constructor as HTMLPropsMixinReturnType<P>;

      // If the element is a built-in element, the is-attribute can be added automatically.
      if (!customElements.get(this.localName)) {
        const name = customElements.getName(constructor);
        if (name) {
          this.setAttribute('is', name);
        }
      }

      // If the element has observed properties, define getters and setters for them.
      if (constructor.observedProperties) {
        for (const propertyName of constructor.observedProperties) {
          if (propertyName in this) {
            let property = this[propertyName as keyof this];
            const getter = () => property;
            const setter = (newValue: any) => {
              const oldValue = property;
              property = newValue;
              this.propertyChangedCallback?.(propertyName, oldValue, newValue);
            };
            Object.defineProperty(this, propertyName, {
              get: getter,
              set: setter,
              enumerable: true,
              configurable: true,
            });
          }
        }
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
        ref,
        style,
        dataset,
        ...rest
      } = merge(this.getDefaultProps(), this.props);

      this.ref = ref;
      if (this.ref) {
        this.ref.current = this;
      }

      if (style) {
        Object.assign(this.style, style);
      }

      if (dataset) {
        Object.assign(this.dataset, dataset);
      }

      Object.assign(this, rest);

      const hasRenderMethod = 'render' in this;

      if (!hasRenderMethod && this.content) {
        insertContent(this, this.content);
      }
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

  return HTMLPropsMixinClass;
};

interface HTMLTemplateMixinClass extends ExtendedHTMLElement {
  render?(): Content;
  build(): void;
}

type HTMLTemplateMixinType = <T extends Constructor<ExtendedHTMLElement>>(superClass: T) => {
  new (...args: any[]): HTMLTemplateMixinClass;
} & T;

/**
 * A mixin that adds template rendering capabilities to a custom element.
 *
 * @template T - The type of the custom element.
 * @param {T} superClass - The base class to extend.
 * @returns {Constructor<HTMLTemplateMixinClass>} The extended class with template rendering capabilities.
 */
export const HTMLTemplateMixin: HTMLTemplateMixinType = <T extends Constructor<ExtendedHTMLElement>>(
  superClass: T,
) => {
  class HTMLTemplateMixinClass extends superClass {
    connectedCallback(): void {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      this.build();
    }

    /**
     * Renders the content of the component.
     *
     * This method should be overridden by subclasses to provide the specific template rendering logic.
     * The return value can be a Node, a string, an array of Nodes, or null/undefined.
     *
     * @returns {Content} The rendered content of the component.
     */
    render?(): Content;

    /**
     * Builds the component by rendering its content based on the output of the `render` method.
     *
     * The `build` method processes the result of the `render` method, which can be a Node, a string,
     * an array of Nodes, or null/undefined. It then updates the component's children accordingly.
     *
     * @throws {Error} If the render result is of an invalid type.
     */
    build(): void {
      if (this.render) {
        const render = this.render();
        insertContent(this, render);
      }
    }
  }

  return HTMLTemplateMixinClass;
};

interface HTMLUtilityMixinClass extends ExtendedHTMLElement {
}

type HTMLUtilityMixinType = <T extends Constructor<ExtendedHTMLElement>>(superClass: T) => {
  new (...args: any[]): HTMLUtilityMixinClass;
  define(name: string, options?: ElementDefinitionOptions): T;
  getName(): string | null;
  getSelectors(selectors?: string): string;
} & T;

/**
 * A mixin that adds utility methods to a custom element.
 *
 * @template T - The type of the custom element.
 * @param {T} superClass - The base class to extend.
 * @returns {Constructor<HTMLUtilityMixinClass>} The extended class with utility methods.
 */
export const HTMLUtilityMixin: HTMLUtilityMixinType = <T extends Constructor<ExtendedHTMLElement>>(
  superClass: T,
) => {
  class HTMLUtilityMixinClass extends superClass {
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
  }

  return HTMLUtilityMixinClass;
};

type HTMLPropsType = <P>(elementClass: Constructor<ExtendedHTMLElement>) =>
  & {
    new (...args: any[]): HTMLUtilityMixinClass;
    define(
      name: string,
      options?: ElementDefinitionOptions,
    ): (new (...args: any[]) => HTMLTemplateMixinClass) & HTMLPropsMixinReturnType<P>;
    getName(): string | null;
    getSelectors(selectors?: string): string;
  }
  & (new (...args: any[]) => HTMLTemplateMixinClass)
  & HTMLPropsMixinReturnType<P>;

/**
 * Combines HTMLPropsMixin, HTMLTemplateMixin and HTMLUtilityMixin to create a custom element with props API, template rendering, and utilities.
 *
 * @template P - The type of the props.
 * @param {Constructor<ExtendedHTMLElement>} elementClass - The base class to extend.
 * @returns {Constructor<ExtendedHTMLElement>} The extended class with combined mixins.
 */
const HTMLAllMixin: HTMLPropsType = <P>(elementClass: Constructor<ExtendedHTMLElement>) =>
  HTMLUtilityMixin(
    HTMLTemplateMixin(
      HTMLPropsMixin<P>(elementClass),
    ),
  );

export default HTMLAllMixin;
