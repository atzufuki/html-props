import { HTMLPropsMixin } from '@html-props/core';
import { A, Span } from '@html-props/built-ins';
import { Container, Row } from '@html-props/layout';
import { theme } from '../theme.ts';

export class NavBar extends HTMLPropsMixin(HTMLElement, {
  links: { type: Array, default: [] as Array<{ label: string; href: string }> },
}) {
  render() {
    return new Container({
      padding: '1.5rem 2rem',
      color: 'rgba(15, 23, 42, 0.8)',
      style: {
        borderBottom: `1px solid ${theme.colors.border}`,
        position: 'sticky',
        top: '0',
        backdropFilter: 'blur(8px)',
        zIndex: '100',
      },
      content: new Row({
        mainAxisAlignment: 'spaceBetween',
        crossAxisAlignment: 'center',
        content: [
          new Row({
            crossAxisAlignment: 'center',
            gap: '0.5rem',
            style: {
              fontWeight: '700',
              fontSize: '1.25rem',
            },
            content: [
              new Span({
                textContent: '</>',
                style: { color: theme.colors.accent },
              }),
              document.createTextNode(' HTML Props'),
            ],
          }),
          new Row({
            gap: '2rem',
            content: this.links.map((link) =>
              new A({
                href: link.href,
                textContent: link.label,
                style: {
                  color: theme.colors.text,
                  fontWeight: '500',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                },
                // Simple hover effect via mouse events since we can't use CSS :hover
                onmouseover: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.accent,
                onmouseout: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.text,
              })
            ),
          }),
        ],
      }),
    });
  }
}

NavBar.define('app-navbar');
