import { HTML_PROPS_MIXIN, PROPS_CONTROLLER, PropsController } from './controller.ts';
import type { RefObject } from './ref.ts';
import type { Constructor, InferConstructorProps, InferProps, PropsConfig, PropsConfigValidator } from './types.ts';

export interface HTMLPropsElementConstructor<T extends Constructor, P = {}, IP = P> {
  new (
    props?: Omit<Partial<InstanceType<T>>, 'style' | 'children'> & {
      style?: Partial<CSSStyleDeclaration> | string;
      ref?: RefObject<any> | ((el: InstanceType<T>) => void);
      children?: any;
      content?: any;
    } & P,
    ...args: any[]
  ): InstanceType<T> & IP & {
    connectedCallback(): void;
    disconnectedCallback(): void;
    mountedCallback?(): void;
    unmountedCallback?(): void;
    update?(): void;
    defaultUpdate(): void;
    forceUpdate(): void;
    requestUpdate(): void;
    render(): any;
  };
  define(tagName: string, options?: any): HTMLPropsElementConstructor<T, P, IP> & Pick<T, keyof T>;
}

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
  class HTMLPropsElement extends Base {
    // Marker to identify classes created by HTMLPropsMixin
    static [HTML_PROPS_MIXIN] = true;

    // Single Symbol property to avoid any conflicts
    [PROPS_CONTROLLER]: PropsController;

    static define(tagName: string, options?: any) {
      customElements.define(tagName, this as any, options);
      return this;
    }

    static get observedAttributes() {
      const propsConfig = (this as any).__propsConfig as PropsConfig;
      if (!propsConfig) return [];
      return Object.entries(propsConfig)
        .filter(([_, cfg]) => cfg.attribute)
        .map(([key, cfg]) => {
          if (typeof cfg.attribute === 'string') return cfg.attribute;
          return key.toLowerCase();
        });
    }

    constructor(...args: any[]) {
      // @ts-ignore
      if ('props' in Base) {
        super(...args);
      } else {
        super();
      }

      // Create controller with props config
      const propsConfig = (this.constructor as any).__propsConfig as PropsConfig || {};
      const props = args[0] ?? {};
      this[PROPS_CONTROLLER] = new PropsController(this, propsConfig, props);
    }

    override connectedCallback() {
      // @ts-ignore
      if (super.connectedCallback) super.connectedCallback();

      if ((this as any).__html_props_phantom) return;

      this[PROPS_CONTROLLER].onConnected();

      if ((this as any).mountedCallback) {
        (this as any).mountedCallback();
      }
    }

    override disconnectedCallback() {
      // @ts-ignore
      if (super.disconnectedCallback) super.disconnectedCallback();

      if ((this as any).__html_props_phantom) return;

      this[PROPS_CONTROLLER].onDisconnected();

      if ((this as any).unmountedCallback) {
        (this as any).unmountedCallback();
      }
    }

    override attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
      // @ts-ignore
      if (super.attributeChangedCallback) super.attributeChangedCallback(name, oldVal, newVal);
      // Controller may not exist yet during parent constructor execution
      this[PROPS_CONTROLLER]?.onAttributeChanged(name, oldVal, newVal);
    }

    requestUpdate() {
      // If parent has requestUpdate (e.g., Lit), delegate to it and skip our logic
      // @ts-ignore
      if (super.requestUpdate) {
        // @ts-ignore
        super.requestUpdate();
        return;
      }
      // Controller may not exist yet during parent constructor execution
      this[PROPS_CONTROLLER]?.requestUpdate();
    }

    defaultUpdate() {
      // @ts-ignore
      if (super.defaultUpdate) super.defaultUpdate();
      this[PROPS_CONTROLLER]?.defaultUpdate();
    }

    forceUpdate() {
      // @ts-ignore
      if (super.forceUpdate) super.forceUpdate();
      this[PROPS_CONTROLLER]?.forceUpdate();
    }
  }

  if (config && typeof config === 'object') {
    (HTMLPropsElement as any).__propsConfig = {
      ...((Base as any).__propsConfig || {}),
      ...config,
    };
  }

  return HTMLPropsElement as any;
}
