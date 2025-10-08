import type { Constructor, HTMLTemplateExtra, HTMLUtilityConstructorExtra, HTMLUtilityExtra } from '../types.ts';

// /**
//  * The observed attributes for the custom element.
//  */
// observedAttributes?: string[];

// /**
//  * The observed properties for the custom element.
//  */
// observedProperties?: string[];

// define(name: string, options?: ElementDefinitionOptions): Constructor<T, P>;
// getName(): string | null;
// getSelectors(selectors?: string): string;

/**
 * A mixin that adds utility methods to a custom element.
 *
 * @template P - The type of the props.
 * @template Base - The base class to extend.
 * @returns {HTMLUtilityConstructor<HTMLUtilityMixinClass>} The extended class with utility methods.
 */
type HTMLUtilityMixinType = <SuperClass extends Constructor<any, any> & Record<string, any>>(
  superClass: SuperClass,
) => SuperClass extends Constructor<infer T, infer P> ?
    & Constructor<
      T & HTMLUtilityExtra,
      P
    >
    & Omit<SuperClass, keyof Constructor<any, any>>
    & HTMLUtilityConstructorExtra
  : never;

/**
 * A mixin that adds utility methods to a custom element.
 * Provides define(), getName(), and getSelectors() static methods.
 */
export const HTMLUtilityMixin: HTMLUtilityMixinType = <SuperClass>(superClass: SuperClass) => {
  /**
   * Class that extends the superclass with utility methods for custom element registration and selection.
   */
  return class HTMLUtilityMixinClass extends (superClass as Constructor<HTMLTemplateExtra>) {
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
  } as any;
};
