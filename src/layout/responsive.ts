import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';
import { MediaQuery } from './media_query.ts';

const config: {
  mobile: Prop<any>;
  tablet: Prop<any>;
  desktop: Prop<any>;
} = {
  mobile: prop<any>(null),
  tablet: prop<any>(null),
  desktop: prop<any>(null),
};

const ResponsiveBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class Responsive extends ResponsiveBase {
  render(): any {
    if (MediaQuery.isMobile()) {
      return this.mobile || this.tablet || this.desktop;
    }
    if (MediaQuery.isTablet()) {
      return this.tablet || this.desktop || this.mobile;
    }
    return this.desktop || this.tablet || this.mobile;
  }
}

Responsive.define('layout-responsive');
