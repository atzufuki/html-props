import { HTMLPropsMixin } from '@html-props/core';
import { A, Aside, Li, Nav, Ul } from '@html-props/built-ins';
import { theme } from '../theme.ts';

interface SidebarLink {
  label: string;
  href: string;
  active?: boolean;
}

interface SidebarProps {
  items: SidebarLink[];
}

export class Sidebar extends HTMLPropsMixin<typeof HTMLElement, SidebarProps>(HTMLElement) {
  static props = {
    items: { type: Array, default: [] },
  };

  declare items: SidebarLink[];

  render() {
    console.log('Sidebar rendering items:', this.items);
    return new Aside({
      style: {
        width: '250px',
        borderRight: `1px solid ${theme.colors.border}`,
        height: 'calc(100vh - 80px)', // Adjust based on navbar height
        position: 'sticky',
        top: '80px',
        overflowY: 'auto',
        padding: '2rem 1rem',
        backgroundColor: theme.colors.bg,
      },
      content: new Nav({
        content: new Ul({
          style: {
            listStyle: 'none',
            padding: '0',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          },
          content: this.items.map((item) =>
            new Li({
              content: new A({
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
                // Simple hover effect via style object isn't fully supported yet without CSS or events,
                // but we can add basic styles.
              }),
            })
          ),
        }),
      }),
    });
  }
}

Sidebar.define('docs-sidebar');
