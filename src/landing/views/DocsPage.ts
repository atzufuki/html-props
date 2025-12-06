import { HTMLPropsMixin, prop } from '@html-props/core';
import { Button } from '@html-props/built-ins';
import { Column, Container, MediaQuery, Responsive, Row } from '@html-props/layout';
import { signal } from '@html-props/signals';
import { NavBar } from '../components/NavBar.ts';
import { Sidebar } from '../components/Sidebar.ts';
import { MarkdownViewer } from '../components/MarkdownViewer.ts';
import { Text } from '../components/Typography.ts';
import { MarkdownService, type SidebarItem } from '../services/MarkdownService.ts';
import { theme } from '../theme.ts';

export class DocsPage extends HTMLPropsMixin(HTMLElement, {
  route: prop('/docs'),
}) {
  private service = MarkdownService.getInstance();
  private sidebarItems: SidebarItem[] = [];
  private loading = true;
  private showMobileSidebar = signal(false);

  connectedCallback() {
    super.connectedCallback();
    this.loadSidebar();
  }

  async loadSidebar() {
    try {
      this.sidebarItems = await this.service.getSidebarItems();
    } catch (e) {
      console.error('Failed to load sidebar', e);
      this.sidebarItems = [];
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  render() {
    const currentPath = this.route;

    if (this.loading) {
      return new Container({
        padding: '2rem',
        content: new Text({ text: 'Loading documentation...' }),
      });
    }

    // Determine active page
    let activePage = currentPath.replace('/docs', '').replace(/^\//, '');
    if (!activePage && this.sidebarItems.length > 0) {
      activePage = this.sidebarItems[0].file.replace('.md', '');
    }

    const sidebarItems = this.sidebarItems.map((item) => {
      const name = item.file.replace('.md', '');
      const href = `#/docs/${name}`;
      const isActive = name === activePage;

      return {
        label: item.label,
        href,
        active: isActive,
      };
    });

    return new Container({
      color: theme.colors.bg,
      style: {
        minHeight: '100vh',
        fontFamily: theme.fonts.sans,
      },
      content: [
        new NavBar({
          links: [
            { label: 'Home', href: '#/' },
            { label: 'Documentation', href: '#/docs' },
            { label: 'GitHub', href: 'https://github.com/atzufuki/html-props' },
          ],
        }),
        new Responsive({
          // desktop: row,
          desktop: new Row({
            crossAxisAlignment: 'start',
            style: {
              maxWidth: '1400px',
              margin: '0 auto',
            },
            content: [
              new Sidebar({ items: sidebarItems }),
              this.renderContent(currentPath),
            ],
          }),
          mobile: new Column({
            content: [
              new Container({
                padding: '1rem',
                style: { borderBottom: `1px solid ${theme.colors.border}` },
                content: new Button({
                  textContent: this.showMobileSidebar() ? 'Hide Menu' : 'Show Menu',
                  style: {
                    background: theme.colors.secondaryBg,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                  },
                  onclick: () => this.showMobileSidebar.update((v) => !v),
                }),
              }),
              this.showMobileSidebar() ? new Sidebar({ items: sidebarItems }) : null,
              this.renderContent(currentPath),
            ],
          }),
        }),
      ],
    });
  }

  renderContent(path: string) {
    let page = path.replace('/docs', '').replace(/^\//, '');

    if (!page && this.sidebarItems.length > 0) {
      page = this.sidebarItems[0].file.replace('.md', '');
    }

    if (!page) return null;

    const isMobile = MediaQuery.isMobile();

    return new MarkdownViewer({
      src: page,
      style: {
        flex: '1',
        padding: isMobile ? '1rem' : '3rem 4rem',
        maxWidth: '800px',
        width: '100%',
      },
    });
  }
}

DocsPage.define('docs-page');
