import { HTMLPropsMixin } from '@html-props/core';
import { Div } from '@html-props/built-ins';
import { NavBar } from '../components/NavBar.ts';
import { Sidebar } from '../components/Sidebar.ts';
import { MarkdownViewer } from '../components/MarkdownViewer.ts';
import { MarkdownService, type SidebarItem } from '../services/MarkdownService.ts';
import { theme } from '../theme.ts';

export class DocsPage extends HTMLPropsMixin(HTMLElement, {
  route: { type: String, default: '/docs' },
}) {
  private service = MarkdownService.getInstance();
  private sidebarItems: SidebarItem[] = [];
  private loading = true;

  connectedCallback() {
    super.connectedCallback();
    this.loadSidebar();
  }

  async loadSidebar() {
    try {
      this.sidebarItems = await this.service.getSidebarItems();
    } catch (e) {
      console.error('Failed to load sidebar', e);
      // Fallback
      this.sidebarItems = [
        { label: 'Introduction', file: 'introduction.md' },
        { label: 'Installation', file: 'installation.md' },
      ];
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  render() {
    const currentPath = this.route;

    if (this.loading) {
      return new Div({
        style: { padding: '2rem', color: theme.colors.text },
        textContent: 'Loading documentation...',
      });
    }

    const sidebarItems = this.sidebarItems.map((item) => {
      const name = item.file.replace('.md', '');
      const href = name === 'introduction' ? '#/docs' : `#/docs/${name}`;
      const isActive = currentPath === href.replace('#', '') || (name === 'introduction' && currentPath === '/docs/');

      return {
        label: item.label,
        href,
        active: isActive,
      };
    });

    return new Div({
      style: {
        minHeight: '100vh',
        backgroundColor: theme.colors.bg,
        color: theme.colors.text,
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
        new Div({
          style: {
            display: 'flex',
            maxWidth: '1400px',
            margin: '0 auto',
          },
          content: [
            new Sidebar({ items: sidebarItems }),
            this.renderContent(currentPath),
          ],
        }),
      ],
    });
  }

  renderContent(path: string) {
    // Extract page name from path: /docs/foo -> foo
    let page = path.replace('/docs', '').replace(/^\//, '');
    if (!page) page = 'introduction';

    // Ensure the page exists in our manifest (security/validity check)
    // If not found, default to introduction or show 404 (here we just show it and let MarkdownViewer handle error)
    // But we need to pass the filename 'foo' -> 'foo' (MarkdownViewer appends .md? No, MarkdownViewer takes 'src')
    // Wait, MarkdownViewer takes 'src' which is the filename without extension in previous implementation?
    // Let's check MarkdownViewer.loadDoc: `url = .../${page}.md`
    // So we pass 'foo'.

    return new MarkdownViewer({
      src: page,
      style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
    });
  }
}

DocsPage.define('docs-page');
