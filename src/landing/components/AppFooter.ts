import { HTMLPropsMixin, prop } from '@html-props/core';
import { Footer } from '@html-props/built-ins';
import { Text } from './Typography.ts';
import { theme } from '../theme.ts';

export class AppFooter extends HTMLPropsMixin(HTMLElement, {
  copyright: prop('© 2025 HTML Props. MIT License.'),
}) {
  render() {
    return new Footer({
      style: {
        padding: '2rem',
        textAlign: 'center',
        borderTop: `1px solid ${theme.colors.border}`,
      },
      content: new Text({
        text: this.copyright,
        variant: 'small',
        align: 'center',
      }),
    });
  }
}
AppFooter.define('app-footer');
