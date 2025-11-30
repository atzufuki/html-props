import { HTMLPropsMixin } from '@html-props/core';
import { LandingPage } from './views/LandingPage.ts';
import { DocsPage } from './views/DocsPage.ts';

export class App extends HTMLPropsMixin(HTMLElement, {
  route: { type: String, default: '/' },
}) {
  connectedCallback() {
    // @ts-ignore: Mixin implements connectedCallback
    super.connectedCallback();

    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      console.log('Hash changed:', hash);
      let path = hash.substring(1); // remove #
      if (path.endsWith('/') && path.length > 1) {
        path = path.slice(0, -1);
      }
      this.route = path;
      console.log('Route updated:', this.route);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);

    // Initial route
    handleHashChange();
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
