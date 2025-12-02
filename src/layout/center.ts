import { HTMLPropsMixin } from '@html-props/core';

export class Center extends HTMLPropsMixin(HTMLElement, {
  style: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
}) {}

Center.define('layout-center');
