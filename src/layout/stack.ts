import { HTMLPropsMixin } from '@html-props/core';
import { effect } from '@html-props/signals';

export const Alignment = {
  topLeft: 'start start',
  topCenter: 'start center',
  topRight: 'start end',
  centerLeft: 'center start',
  center: 'center center',
  centerRight: 'center end',
  bottomLeft: 'end start',
  bottomCenter: 'end center',
  bottomRight: 'end end',
} as const;

export class Stack extends HTMLPropsMixin(HTMLElement, {
  alignment: { type: String, default: 'topLeft' as keyof typeof Alignment },
  style: { display: 'grid', gridTemplateAreas: '"stack"' },
}) {
  private _dispose: (() => void) | null = null;

  onMount() {
    this.updateChildren();

    this._observer = new MutationObserver(() => this.updateChildren());
    this._observer.observe(this, { childList: true });

    this._dispose = effect(() => {
      const align = this.alignment;
      this.style.placeItems = (Alignment as any)[align] || align;
    });
  }

  onUnmount() {
    this._observer?.disconnect();
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }

  private _observer?: MutationObserver;

  private updateChildren() {
    Array.from(this.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        child.style.gridArea = 'stack';
      }
    });
  }
}
Stack.define('layout-stack');
