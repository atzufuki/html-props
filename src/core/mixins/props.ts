import type { Constructor, Content, HTMLElementLifecycles, HTMLProps } from '../types.ts';

import { createRef, type RefObject } from '../ref.ts';
import { insertContent } from '../content.ts';

export { createRef, type RefObject };

/**
 * Interface describing the members added by HTMLPropsMixin
 */
export interface HTMLPropsMixinInterface<P = any> {
  props: HTMLProps<P>;
  ref?: RefObject<any>;
  content?: Content;
  getDefaultProps(): HTMLProps<P>;
}

/**
 * Symbol used to identify signals across different implementations.
 * Signal implementations should set this symbol to true on their signal instances.
 */
const SIGNAL_BRAND = Symbol.for('html-props:signal');

/**
 * Checks if a value is a Signal.
 * Uses Symbol.for to detect signals without creating a package dependency.
 * Signal implementations should mark their instances with Symbol.for('html-props:signal') = true.
 * @param value - The value to check.
 * @returns True if the value is a Signal, false otherwise.
 */
function isSignal(value: any): boolean {
  // First check for the signal brand symbol (most reliable)
  if (value != null && (value as any)[SIGNAL_BRAND] === true) {
    return true;
  }
  return false;
}

/**
 * A mixin that adds HTML props handling to a custom element.
 *
 * @template P - The type of the props (defaults to the base class instance type).
 * @param {Constructor} superClass - The base class to extend.
 * @returns {Constructor<HTMLPropsMixinClass>} The extended class with HTML props handling.
 */
export const HTMLPropsMixin = <P = any, Base extends Constructor<any, any> = Constructor<HTMLElement, P>>(
  superClass: Base,
): Constructor<
  InstanceType<Base> & HTMLPropsMixinInterface<0 extends (1 & P) ? InstanceType<Base> : P>,
  0 extends (1 & P) ? InstanceType<Base> : P
> => {
  type PropsType = 0 extends (1 & P) ? InstanceType<Base> : P;

  class HTMLPropsMixinClass extends (superClass as Constructor<HTMLElementLifecycles, any>) {
    props: HTMLProps<PropsType>;
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

      const constructor = this.constructor as any;

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

      // Apply props, handling signals specially
      for (const [key, value] of Object.entries(rest)) {
        const existingProp = this[key as keyof this] as any;
        if (isSignal(existingProp)) {
          // If the existing property is a signal, call .set() instead of replacing it
          existingProp.set(value);
        } else {
          // Otherwise, assign normally
          (this as any)[key] = value;
        }
      }

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

  return HTMLPropsMixinClass as Constructor<
    InstanceType<Base> & HTMLPropsMixinClass,
    PropsType
  >;
};
