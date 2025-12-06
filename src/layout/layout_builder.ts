import { HTMLPropsMixin } from '@html-props/core';
import { signal } from '@html-props/signals';

export class LayoutBuilder extends HTMLPropsMixin(HTMLElement, {
  builder: { type: Function },
}) {
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

  render() {
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
