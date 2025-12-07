import { HTMLPropsMixin, prop } from '@html-props/core';
import { Button, Div, Option, Select } from '@html-props/built-ins';
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

  private parseRoute(route: string) {
    const cleanPath = route.replace('/docs', '').replace(/^\//, '');
    if (!cleanPath) return { version: null, page: '' };

    const parts = cleanPath.split('/');
    const firstPart = parts[0];

    // Check if the first segment matches a known version
    // We can only do this reliably if versions are loaded.
    // If not loaded, we assume it might be a version if it looks like one,
    // but relying on this.versions is safer.
    const isVersion = this.versions.some((v) => v.ref === firstPart);

    if (isVersion) {
      return { version: firstPart, page: parts.slice(1).join('/') };
    }

    return { version: null, page: cleanPath };
  }

  async loadData() {
    try {
      this.error.set(null);
      this.versions = await this.service.getVersions();

      const { version } = this.parseRoute(this.route);

      if (version) {
        this.selectedVersion.set(version);
      } else if (this.versions.length > 0 && !this.versions.some((v) => v.ref === 'local')) {
        // If no version in URL, default to first (usually latest)
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
      const cached = this.service.getSidebarItemsSync(this.selectedVersion());
      if (cached) {
        this.sidebarItems = cached;
        this.error.set(null);
        this.requestUpdate();
        return;
      }

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
    const { page } = this.parseRoute(this.route);
    // If page is empty, go to root of that version
    const targetPage = page || (this.sidebarItems.length > 0 ? this.sidebarItems[0].file.replace('.md', '') : '');
    const newPath = `/docs/${version}/${targetPage}`;
    window.history.pushState({}, '', newPath);
    // Manually trigger route update since pushState doesn't fire popstate
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  render() {
    const currentPath = this.route;

    // Determine active page
    let { page: activePage } = this.parseRoute(currentPath);
    if (!activePage && this.sidebarItems.length > 0) {
      activePage = this.sidebarItems[0].file.replace('.md', '');
    }

    const sidebarItems = this.sidebarItems.map((item) => {
      const name = item.file.replace('.md', '');
      const version = this.selectedVersion();
      const href = `/docs/${version}/${name}`;
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
            { label: 'Home', href: '/' },
            { label: 'Documentation', href: '/docs' },
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
      return this.renderSkeleton();
    }

    let { page } = this.parseRoute(path);

    if (!page && this.sidebarItems.length > 0) {
      page = this.sidebarItems[0].file.replace('.md', '');
    }

    if (!page) return null;

    const isMobile = MediaQuery.isMobile();

    return new MarkdownViewer({
      src: page,
      style: {
        flex: '1',
        padding: isMobile ? '1rem' : '2rem 2rem',
        maxWidth: '800px',
        width: '100%',
      },
    });
  }

  renderSkeleton() {
    const lineStyle = {
      backgroundColor: theme.colors.border,
      borderRadius: '0.25rem',
      marginBottom: '1rem',
    };

    const isMobile = MediaQuery.isMobile();

    return new Container({
      padding: isMobile ? '1rem' : '2rem 2rem',
      style: {
        maxWidth: '800px',
        width: '100%',
        // Pulse animation + FadeIn with delay to prevent flash on fast loads
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, fadeIn 0.3s 0.2s both',
      },
      content: [
        // Title
        new Div({ style: { ...lineStyle, height: '2.5rem', width: '60%', marginBottom: '2rem' } }),
        // Paragraph 1
        new Div({ style: { ...lineStyle, height: '1rem', width: '100%' } }),
        new Div({ style: { ...lineStyle, height: '1rem', width: '90%' } }),
        new Div({ style: { ...lineStyle, height: '1rem', width: '95%' } }),
        // Spacer
        new Div({ style: { height: '2rem' } }),
        // Subtitle
        new Div({ style: { ...lineStyle, height: '1.75rem', width: '40%', marginBottom: '1.5rem' } }),
        // Paragraph 2
        new Div({ style: { ...lineStyle, height: '1rem', width: '100%' } }),
        new Div({ style: { ...lineStyle, height: '1rem', width: '85%' } }),
      ],
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
