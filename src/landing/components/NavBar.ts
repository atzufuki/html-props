import { HTMLPropsMixin } from '@html-props/core';
import { A, Div, Header, Li, Nav, Span, Ul } from '@html-props/built-ins';
import { theme } from '../theme.ts';

interface NavBarProps {
  links: Array<{ label: string; href: string }>;
}

export class NavBar extends HTMLPropsMixin<typeof HTMLElement, NavBarProps>(HTMLElement) {
  static props = {
    links: { type: Array, default: [] },
  };

  declare links: Array<{ label: string; href: string }>;

  render() {
    return new Header({
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem',
        borderBottom: `1px solid ${theme.colors.border}`,
        position: 'sticky',
        top: '0',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: '100',
      },
      content: [
        new Div({
          style: {
            fontWeight: '700',
            fontSize: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          },
          content: [
            new Span({
              textContent: '</>',
              style: { color: theme.colors.accent },
            }),
            ' HTML Props',
          ],
        }),
        new Nav({
          content: new Ul({
            style: {
              display: 'flex',
              gap: '2rem',
              listStyle: 'none',
              margin: '0',
              padding: '0',
            },
            content: this.links.map((link) =>
              new Li({
                content: new A({
                  href: link.href,
                  textContent: link.label,
                  style: {
                    color: theme.colors.text,
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  },
                  // Simple hover effect via mouse events since we can't use CSS :hover
                  onMouseOver: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.accent,
                  onMouseOut: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.text,
                }),
              })
            ),
          }),
        }),
      ],
    });
  }
}

NavBar.define('app-navbar');
