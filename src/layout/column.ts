import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';
import { effect } from '@html-props/signals';
import { CrossAxisAlignment, MainAxisAlignment } from './flex_types.ts';

const config: {
  mainAxisAlignment: Prop<keyof typeof MainAxisAlignment>;
  crossAxisAlignment: Prop<keyof typeof CrossAxisAlignment>;
  gap: Prop<string>;
  wrap: Prop<'nowrap' | 'wrap' | 'wrap-reverse'>;
  style: { display: string; flexDirection: string };
} = {
  mainAxisAlignment: prop<keyof typeof MainAxisAlignment>('start'),
  crossAxisAlignment: prop<keyof typeof CrossAxisAlignment>('stretch'),
  gap: prop('0'),
  wrap: prop<'nowrap' | 'wrap' | 'wrap-reverse'>('nowrap'),
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

  connectedCallback() {
    super.connectedCallback();
    this._dispose = effect(() => {
      const main = this.mainAxisAlignment;
      this.style.justifyContent = (MainAxisAlignment as any)[main] || main;

      const cross = this.crossAxisAlignment;
      this.style.alignItems = (CrossAxisAlignment as any)[cross] || cross;

      this.style.gap = this.gap;
      this.style.flexWrap = this.wrap;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}

Column.define('layout-column');
