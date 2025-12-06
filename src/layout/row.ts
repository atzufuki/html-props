import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  prop,
} from '@html-props/core';
import { effect } from '@html-props/signals';
import { CrossAxisAlignment, MainAxisAlignment } from './flex_types.ts';

const config = {
  mainAxisAlignment: prop<keyof typeof MainAxisAlignment>('start'),
  crossAxisAlignment: prop<keyof typeof CrossAxisAlignment>('stretch'),
  gap: prop('0'),
  wrap: prop<'nowrap' | 'wrap' | 'wrap-reverse'>('nowrap'),
  style: { display: 'flex', flexDirection: 'row' },
};

const RowBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class Row extends RowBase {
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
