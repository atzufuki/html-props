import { morph } from '@phlex/morphlex';
import { effect, type Signal, signal } from '@html-props/signals';
import type { HTMLElementLike, PropsConfig } from './types.ts';

// Unique symbols to avoid any property name conflicts
export const PROPS_CONTROLLER = Symbol.for('html-props:controller');
export const HTML_PROPS_MIXIN = Symbol.for('html-props:mixin');

/**
 * Controller class that manages all html-props functionality.
 * This is stored on a single Symbol property to avoid conflicts.
 */
export class PropsController {
  private firstRenderDone = false;
  private cleanup: (() => void) | null = null;
  private ref: any = null;
  private host: HTMLElementLike;
  private propsConfig: PropsConfig | null;
  private customProps: Record<string, Signal<any>> = {};
  private defaultProps: Record<string, any> = {};
  private props: Record<string, any> = {};

  constructor(host: HTMLElementLike | any, propsConfig: PropsConfig = {}, props: Record<string, any> = {}) {
    this.host = host;
    this.propsConfig = propsConfig;
    this.props = props;

    for (const [key, value] of Object.entries(propsConfig)) {
      if (this.isCustomProp(key)) {
        this.customProps[key] = signal(value.default ?? undefined);
        Object.defineProperty(host, key, {
          get: () => this.customProps[key](),
          set: (v) => {
            const oldValue = this.customProps[key]();
            if (oldValue !== v) {
              this.customProps[key].set(v);
              if (value.event) {
                host.dispatchEvent(new CustomEvent(value.event, { detail: v }));
              }
            }
          },
          enumerable: true,
          configurable: true,
        });
      } else {
        this.defaultProps[key] = value;
      }
    }
  }

  merge(...objects: any[]) {
    const isTruthy = (item: any) => !!item;
    const prepped = (objects as any[]).filter(isTruthy);

    if (prepped.length === 0) {
      return {};
    }

    return prepped.reduce((result: any, current) => {
      Object.keys(current).forEach((key) => {
        const item = current[key];
        const existing = result[key];

        if (
          typeof item === 'object' && item !== null && !Array.isArray(item) &&
          typeof existing === 'object' && existing !== null && !Array.isArray(existing)
        ) {
          result[key] = this.merge(existing, item);
        } else {
          result[key] = item;
        }
      });
      return result;
    }, {});
  }

  isCustomProp(key: string): boolean {
    const cfg = this.propsConfig ? this.propsConfig[key] : null;
    return cfg && typeof cfg === 'object' && (
      typeof cfg.type === 'function' ||
      'default' in cfg ||
      'attribute' in cfg
    );
  }

  applyContent(target: any) {
    const host = this.host as any;

    const { ref, style, dataset, innerHTML, textContent, children, content, ...rest } = this.merge(
      this.defaultProps,
      this.props,
    );

    for (const [key, value] of Object.entries(rest)) {
      target[key] = value;
    }

    if (ref) {
      if (typeof ref === 'function') {
        ref(target);
      } else if (typeof ref === 'object' && 'current' in ref) {
        ref.current = target;
      }
    }

    if (style) {
      if (typeof style === 'object') Object.assign(target.style, style);
      else target.setAttribute('style', String(style));
    }

    if (dataset) {
      Object.assign(target.dataset, dataset);
    }

    if (innerHTML) {
      target.innerHTML = innerHTML;
      return;
    }

    if (textContent) {
      target.textContent = textContent;
      return;
    }

    const render = host.render?.();
    const result = content || children || render;
    if (result != undefined) {
      target.replaceChildren(
        ...(Array.isArray(result) ? result : [result]).filter((n: any) => n != null && n !== false && n !== true),
      );
    }
  }

  requestUpdate() {
    if (this.firstRenderDone) {
      if ('update' in this.host) {
        (this.host as any).update();
      } else {
        this.defaultUpdate();
      }
    } else {
      this.forceUpdate();
      this.firstRenderDone = true;
    }
  }

  defaultUpdate() {
    const host = this.host as any;

    // Copy current element for next render
    const next = host.cloneNode(false) as unknown as HTMLElement;
    Object.defineProperty(next, '__html_props_phantom', { value: true, writable: true });

    // Copy its properties
    // for (const key of Object.getOwnPropertyNames(host)) {
    //   try {
    //     (next as any)[key] = (host as any)[key];
    //   } catch (e) {
    //     // Read-only property
    //   }
    // }

    // Render content into next
    document.body.appendChild(next);
    this.applyContent(next);
    document.body.removeChild(next);

    // Morph next render to current
    morph(host, next, {
      preserveChanges: true,
    });
  }

  forceUpdate() {
    const host = this.host as any;
    const target = host.shadowRoot || host;
    this.applyContent(target);
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
        const s = this.customProps[key];
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
    const renderDispose = effect(() => this.requestUpdate());
    const reflectDispose = effect(() => this.reflectAttributes());

    this.cleanup = () => {
      if (this.ref) {
        if (typeof this.ref === 'function') {
          this.ref(null);
        } else if (typeof this.ref === 'object' && 'current' in this.ref) {
          this.ref.current = null;
        }
      }
      renderDispose();
      reflectDispose();
    };
  }

  onDisconnected() {
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
