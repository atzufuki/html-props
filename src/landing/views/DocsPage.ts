import { HTMLPropsMixin, prop, ref } from '@html-props/core';
import { Column, Container, Responsive, Row } from '@html-props/layout';
import { Button, Div, Option, Select } from '@html-props/built-ins';
import { effect, signal, untracked } from '@html-props/signals';
import { NavBar } from '../components/NavBar.ts';
import { Sidebar } from '../components/Sidebar.ts';
import { MarkdownViewer } from '../components/MarkdownViewer.ts';
import { type DocVersion, MarkdownService, type SidebarItem } from '../services/MarkdownService.ts';
import { theme } from '../theme.ts';

export class DocsPage extends HTMLPropsMixin(HTMLElement, {
  route: prop('/docs'),
}) {
  // State
  private service = MarkdownService.getInstance();
  private versions = signal<DocVersion[]>([]);
  private sidebarItems = signal<SidebarItem[]>([]);
  private selectedVersion = signal('local');
  private loading = signal(true);
  private error = signal<string | null>(null);
  private showMobileSidebar = signal(false);

  // Refs
  private desktopSidebarRef = ref<Sidebar>();
  private mobileSidebarRef = ref<Sidebar>();
  private desktopViewerRef = ref<MarkdownViewer>();
  private mobileViewerRef = ref<MarkdownViewer>();
  private selectRef = ref<InstanceType<typeof Select>>();
  private mobileMenuRef = ref<InstanceType<typeof Div>>();
  private versionFabRef = ref<InstanceType<typeof Container>>();

  connectedCallback() {
    super.connectedCallback();

    // Sync route prop to selectedVersion signal
    effect(() => {
      const { version } = this.parseRoute(this.route);
      if (version && version !== this.selectedVersion()) {
        this.selectedVersion.set(version);
      }
    });

    // Load sidebar when version changes
    effect(() => {
      const version = this.selectedVersion();
      untracked(() => {
        this.loadSidebar(version);
      });
    });

    this.loadData();
  }

  private parseRoute(route: string) {
    const cleanPath = route.replace('/docs', '').replace(/^\//, '');
    if (!cleanPath) return { version: null, page: '' };

    const parts = cleanPath.split('/');
    const firstPart = parts[0];

    // Check if the first segment matches a known version
    // We also treat 'local' as a version explicitly to handle initial load before versions are fetched
    const isVersion = this.versions().some((v) => v.ref === firstPart) || firstPart === 'local' || firstPart === 'main';

    if (isVersion) {
      return { version: firstPart, page: parts.slice(1).join('/') };
    }

    return { version: null, page: cleanPath };
  }

  async loadData() {
    try {
      this.error.set(null);
      const versions = await this.service.getVersions();

      const detectedVersion = this.service.resolveVersion('local');
      // Always add 'local' version if we are in a local environment
      if (detectedVersion === 'local' && !versions.some((v) => v.ref === 'local')) {
        versions.unshift({ label: 'Local', ref: 'local' });
      }

      this.versions.set(versions);

      const { version } = this.parseRoute(this.route);

      if (version) {
        this.selectedVersion.set(version);
      } else if (detectedVersion !== 'local' && detectedVersion !== 'main') {
        this.selectedVersion.set(detectedVersion);
        // Add to versions list if missing
        if (!versions.some((v) => v.ref === detectedVersion)) {
          this.versions.update((v) => [{ label: detectedVersion, ref: detectedVersion }, ...v]);
        }
      } else if (versions.length > 0 && !versions.some((v) => v.ref === 'local')) {
        this.selectedVersion.set(versions[0].ref);
      }
    } catch (e: any) {
      console.error('Failed to load data', e);
      this.error.set(e.message || 'Failed to load documentation data');
    }
  }

  async loadSidebar(version: string) {
    try {
      const cached = this.service.getSidebarItemsSync(version);
      if (cached) {
        this.sidebarItems.set(cached);
        this.error.set(null);
        this.loading.set(false);
        return;
      }

      if (!this.loading()) this.loading.set(true);

      const items = await this.service.getSidebarItems(version);
      this.sidebarItems.set(items);
      this.error.set(null);
    } catch (e: any) {
      console.error('Failed to load sidebar', e);
      this.sidebarItems.set([]);
      this.error.set(e.message || 'Failed to load sidebar');
    } finally {
      this.loading.set(false);
    }
  }

  handleVersionChange(version: string) {
    const { page } = this.parseRoute(this.route);
    const items = this.sidebarItems();
    // If page is empty, go to root of that version
    const targetPage = page || (items.length > 0 ? items[0].file.replace('.md', '') : '');
    const newPath = `/docs/${version}/${targetPage}`;
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  // Declarative render
  render() {
    // Track dependencies for initial render
    const route = this.route;
    const versions = this.versions();
    const items = this.sidebarItems();
    const version = this.selectedVersion();
    const showMobile = this.showMobileSidebar();
    const error = this.error();

    const { page } = this.parseRoute(route);
    const activePage = page || (items.length > 0 ? items[0].file.replace('.md', '') : '');

    // Prepare Sidebar Items with active state
    const processedItems = items.map((item) => {
      const name = item.file.replace('.md', '');
      return {
        label: item.label,
        href: `/docs/${version}/${name}`,
        active: name === activePage,
      };
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
          desktop: new Row({
            crossAxisAlignment: 'start',
            style: { maxWidth: '1400px' },
            content: [
              new Sidebar({
                ref: this.desktopSidebarRef,
                items: processedItems,
              }),
              new Container({
                padding: '0 2rem',
                style: { flex: '1', width: '100%' },
                content: new MarkdownViewer({
                  ref: this.desktopViewerRef,
                  src: activePage,
                  version: version,
                  style: {
                    display: error ? 'none' : 'block',
                  },
                }),
              }),
            ],
          }),
          mobile: new Column({
            content: [
              new Container({
                padding: '1rem',
                style: { borderBottom: `1px solid ${theme.colors.border}` },
                content: new Button({
                  textContent: 'Menu',
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
              new Div({
                ref: this.mobileMenuRef,
                content: new Sidebar({
                  ref: this.mobileSidebarRef,
                  items: processedItems,
                }),
                style: { display: showMobile ? 'block' : 'none' },
              }),
              new Container({
                padding: '0 2rem',
                style: { flex: '1', width: '100%' },
                content: new MarkdownViewer({
                  ref: this.mobileViewerRef,
                  src: activePage,
                  version: version,
                  style: {
                    display: error ? 'none' : 'block',
                  },
                }),
              }),
            ],
          }),
        }),
        new Container({
          ref: this.versionFabRef,
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
            display: versions.length > 0 ? 'block' : 'none',
          },
          content: new Select({
            ref: this.selectRef,
            name: 'version-selector',
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
            content: versions.map((v) =>
              new Option({
                value: v.ref,
                textContent: v.label,
                selected: v.ref === version,
                style: {
                  backgroundColor: theme.colors.secondaryBg,
                  color: theme.colors.text,
                },
              })
            ),
          }),
        }),
      ],
    });
  }
}

DocsPage.define('docs-page');
