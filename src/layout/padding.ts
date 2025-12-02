import { HTMLPropsMixin } from '@html-props/core';
import { effect } from '@html-props/signals';

export class Padding extends HTMLPropsMixin(HTMLElement, {
  padding: { type: String, default: '0' },
  style: { display: 'block' },
}) {
  private _dispose: (() => void) | null = null;

  onMount() {
    this._dispose = effect(() => {
      this.style.padding = this.padding;
    });
  }

  onUnmount() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}
Padding.define('layout-padding');
