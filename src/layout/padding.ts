import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';

const config: {
  padding: Prop<string>;
  style: { display: string };
} = {
  padding: prop('0'),
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
  render() {
    this.style.padding = this.padding;
  }
}
Padding.define('layout-padding');
