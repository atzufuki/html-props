import { HTMLPropsMixin } from '@html-props/core';
import { A } from '@html-props/built-ins';
import { Column, Container } from '@html-props/layout';
import { theme } from '../theme.ts';

interface SidebarLink {
  label: string;
  href: string;
  active?: boolean;
}

export class Sidebar extends HTMLPropsMixin(HTMLElement, {
  items: { type: Array, default: [] as SidebarLink[] },
}) {
  render() {
    return new Container({
      width: '250px',
      padding: '2rem 1rem',
      color: theme.colors.bg,
      style: {
        borderRight: `1px solid ${theme.colors.border}`,
        height: 'calc(100vh - 80px)', // Adjust based on navbar height
        position: 'sticky',
        top: '80px',
        overflowY: 'auto',
      },
      content: new Column({
        gap: '0.5rem',
        content: this.items.map((item) =>
          new A({
            href: item.href,
            textContent: item.label,
            style: {
              display: 'block',
              padding: '0.5rem 1rem',
              color: item.active ? theme.colors.accent : theme.colors.text,
              textDecoration: 'none',
              backgroundColor: item.active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              borderRadius: '0.25rem',
              fontWeight: item.active ? '600' : '400',
              transition: 'all 0.2s ease',
            },
          })
        ),
      }),
    });
  }
}

Sidebar.define('docs-sidebar');
