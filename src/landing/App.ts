import { HTMLPropsMixin } from '@html-props/core';
import { LandingPage } from './views/LandingPage.ts';
import { DocsPage } from './views/DocsPage.ts';
import { ThemeService } from './services/ThemeService.ts';

export class App extends HTMLPropsMixin(HTMLElement, {
  route: { type: String, default: '/' },
}) {
  connectedCallback() {
    // Initialize theme
    ThemeService.getInstance();

    // @ts-ignore: Mixin implements connectedCallback
    super.connectedCallback();

    const handlePopState = () => {
      this.route = window.location.pathname;
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);

    // Intercept link clicks
    this.addEventListener('click', (e: MouseEvent) => {
      const target = e.composedPath().find((el: any) => el.tagName === 'A') as HTMLAnchorElement;
      if (target && target.href && target.origin === window.location.origin) {
        // Allow hash links on the same page to work natively
        if (target.pathname === window.location.pathname && target.hash) {
          return;
        }

        e.preventDefault();
        const path = target.pathname;
        if (path !== window.location.pathname) {
          window.history.pushState({}, '', path);
          handlePopState();
        }
      }
    });

    // Initial route
    handlePopState();
  }

  render(): Node | Node[] | null {
    // Simple router
    if (this.route.startsWith('/docs')) {
      return new DocsPage({ route: this.route });
    }

    return new LandingPage({});
  }
}

App.define('app-root');
