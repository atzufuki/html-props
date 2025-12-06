import { HTMLPropsMixin } from '@html-props/core';
import { MediaQuery } from './media_query.ts';

export class Responsive extends HTMLPropsMixin(HTMLElement, {
  mobile: { type: Object, default: null },
  tablet: { type: Object, default: null },
  desktop: { type: Object, default: null },
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
