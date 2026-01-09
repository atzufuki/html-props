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
  private signals: Record<string, Signal<any>> = {};
  private cleanup: (() => void) | null = null;
  private ref: any = null;
  private host: HTMLElementLike;
  private propsConfig: PropsConfig | null;
  private props: Record<string, any> = {};

  constructor(host: HTMLElementLike, propsConfig: PropsConfig | null, props: Record<string, any> = {}) {
    this.host = host;
    this.propsConfig = propsConfig;
    this.props = props;

    // Initialize props config
    if (propsConfig) {
      Object.entries(propsConfig).forEach(([key, cfg]) => {
        // Warn about children and content as they are handled specially
        if (key === 'children' || key === 'content') {
          console.warn(`'${key}' is handled specially and should not be used in propsConfig`);
        }

        // Check if it's a PropConfig (has type constructor OR default OR attribute)
        const isPropConfig = cfg && typeof cfg === 'object' && (
          typeof cfg.type === 'function' ||
          'default' in cfg ||
          'attribute' in cfg
        );

        if (!isPropConfig) {
          // Direct value will be applied in applyProps
          return;
        }

        // Initialize signal with default value
        const initialValue = cfg.default;
        const s = signal(initialValue);
        this.signals[key] = s;

        // Define property getter/setter on host
        Object.defineProperty(host, key, {
          get: () => s(),
          set: (v) => {
            const oldValue = s();
            if (oldValue !== v) {
              s.set(v);
              if (cfg.event) {
                host.dispatchEvent(new CustomEvent(cfg.event, { detail: v }));
              }
            }
          },
          enumerable: true,
          configurable: true,
        });
      });
    }
  }

  applyProps() {
    const host = this.host;
    const propsConfig = this.propsConfig;

    // 1. Apply defaults and static configuration from propsConfig first
    if (propsConfig) {
      Object.entries(propsConfig).forEach(([key, cfg]) => {
        if (key === 'children' || key === 'content') return;

        const isPropConfig = cfg && typeof cfg === 'object' && (
          typeof cfg.type === 'function' ||
          'default' in cfg ||
          'attribute' in cfg
        );

        if (!isPropConfig && cfg !== undefined) {
          if (key === 'style' && typeof cfg === 'object') {
            Object.assign(host.style, cfg);
          } else if (key === 'dataset' && typeof cfg === 'object') {
            Object.assign(host.dataset, cfg);
          } else {
            if (key in host) {
              try {
                (host as any)[key] = cfg;
              } catch {
                if (cfg != null && cfg !== false) host.setAttribute(key, String(cfg));
              }
            } else {
              if (cfg === true) host.setAttribute(key, '');
              else if (cfg != null && cfg !== false) host.setAttribute(key, String(cfg));
            }
          }
        }
      });
    }

    // 2. Apply instance-specific props (overrides)
    const { style, dataset, ref, children, content, ...rest } = this.props;

    if (style) {
      if (typeof style === 'object') Object.assign(host.style, style);
      else host.setAttribute('style', String(style));
    }

    if (dataset) {
      Object.assign(host.dataset, dataset);
    }

    if (ref) {
      this.ref = ref;
    }

    // Apply instance props
    Object.entries(rest).forEach(([key, value]) => {
      if (key in host) {
        try {
          (host as any)[key] = value;
        } catch {
          if (value === true) host.setAttribute(key, '');
          else if (value != null && value !== false) host.setAttribute(key, String(value));
        }
      } else {
        if (value === true) host.setAttribute(key, '');
        else if (value != null && value !== false) host.setAttribute(key, String(value));
      }
    });
  }

  firstRenderDone = false;

  getContent() {
    const host = this.host as any;
    const render = host.render?.();
    return this.props.textContent || this.props.content || this.props.children || render;
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

    // Copy its properties
    for (const key of Object.getOwnPropertyNames(this)) {
      try {
        (next as any)[key] = (this as any)[key];
      } catch (e) {
        // Read-only property
      }
    }

    // Render content into next
    const content = this.getContent();
    document.body.appendChild(next);
    next.replaceChildren(
      ...(Array.isArray(content) ? content : [content]).filter((n: any) => n != null && n !== false && n !== true),
    );
    document.body.removeChild(next);

    // Morph next render to current
    morph(host, next, { preserveChanges: true });
  }

  forceUpdate() {
    const host = this.host as any;
    const target = host.shadowRoot || host;
    const content = this.getContent();
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

    this.applyProps();
    // this.requestUpdate();

    const renderDispose = effect(() => this.requestUpdate());
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
