import { effect, type Signal, signal } from '@html-props/signals';
import type { RefObject } from './ref.ts';
import type { InferConstructorProps, InferProps, PropsConfig, PropsConfigValidator } from './types.ts';

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
  shadowRoot: any;
}

type Constructor<T = HTMLElementLike> = new (...args: any[]) => T;

// Unique symbols to avoid any property name conflicts
const PROPS_CONTROLLER = Symbol.for('html-props:controller');
const HTML_PROPS_MIXIN = Symbol.for('html-props:mixin');

/**
 * Controller class that manages all html-props functionality.
 * This is stored on a single Symbol property to avoid conflicts.
 */
class PropsController {
  private signals: Record<string, Signal<any>> = {};
  private cleanup: (() => void) | null = null;
  private isFirstRender = true;
  private updateSignal: Signal<number> = signal(0);
  private ref: any = null;
  private host: HTMLElementLike;
  private propsConfig: PropsConfig | null;
  private baseHasOwnRendering: boolean;

  constructor(host: HTMLElementLike, propsConfig: PropsConfig | null, baseHasOwnRendering: boolean) {
    this.host = host;
    this.propsConfig = propsConfig;
    this.baseHasOwnRendering = baseHasOwnRendering;
  }

  requestUpdate() {
    this.updateSignal.update((n: number) => n + 1);
  }

  setRef(ref: any) {
    this.ref = ref;
  }

  getSignal(key: string): Signal<any> | undefined {
    return this.signals[key];
  }

  applyProps(props: Record<string, any>) {
    const host = this.host;
    const propsConfig = this.propsConfig;

    Object.entries(props).forEach(([key, value]) => {
      if (key === 'style') {
        if (typeof value === 'object') {
          Object.assign(host.style, value);
        } else {
          host.setAttribute('style', String(value));
        }
      } else if (key === 'ref') {
        this.ref = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        // Event handlers: set as property (like all props)
        if (key in host) {
          try {
            (host as any)[key] = value;
          } catch {
            // Property might be readonly
          }
        }
        // Also add as event listener if propsConfig has event option for this key
        const config = propsConfig?.[key];
        if (config?.event) {
          const eventName = typeof config.event === 'string' ? config.event : key.substring(2).toLowerCase();
          host.addEventListener(eventName, value as any);
        }
      } else if (
        (key === 'content' || key === 'children') &&
        (propsConfig && key in propsConfig)
      ) {
        (host as any)[key] = value;
      } else if (key === 'content' || key === 'children') {
        const nodes = (Array.isArray(value) ? value : [value]).filter((n: any) =>
          n != null && n !== false && n !== true
        );
        host.replaceChildren(...nodes);
      } else {
        if (key in host) {
          try {
            (host as any)[key] = value;
          } catch {
            // Property might be readonly
          }
        } else {
          if (value === true) {
            host.setAttribute(key, '');
          } else if (value != null && value !== false) {
            host.setAttribute(key, String(value));
          }
        }
      }
    });
  }

  initializeProps() {
    const host = this.host;
    const props = this.propsConfig;
    if (!props) return;

    Object.entries(props).forEach(([key, config]) => {
      // Skip children and content as they are handled specially
      if (key === 'children' || key === 'content') return;

      // Check if it's a PropConfig (has type constructor OR default OR attribute)
      const isPropConfig = config && typeof config === 'object' && (
        typeof config.type === 'function' ||
        'default' in config ||
        'attribute' in config
      );

      if (!isPropConfig) {
        // Direct value (default for native prop)
        if (key === 'style' && typeof config === 'object') {
          Object.assign(host.style, config);
        } else {
          (host as any)[key] = config;
        }
        return;
      }

      // Special handling for style in PropConfig format
      if (key === 'style') {
        if (config.default) {
          if (typeof config.default === 'object') {
            Object.assign(host.style, config.default);
          } else {
            host.setAttribute('style', String(config.default));
          }
        }
        return;
      }

      // Initialize signal with default value
      const initialValue = config.default;
      const s = signal(initialValue);
      this.signals[key] = s;

      // Define property getter/setter on host
      Object.defineProperty(host, key, {
        get: () => s(),
        set: (v) => {
          const oldValue = s();
          if (oldValue !== v) {
            s.set(v);
            if (config.event) {
              host.dispatchEvent(new CustomEvent(config.event, { detail: v }));
            }
          }
        },
        enumerable: true,
        configurable: true,
      });
    });

    // Initial reflection of defaults
    this.reflectAttributes();
  }

  defaultUpdate(newContent?: any) {
    const host = this.host;
    if (newContent === undefined && !(host as any).render) {
      return;
    }
    const content = newContent === undefined && (host as any).render ? (host as any).render() : newContent;

    const target = host.shadowRoot || host;
    target.replaceChildren(
      ...(Array.isArray(content) ? content : [content]).filter((n: any) => n != null && n !== false && n !== true),
    );
  }

