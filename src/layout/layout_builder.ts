import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type PropsConfig,
} from '@html-props/core';
import { signal } from '@html-props/signals';

const config: PropsConfig = {
  builder: { type: Function },
};

const LayoutBuilderBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class LayoutBuilder extends LayoutBuilderBase {
  private _width = signal(0);
  private _height = signal(0);
  private _observer: ResizeObserver | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.style.display = 'block';
    this.style.width = '100%';
    this.style.height = '100%';

    if (typeof ResizeObserver !== 'undefined') {
      this._observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this._width.set(entry.contentRect.width);
          this._height.set(entry.contentRect.height);
        }
      });
      this._observer.observe(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  render(): any {
    if (this.builder) {
      return this.builder({
        width: this._width(),
        height: this._height(),
      });
    }
    return null;
  }
}

LayoutBuilder.define('layout-builder');
