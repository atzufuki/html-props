import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
} from '@html-props/core';
import { effect } from '@html-props/signals';
import { CrossAxisAlignment, MainAxisAlignment } from './flex_types.ts';

const config = {
  mainAxisAlignment: { type: String, default: 'start' as keyof typeof MainAxisAlignment },
  crossAxisAlignment: { type: String, default: 'stretch' as keyof typeof CrossAxisAlignment },
  gap: { type: String, default: '0' },
  wrap: { type: String, default: 'nowrap' as 'nowrap' | 'wrap' | 'wrap-reverse' }, // nowrap, wrap, wrap-reverse
  style: { display: 'flex', flexDirection: 'column' },
};

const ColumnBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class Column extends ColumnBase {
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

Column.define('layout-column');
