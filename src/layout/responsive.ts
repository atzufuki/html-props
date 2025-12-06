import { HTMLPropsMixin, prop } from '@html-props/core';
import { MediaQuery } from './media_query.ts';

export class Responsive extends HTMLPropsMixin(HTMLElement, {
  mobile: prop<any>(null),
  tablet: prop<any>(null),
  desktop: prop<any>(null),
}) {
  render() {
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