  build(newContent?: any) {
    const host = this.host;
    if (newContent === undefined && !(host as any).render) {
      return;
    }
    const content = newContent === undefined && (host as any).render ? (host as any).render() : newContent;

    const target = host.shadowRoot || host;
    target.replaceChildren(
      ...(Array.isArray(content) ? content : [content]).filter((n: any) => n != null && n !== false && n !== true),
    );
  }

  reflectAttributes() {
    const host = this.host;
    const props = this.propsConfig;
    if (!props) return;

    Object.entries(props).forEach(([key, config]) => {
      const isPropConfig = config && typeof config === 'object' && (
        typeof config.type === 'function' ||
        'default' in config ||
        'attribute' in config
      );
      if (!isPropConfig) return;

      if (config.attribute) {
        const s = this.signals[key];
        if (!s) return;
        const val = s();
        const attrName = typeof config.attribute === 'string' ? config.attribute : key.toLowerCase();

        const isBoolean = config.type === Boolean || (typeof config.default === 'boolean');

        if (isBoolean) {
          if (val) {
            if (!host.hasAttribute(attrName)) {
              host.setAttribute(attrName, '');
            }
          } else {
            if (host.hasAttribute(attrName)) {
              host.removeAttribute(attrName);
            }
          }
        } else {
          if (val != null) {
            const strVal = String(val);
            if (host.getAttribute(attrName) !== strVal) {
              host.setAttribute(attrName, strVal);
            }
          } else {
            host.removeAttribute(attrName);
          }
        }
      }
    });
  }

  onConnected() {
    // Apply ref
    if (this.ref) {
      if (typeof this.ref === 'function') {
        this.ref(this.host);
      } else if (typeof this.ref === 'object' && 'current' in this.ref) {
        this.ref.current = this.host;
      }
    }

    // Setup effects
    let renderDispose = () => {};

    // Only set up render effect if base doesn't have its own rendering
    if (!this.baseHasOwnRendering) {
      renderDispose = effect(() => {
        this.updateSignal();
        if (this.isFirstRender) {
          this.defaultUpdate();
          this.isFirstRender = false;
        } else if (typeof (this.host as any).update === 'function') {
          (this.host as any).update();
        } else {
          this.defaultUpdate();
        }
      });
    }

    const reflectDispose = effect(() => this.reflectAttributes());

    this.cleanup = () => {
      renderDispose();
      reflectDispose();
    };
  }

  onDisconnected() {
    // Unset ref
    if (this.ref) {
      if (typeof this.ref === 'function') {
        this.ref(null);
      } else if (typeof this.ref === 'object' && 'current' in this.ref) {
        this.ref.current = null;
      }
    }

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;

    const props = this.propsConfig;
    if (!props) return;

    // Find prop for attribute
    const entry = Object.entries(props).find(([key, config]) => {
      const attr = typeof config.attribute === 'string' ? config.attribute : key.toLowerCase();
      return attr === name;
    });

    if (entry) {
      const [key, config] = entry;
      let val: any = newVal;

      if (config.type === Boolean || (typeof config.default === 'boolean')) {
        val = newVal !== null;
      } else if (config.type === Number || (typeof config.default === 'number')) {
        val = newVal === null ? null : Number(newVal);
      }

      (this.host as any)[key] = val;
    }
  }
}

/**
 * Lifecycle methods that are always present on the element.
 * We define them as an interface so they are treated as methods, not properties.
 */
interface HTMLPropsLifecycle {
  connectedCallback(): void;
  disconnectedCallback(): void;
  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void;
}

/**
 * Utility methods provided by the mixin.
 * These are subject to Omit if the base class already defines them.
 */
interface HTMLPropsMethods {
  build(): void;
  defaultUpdate(newContent?: any): void;
  requestUpdate(): void;
}

interface HTMLPropsStaticMethods<Result> {
  define(tagName: string, options?: any): Result;
}

export type HTMLPropsElementConstructor<T extends Constructor, P = {}, IP = P> =
  & {
    new (
      props?: Omit<Partial<InstanceType<T>>, 'style' | 'children'> & {
        style?: Partial<CSSStyleDeclaration> | string;
        ref?: RefObject<any> | ((el: InstanceType<T>) => void);
        children?: any;
        content?: any;
      } & P,
      ...args: any[]
    ): InstanceType<T> & IP & HTMLPropsLifecycle & Omit<HTMLPropsMethods, keyof InstanceType<T>>;
  }
  & ('define' extends keyof T ? unknown
    : HTMLPropsStaticMethods<HTMLPropsElementConstructor<T, P, IP> & Pick<T, keyof T>>);

