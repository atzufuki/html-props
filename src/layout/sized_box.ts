import { HTMLPropsMixin } from '@html-props/core';
import { effect } from '@html-props/signals';

export class SizedBox extends HTMLPropsMixin(HTMLElement, {
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  style: { display: 'block' },
}) {
  private _dispose: (() => void) | null = null;

  onMount() {
    this._dispose = effect(() => {
      const w = this.width;
      const h = this.height;

      if (w) this.style.width = w;
      if (h) this.style.height = h;

      // If both are empty, it's just a 0x0 box?
      // Flutter SizedBox can be used as a spacer.
    });
  }

  onUnmount() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}
SizedBox.define('layout-sized-box');
