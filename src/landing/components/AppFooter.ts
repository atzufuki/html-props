import { HTMLPropsMixin, prop } from '@html-props/core';
import { Footer } from '@html-props/built-ins';
import { Typography } from './Typography.ts';
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
      content: new Typography({
        text: this.copyright,
        variant: 'bodyMedium',
        align: 'center',
        color: '#64748b',
        style: { fontSize: '0.9rem' },
      }),
    });
  }
}
AppFooter.define('app-footer');
