import { HTMLPropsMixin, prop } from '@html-props/core';
import { Button, Option, Select } from '@html-props/built-ins';
import { Column, Container, MediaQuery, Responsive, Row } from '@html-props/layout';
import { signal } from '@html-props/signals';
import { NavBar } from '../components/NavBar.ts';
import { Sidebar } from '../components/Sidebar.ts';
import { MarkdownViewer } from '../components/MarkdownViewer.ts';
import { Text } from '../components/Typography.ts';
import { type DocVersion, MarkdownService, type SidebarItem } from '../services/MarkdownService.ts';
import { theme } from '../theme.ts';

export class DocsPage extends HTMLPropsMixin(HTMLElement, {
  route: prop('/docs'),
}) {
  private service = MarkdownService.getInstance();
  private sidebarItems: SidebarItem[] = [];
  private versions: DocVersion[] = [];
  private selectedVersion = signal('local');
  private loading = true;
  private error = signal<string | null>(null);
  private showMobileSidebar = signal(false);

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    try {
      this.error.set(null);
      this.versions = await this.service.getVersions();
      // Default to first version if not local
      if (this.versions.length > 0 && !this.versions.some((v) => v.ref === 'local')) {
        this.selectedVersion.set(this.versions[0].ref);
      }
      await this.loadSidebar();
    } catch (e: any) {
      console.error('Failed to load data', e);
      this.error.set(e.message || 'Failed to load documentation data');
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  async loadSidebar() {
    try {
      this.loading = true;
      this.error.set(null);
      this.requestUpdate();
      this.sidebarItems = await this.service.getSidebarItems(this.selectedVersion());
    } catch (e: any) {
      console.error('Failed to load sidebar', e);
      this.sidebarItems = [];
      this.error.set(e.message || 'Failed to load sidebar');
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  handleVersionChange(version: string) {
    this.selectedVersion.set(version);
    this.loadSidebar();
  }

  render() {
    const currentPath = this.route;
    console.log(
      'DocsPage render. Error:',
      this.error(),
      'Loading:',
      this.loading,
      'Sidebar items:',
      this.sidebarItems.length,
    );

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

    const sidebar = new Sidebar({
      items: sidebarItems,
    });

    return new Container({
      color: theme.colors.bg,
      style: {
        minHeight: '100vh',
        fontFamily: theme.fonts.sans,
        transition: 'background-color 0.3s, color 0.3s',
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
            },
            content: [
              sidebar,
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
        this.renderVersionFab(),
      ],
    });
  }

  renderVersionFab() {
    if (!this.versions || this.versions.length === 0) return null;

    return new Container({
      style: {
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: '100',
        backgroundColor: theme.colors.secondaryBg,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '0.5rem',
        padding: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      content: new Select({
        style: {
          backgroundColor: 'transparent',
          color: theme.colors.text,
          border: 'none',
          outline: 'none',
          fontSize: '0.9rem',
          cursor: 'pointer',
          paddingRight: '0.5rem',
        },
        onchange: (e: Event) => {
          const target = e.target as HTMLSelectElement;
          this.handleVersionChange(target.value);
        },
        content: this.versions.map((v) =>
          new Option({
            value: v.ref,
            textContent: v.label,
            selected: v.ref === this.selectedVersion(),
          })
        ),
      }),
    });
  }

  renderContent(path: string) {
    if (this.error()) {
      return this.renderError();
    }

    if (this.loading && this.sidebarItems.length === 0) {
      return new Container({
        padding: '2rem',
        content: new Text({ text: 'Loading documentation...' }),
      });
    }

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

  renderError() {
    return new Container({
      padding: '2rem',
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        color: theme.colors.text,
        width: '100%',
      },
      content: [
        new Text({
          text: 'Oops! Something went wrong.',
          tag: 'h2',
          style: { marginBottom: '1rem' },
        }),
        new Text({
          text: this.error()!,
          style: { color: 'red', marginBottom: '1.5rem' },
        }),
        new Button({
          textContent: 'Retry',
          style: {
            padding: '0.5rem 1rem',
            backgroundColor: theme.colors.accent,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          },
          onclick: () => this.loadData(),
        }),
      ],
    });
  }
}

DocsPage.define('docs-page');
