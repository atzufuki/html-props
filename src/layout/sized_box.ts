import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';
import { effect } from '@html-props/signals';

const config: {
  width: Prop<string>;
  height: Prop<string>;
  style: { display: string };
} = {
  width: prop(''),
  height: prop(''),
  style: { display: 'block' },
};

const SizedBoxBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class SizedBox extends SizedBoxBase {
  private _dispose: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this._dispose = effect(() => {
      const w = this.width;
      const h = this.height;

      if (w) this.style.width = w;
      if (h) this.style.height = h;

      // If both are empty, it's just a 0x0 box?
      // Flutter SizedBox can be used as a spacer.
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
SizedBox.define('layout-sized-box');
