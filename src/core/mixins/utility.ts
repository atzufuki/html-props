import type { Constructor, HTMLElementLifecycles, HTMLUtilityConstructor } from '../types.ts';

/**
 * A mixin that adds utility methods to a custom element.
 *
 * @template P - The type of the props.
 * @template Base - The base class to extend.
 * @returns {HTMLUtilityConstructor<HTMLUtilityMixinClass>} The extended class with utility methods.
 */
export const HTMLUtilityMixin = <P = any, Base extends Constructor<any, any> = Constructor<HTMLElement>>(
  superClass: Base,
): HTMLUtilityConstructor<InstanceType<Base>, 0 extends (1 & P) ? InstanceType<Base> : P> => {
  type PropsType = 0 extends (1 & P) ? InstanceType<Base> : P;

  class HTMLUtilityMixinClass extends (superClass as Constructor<HTMLElementLifecycles, any>) {
    constructor(...args: any[]) {
      super(...args);
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
  }

  return HTMLUtilityMixinClass as unknown as HTMLUtilityConstructor<
    InstanceType<Base> & HTMLUtilityMixinClass,
    PropsType
  >;
};
