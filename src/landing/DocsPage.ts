import { HTMLPropsMixin } from '@html-props/core';
import { Article, Div, H1, H2, P } from '@html-props/built-ins';
import { NavBar } from './components/NavBar.ts';
import { Sidebar } from './components/Sidebar.ts';
import { CodeBlock } from './components/CodeBlock.ts';
import { theme } from './theme.ts';

export class DocsPage extends HTMLPropsMixin(HTMLElement) {
  static props = {
    route: { type: String, default: '/docs' },
  };

  declare route: string;

  render() {
    const currentPath = this.route;
    console.log('DocsPage rendering with path:', currentPath);

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
            { label: 'GitHub', href: 'https://github.com/html-props/core' },
          ],
        }),
        new Div({
          style: {
            display: 'flex',
            maxWidth: '1400px',
            margin: '0 auto',
          },
          content: [
            new Sidebar({
              items: [
                { label: 'Introduction', href: '#/docs', active: currentPath === '/docs' || currentPath === '/docs/' },
                { label: 'Installation', href: '#/docs/installation', active: currentPath === '/docs/installation' },
                { label: 'Basic Usage', href: '#/docs/usage', active: currentPath === '/docs/usage' },
                { label: 'API Reference', href: '#/docs/api', active: currentPath === '/docs/api' },
              ],
            }),
            this.renderContent(currentPath),
          ],
        }),
      ],
    });
  }

  renderContent(path: string) {
    if (path === '/docs/installation') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'Installation',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'You can install @html-props/core via JSR or import it directly from a CDN.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new H2({ textContent: 'Using Deno', style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' } }),
          new CodeBlock({ code: 'deno add @html-props/core' }),
          new H2({ textContent: 'Using npm', style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' } }),
          new CodeBlock({ code: 'npx jsr add @html-props/core' }),
          new H2({
            textContent: 'CDN (ES Modules)',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new CodeBlock({ code: "import { HTMLPropsMixin } from 'https://esm.sh/@html-props/core';" }),
        ],
      });
    }

    if (path === '/docs/usage') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'Basic Usage',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'Create a new component by extending HTMLPropsMixin(HTMLElement).',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `import { HTMLPropsMixin } from '@html-props/core';
import { Div, Button } from '@html-props/built-ins';

class Counter extends HTMLPropsMixin(HTMLElement) {
  static props = {
    count: { type: Number, default: 0 }
  };

  render() {
    return new Div({
      content: [
        new Div({ textContent: \`Count: \${this.count}\` }),
        new Button({
          textContent: 'Increment',
          onclick: () => this.count++
        })
      ]
    });
  }
}

Counter.define('my-counter');`,
          }),
        ],
      });
    }

    if (path === '/docs/api') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'API Reference',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new H2({
            textContent: 'HTMLPropsMixin(Base)',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent: 'The core mixin that adds reactivity to your Custom Elements.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new H2({
            textContent: 'static props',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'Define reactive properties. Each key becomes a property on the instance and an observed attribute.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `static props = {
  myProp: { 
    type: String, // Number, Boolean, Array, Object
    default: 'value',
    reflect: true, // Reflect to attribute
    attr: 'my-prop' // Custom attribute name
  }
}`,
          }),
        ],
      });
    }

    // Default: Introduction
    return new Article({
      style: {
        flex: '1',
        padding: '3rem 4rem',
        maxWidth: '800px',
      },
      content: [
        new H1({
          textContent: 'Introduction',
          style: {
            fontSize: '2.5rem',
            marginBottom: '1.5rem',
            color: theme.colors.text,
          },
        }),
        new P({
          textContent:
            '@html-props/core is a lightweight, zero-dependency library for building reactive Custom Elements. It provides a simple, declarative API for defining properties, handling attributes, and rendering content.',
          style: {
            fontSize: '1.1rem',
            lineHeight: '1.7',
            marginBottom: '2rem',
            color: '#94a3b8',
          },
        }),
        new H2({
          textContent: 'Why html-props?',
          style: {
            fontSize: '1.8rem',
            marginTop: '3rem',
            marginBottom: '1rem',
          },
        }),
        new P({
          textContent:
            'Most web component libraries are either too heavy, require a build step, or introduce complex abstractions. html-props aims to be the sweet spot: simple enough to understand in minutes, but powerful enough for real applications.',
          style: {
            lineHeight: '1.7',
            marginBottom: '1.5rem',
            color: '#94a3b8',
          },
        }),
        new CodeBlock({
          code: `import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement) {
  static props = {
    name: { type: String, default: 'World' }
  };

  render() {
    return new Div({ textContent: \`Hello, \${this.name}!\` });
  }
}`,
        }),
      ],
    });
  }
}

DocsPage.define('docs-page');
