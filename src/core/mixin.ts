import { effect, type Signal, signal } from '@html-props/signals';
import type { RefObject } from './ref.ts';
import type { PropsConfig, TypedPropConfig } from './types.ts';

// Minimal interface for DOM elements to avoid type errors if lib.dom is missing
interface HTMLElementLike {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  attributeChangedCallback?(name: string, oldVal: string | null, newVal: string | null): void;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  dispatchEvent(event: any): boolean;
  addEventListener(type: string, listener: any, options?: any): void;
  replaceChildren(...nodes: any[]): void;
  style: any;
  textContent: string | null;
}

type Constructor<T = HTMLElementLike> = new (...args: any[]) => T;

export interface HTMLPropsElementConstructor<T extends Constructor, P = {}> {
  new (
    props?: Omit<Partial<InstanceType<T>>, 'style'> & {
      style?: Partial<CSSStyleDeclaration> | string;
      ref?: RefObject<any>;
      children?: any;
      content?: any;
    } & P,
    ...args: any[]
  ): InstanceType<T> & P & { connectedCallback(): void; disconnectedCallback(): void };
  props: keyof P extends never ? PropsConfig : { [K in keyof P]: TypedPropConfig<P[K]> };
  define(tagName: string, options?: any): HTMLPropsElementConstructor<T, P> & Pick<T, keyof T>;
}

export function HTMLPropsMixin<T extends Constructor, P = {}>(
  Base: T,
): HTMLPropsElementConstructor<T, P> & Pick<T, keyof T> {
  class HTMLPropsElement extends Base {
    // @ts-ignore: static props will be defined by subclass
    static props: any;

    static define(tagName: string, options?: any) {
      customElements.define(tagName, this as any, options);
      return this;
    }

    // Store signals for props
    private __signals: Record<string, Signal<any>> = {};
    private __cleanup: (() => void) | null = null;

    static get observedAttributes() {
      const props = (this as any).props as PropsConfig;
      if (!props) return [];
      return Object.entries(props)
        .filter(([_, config]) => config.reflect || config.attr)
        .map(([key, config]) => config.attr || key.toLowerCase());
    }

    constructor(...args: any[]) {
      // @ts-ignore: Allow passing args to super even if Base doesn't declare them
      if ('props' in Base) {
        super(...args);
      } else {
        super();
      }

      // Workaround for linkedom: ownerDocument might be missing after constructor
      if (!(this as any).ownerDocument && globalThis.document) {
        Object.defineProperty(this, 'ownerDocument', { value: globalThis.document });
      }

      this.__initializeProps();

      const props = args[0];
      if (props && typeof props === 'object' && !props.nodeType && !Array.isArray(props)) {
        this.__applyProps(props);
      }
    }

    private __applyProps(props: Record<string, any>) {
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'style') {
          if (typeof value === 'object') {
            Object.assign(this.style, value);
          } else {
            this.setAttribute('style', String(value));
          }
        } else if (key === 'className' || key === 'class') {
          this.setAttribute('class', value as string);
        } else if (key === 'ref' && typeof value === 'object' && 'current' in (value as any)) {
          (value as any).current = this;
        } else if (key.startsWith('on') && typeof value === 'function') {
          const eventName = key.substring(2).toLowerCase();
          this.addEventListener(eventName, value as any);
        } else if (key === 'content' || key === 'children') {
          const nodes = Array.isArray(value) ? value : [value];
          this.replaceChildren(...nodes);
        } else {
          if (key in this) {
            try {
              (this as any)[key] = value;
            } catch {
              // Property might be readonly
            }
          } else {
            if (value === true) {
              this.setAttribute(key, '');
            } else if (value != null && value !== false) {
              this.setAttribute(key, String(value));
            }
          }
        }
      });
    }

    private __initializeProps() {
      const props = (this.constructor as any).props as PropsConfig;
      if (!props) return;

      Object.entries(props).forEach(([key, config]) => {
        // Initialize signal with default value
        const initialValue = config.default;
        const s = signal(initialValue);
        this.__signals[key] = s;

        // Define property getter/setter
        Object.defineProperty(this, key, {
          get: () => s(),
          set: (v) => {
            const oldValue = s();
            if (oldValue !== v) {
              s.set(v);
              if (config.event) {
                this.dispatchEvent(new CustomEvent(config.event, { detail: v }));
              }
            }
          },
          enumerable: true,
          configurable: true,
        });
      });
    }

    override connectedCallback() {
      // @ts-ignore: super might have connectedCallback
      if (super.connectedCallback) super.connectedCallback();

      if ((this as any).onMount) (this as any).onMount();

      // Setup render effect
      this.__cleanup = effect(() => {
        // Render
        if ((this as any).render) {
          const content = (this as any).render();
          this.replaceChildren(
            ...(Array.isArray(content) ? content : [content]).filter((n: any) => n),
          );
        }

        // Reflect attributes
        const props = (this.constructor as any).props as PropsConfig;
        if (props) {
          Object.entries(props).forEach(([key, config]) => {
            if (config.reflect) {
              const val = this.__signals[key]();
              const attrName = config.attr || key.toLowerCase();

              if (config.type === Boolean) {
                if (val) {
                  if (!this.hasAttribute(attrName)) {
                    this.setAttribute(attrName, '');
                  }
                } else {
                  if (this.hasAttribute(attrName)) {
                    this.removeAttribute(attrName);
                  }
                }
              } else {
                // String or Number
                if (val != null) {
                  const strVal = String(val);
                  if (this.getAttribute(attrName) !== strVal) {
                    this.setAttribute(attrName, strVal);
                  }
                } else {
                  this.removeAttribute(attrName);
                }
              }
            }
          });
        }
      });
    }

    override disconnectedCallback() {
      // @ts-ignore
      if (super.disconnectedCallback) super.disconnectedCallback();

      if ((this as any).onUnmount) (this as any).onUnmount();

      if (this.__cleanup) {
        this.__cleanup();
        this.__cleanup = null;
      }
    }

    override attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
      // @ts-ignore
      if (super.attributeChangedCallback) super.attributeChangedCallback(name, oldVal, newVal);

      if (oldVal === newVal) return;

      const props = (this.constructor as any).props as PropsConfig;
      if (!props) return;

      // Find prop for attribute
      const entry = Object.entries(props).find(([key, config]) => {
        const attr = config.attr || key.toLowerCase();
        return attr === name;
      });

      if (entry) {
        const [key, config] = entry;
        let val: any = newVal;

        if (config.type === Boolean) {
          val = newVal !== null;
        } else if (config.type === Number) {
          val = newVal === null ? null : Number(newVal);
        }

        (this as any)[key] = val;
      }
    }
  }
  return HTMLPropsElement as any;
}
