import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';

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
  render() {
    const w = this.width;
    const h = this.height;

    if (w) this.style.width = w;
    if (h) this.style.height = h;
  }
}
SizedBox.define('layout-sized-box');
