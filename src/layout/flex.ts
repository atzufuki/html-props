import { HTMLPropsMixin } from '@html-props/core';
import { effect } from '@html-props/signals';

export const MainAxisAlignment = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  spaceBetween: 'space-between',
  spaceAround: 'space-around',
  spaceEvenly: 'space-evenly',
} as const;

export const CrossAxisAlignment = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  stretch: 'stretch',
  baseline: 'baseline',
} as const;

const FlexProps = {
  mainAxisAlignment: { type: String, default: 'start' },
  crossAxisAlignment: { type: String, default: 'stretch' },
  gap: { type: String, default: '0' },
  wrap: { type: String, default: 'nowrap' }, // nowrap, wrap, wrap-reverse
};

export class Row extends HTMLPropsMixin(HTMLElement, {
  ...FlexProps,
  style: { display: 'flex', flexDirection: 'row' },
}) {
  private _dispose: (() => void) | null = null;

  onMount() {
    this._dispose = effect(() => {
      const main = this.mainAxisAlignment;
      this.style.justifyContent = (MainAxisAlignment as any)[main] || main;

      const cross = this.crossAxisAlignment;
      this.style.alignItems = (CrossAxisAlignment as any)[cross] || cross;

      this.style.gap = this.gap;
      this.style.flexWrap = this.wrap;
    });
  }

  onUnmount() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}

export class Column extends HTMLPropsMixin(HTMLElement, {
  ...FlexProps,
  style: { display: 'flex', flexDirection: 'column' },
}) {
  private _dispose: (() => void) | null = null;

  onMount() {
    this._dispose = effect(() => {
      const main = this.mainAxisAlignment;
      this.style.justifyContent = (MainAxisAlignment as any)[main] || main;

      const cross = this.crossAxisAlignment;
      this.style.alignItems = (CrossAxisAlignment as any)[cross] || cross;

      this.style.gap = this.gap;
      this.style.flexWrap = this.wrap;
    });
  }

  onUnmount() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}
Row.define('layout-row');
Column.define('layout-column');
