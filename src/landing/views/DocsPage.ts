import { HTMLPropsMixin, prop, ref } from '@html-props/core';
import { Column, Container, Responsive, Row } from '@html-props/layout';
import { Button, Div, Option, Select } from '@html-props/built-ins';
import { batch, signal } from '@html-props/signals';
import { NavBar } from '../components/NavBar.ts';
import { Sidebar } from '../components/Sidebar.ts';
import { MarkdownViewer } from '../components/MarkdownViewer.ts';
import { type DocVersion, MarkdownService, type SidebarItem } from '../services/MarkdownService.ts';
import { theme } from '../theme.ts';

export class DocsPage extends HTMLPropsMixin(HTMLElement, {
  route: prop('/docs'),
}) {
  // Services
  private service = MarkdownService.getInstance();

  // State
  private versions = signal<DocVersion[]>([]);
  private sidebarItems = signal<SidebarItem[]>([]);
  private error = signal<string | null>(null);
  private showMobileMenu = signal(false);

  // Refs
  private desktopSidebarRef = ref<Sidebar>();
  private mobileSidebarRef = ref<Sidebar>();

  async mountedCallback() {
    const fetchedVersions = await this.service.getVersions();

    // Ensure 'local' is present in dev environment
    const detected = this.service.resolveVersion('local');
    if (detected === 'local' && !fetchedVersions.some((v) => v.ref === 'local')) {
      fetchedVersions.unshift({ label: 'Local', ref: 'local' });
    }

    const version = this.resolveContext(fetchedVersions).version || 'main';

    const items = await this.service.getSidebarItems(version);

    batch(() => {
      this.versions.set(fetchedVersions);
      this.sidebarItems.set(items);
    });

    // Effect: Close mobile menu on route change
    // effect(() => {
    //   this.route; // Track route
    //   untracked(() => this.showMobileMenu.set(false));
    // });
  }

  /**
   * Resolves the current version and page from the route and available versions.
   * This is "Derived State" - no need for a separate signal.
   */
  private resolveContext(versions: DocVersion[]) {
    const route = this.route;

    const cleanPath = route.replace('/docs', '').replace(/^\//, '');
    const parts = cleanPath.split('/');
    const firstPart = parts[0];

    // Check if URL starts with a valid version (or 'local'/'main')
    const isExplicitVersion = versions.some((v) => v.ref === firstPart) || firstPart === 'local' ||
      firstPart === 'main';

    let version = isExplicitVersion ? firstPart : null;
    let page = isExplicitVersion ? parts.slice(1).join('/') : cleanPath;

    // Fallback: Default to first available version if none in URL
    if (!version && versions.length > 0) {
      version = versions[0].ref;
    }

    return { version, page, isExplicitVersion };
  }

  private handleVersionChange(newVersion: string) {
    const { page } = this.resolveContext(this.versions());
    const items = this.sidebarItems();

    // Try to keep on the same page, otherwise go to root of new version
    const targetPage = page || (items.length > 0 ? items[0].file.replace('.md', '') : '');
    const newPath = `/docs/${newVersion}/${targetPage}`;

    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  render() {
    const { version, page } = this.resolveContext(this.versions());
    const items = this.sidebarItems();
    const error = this.error();

    // Calculate active page fallback
    const activePage = page || (items.length > 0 ? items[0].file.replace('.md', '') : '');

    // Process sidebar items with active state
    const navItems = items.map((item) => ({
      label: item.label,
      href: `/docs/${version}/${item.file.replace('.md', '')}`,
      active: item.file.replace('.md', '') === activePage,
    }));

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
          desktop: this.renderDesktop(navItems, activePage, version, error),
          mobile: this.renderMobile(navItems, activePage, version, error),
        }),
        this.renderVersionSelector(version || 'main'),
      ],
    });
  }

  private renderDesktop(navItems: any[], activePage: string, version: string | null, error: string | null) {
    return new Row({
      crossAxisAlignment: 'start',
      style: { maxWidth: '1400px' },
      content: [
        new Sidebar({
          ref: this.desktopSidebarRef,
          items: navItems,
        }),
        new Container({
          padding: '0 2rem',
          style: { flex: '1', width: '100%', minWidth: '0' },
          content: activePage
            ? new MarkdownViewer({
              src: activePage,
              version: version || 'main',
              style: { display: error ? 'none' : 'block' },
            })
            : null,
        }),
      ],
    });
  }

  private renderMobile(navItems: any[], activePage: string, version: string | null, error: string | null) {
    const isOpen = this.showMobileMenu();

    return new Column({
      content: [
        new Container({
          padding: '1rem',
          style: {
            borderBottom: `1px solid ${theme.colors.border}`,
            display: 'flex',
            justifyContent: 'flex-end',
          },
          content: new Button({
            textContent: isOpen ? 'Close Menu' : 'Show Menu',
            style: {
              background: theme.colors.secondaryBg,
              color: theme.colors.text,
              border: `1px solid ${theme.colors.border}`,
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            },
            onclick: () => this.showMobileMenu.update((v) => !v),
          }),
        }),
        new Div({
          style: { display: isOpen ? 'block' : 'none' },
          content: new Sidebar({
            ref: this.mobileSidebarRef,
            items: navItems,
          }),
        }),
        new Container({
          padding: '1rem',
          style: { flex: '1', width: '100%', display: isOpen ? 'none' : 'block' },
          content: activePage
            ? new MarkdownViewer({
              src: activePage,
              version: version || 'main',
              style: { display: error ? 'none' : 'block' },
            })
            : null,
        }),
      ],
    });
  }

  private renderVersionSelector(currentVersion: string) {
    const versions = this.versions();
    if (versions.length === 0) return null;

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
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      content: new Select({
        name: 'version-selector',
        style: {
          backgroundColor: 'transparent',
          color: theme.colors.text,
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          paddingRight: '0.5rem',
        },
        onchange: (e: Event) => this.handleVersionChange((e.target as HTMLSelectElement).value),
        content: versions.map((v) =>
          new Option({
            value: v.ref,
            textContent: v.label,
            selected: v.ref === currentVersion,
            style: { backgroundColor: theme.colors.secondaryBg, color: theme.colors.text },
          })
        ),
      }),
    });
  }
}

DocsPage.define('docs-page');
