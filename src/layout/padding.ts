import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
} from '@html-props/core';
import { effect } from '@html-props/signals';

const config = {
  padding: { type: String, default: '0' },
  style: { display: 'block' },
};

const PaddingBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class Padding extends PaddingBase {
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
