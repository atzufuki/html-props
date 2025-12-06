import { HTMLPropsMixin, prop } from '@html-props/core';
import { A } from '@html-props/built-ins';
import { Column, Container, Responsive } from '@html-props/layout';
import { theme } from '../theme.ts';

interface SidebarLink {
  label: string;
  href: string;
  active?: boolean;
}

export class Sidebar extends HTMLPropsMixin(HTMLElement, {
  items: prop<SidebarLink[]>([], { type: Array }),
}) {
  render() {
    return new Responsive({
      desktop: this.renderContent('250px', 'sticky'),
      mobile: this.renderContent('100%', 'static'),
    });
  }

  renderContent(width: string, position: string) {
    return new Container({
      width: width,
      padding: '2rem 1rem',
      color: theme.colors.bg,
      style: {
        borderRight: position === 'sticky' ? `1px solid ${theme.colors.border}` : 'none',
        borderBottom: position === 'static' ? `1px solid ${theme.colors.border}` : 'none',
        height: position === 'sticky' ? 'calc(100vh - 80px)' : 'auto',
        position: position,
        top: position === 'sticky' ? '80px' : 'auto',
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