export function HTMLPropsMixin<T extends Constructor, C extends PropsConfig<InstanceType<T>>>(
  Base: T,
  config: C & PropsConfigValidator<InstanceType<T>, C>,
): HTMLPropsElementConstructor<T, InferConstructorProps<C>, InferProps<C>> & Pick<T, keyof T>;

export function HTMLPropsMixin<T extends Constructor, P = {}>(
  Base: T,
): HTMLPropsElementConstructor<T, P, P> & Pick<T, keyof T>;

export function HTMLPropsMixin<T extends Constructor, POrConfig = {}>(
  Base: T,
  config?: POrConfig,
): HTMLPropsElementConstructor<T, any> & Pick<T, keyof T> {
  // Check if the base class has its own rendering system (not from our mixin)
  // If base has our marker, it's from a previous HTMLPropsMixin application - we should render
  // If base has requestUpdate but NOT our marker, it's an external framework (LitElement etc) - skip rendering
  const baseIsHtmlProps = (Base as any)[HTML_PROPS_MIXIN] === true;
  const baseHasOwnRendering = !baseIsHtmlProps && 'requestUpdate' in Base.prototype;

  class HTMLPropsElement extends Base {
    // Marker to identify classes created by HTMLPropsMixin
    static [HTML_PROPS_MIXIN] = true;

    // Single Symbol property to avoid any conflicts
    [PROPS_CONTROLLER]: PropsController;

    static define(...args: any[]) {
      // @ts-ignore
      if (typeof super.define === 'function') {
        // @ts-ignore
        return super.define(...args);
      }
      customElements.define(args[0], this as any, args[1]);
      return this;
    }

    static get observedAttributes() {
      // @ts-ignore
      const parentAttrs: string[] = super.observedAttributes || [];

      const props = (this as any).__props as PropsConfig;
      if (!props) return parentAttrs;

      const ownAttrs = Object.entries(props)
        .filter(([_, cfg]) => cfg.attribute)
        .map(([key, cfg]) => {
          if (typeof cfg.attribute === 'string') return cfg.attribute;
          return key.toLowerCase();
        });

      return [...new Set([...parentAttrs, ...ownAttrs])];
    }

    requestUpdate(...args: any[]) {
      if (this[PROPS_CONTROLLER]) {
        this[PROPS_CONTROLLER].requestUpdate();
      }
      // @ts-ignore
      if (typeof super.requestUpdate === 'function') {
        // @ts-ignore
        super.requestUpdate(...args);
      }
    }

    defaultUpdate(...args: any[]) {
      // @ts-ignore
      if (typeof super.defaultUpdate === 'function') {
        // @ts-ignore
        super.defaultUpdate(...args);
      } else if (this[PROPS_CONTROLLER]) {
        this[PROPS_CONTROLLER].defaultUpdate(args[0]);
      }
    }

    build(...args: any[]) {
      // @ts-ignore
      if (typeof super.build === 'function') {
        // @ts-ignore
        super.build(...args);
      } else if (this[PROPS_CONTROLLER]) {
        this[PROPS_CONTROLLER].build(args[0]);
      }
    }

    constructor(...args: any[]) {
      // @ts-ignore
      if ('props' in Base) {
        super(...args);
      } else {
        super();
      }

      // Workaround for linkedom
      if (!(this as any).ownerDocument && globalThis.document) {
        Object.defineProperty(this, 'ownerDocument', { value: globalThis.document });
      }

      // Create controller with props config
      const propsConfig = (this.constructor as any).__props as PropsConfig || null;
      this[PROPS_CONTROLLER] = new PropsController(this, propsConfig, baseHasOwnRendering);
      this[PROPS_CONTROLLER].initializeProps();

      const props = args[0];
      if (props && typeof props === 'object' && !props.nodeType && !Array.isArray(props)) {
        this[PROPS_CONTROLLER].applyProps(props);
      }
    }

    override connectedCallback() {
      // @ts-ignore
      if (super.connectedCallback) super.connectedCallback();
      this[PROPS_CONTROLLER].onConnected();
    }

    override disconnectedCallback() {
      // @ts-ignore
      if (super.disconnectedCallback) super.disconnectedCallback();
      this[PROPS_CONTROLLER].onDisconnected();
    }

    override attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
      // @ts-ignore
      if (super.attributeChangedCallback) super.attributeChangedCallback(name, oldVal, newVal);
      // Guard: controller may not exist yet during early attribute setting
      if (this[PROPS_CONTROLLER]) {
        this[PROPS_CONTROLLER].onAttributeChanged(name, oldVal, newVal);
      }
    }
  }

  if (config && typeof config === 'object') {
    (HTMLPropsElement as any).__props = {
      ...((Base as any).__props || {}),
      ...config,
    };
  }

  return HTMLPropsElement as any;
}
