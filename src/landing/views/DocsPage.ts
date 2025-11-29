import { HTMLPropsMixin } from '@html-props/core';
import { Article, Div, H1, H2, H3, Img, Li, P, Ul } from '@html-props/built-ins';
import { NavBar } from '../components/NavBar.ts';
import { Sidebar } from '../components/Sidebar.ts';
import { CodeBlock } from '../components/CodeBlock.ts';
import { theme } from '../theme.ts';

export class DocsPage extends HTMLPropsMixin<typeof HTMLElement, { route: string }>(HTMLElement) {
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
                { label: 'CLI Tool', href: '#/docs/cli', active: currentPath === '/docs/cli' },
                { label: 'Builder', href: '#/docs/builder', active: currentPath === '/docs/builder' },
                { label: 'Basic Usage', href: '#/docs/usage', active: currentPath === '/docs/usage' },
                { label: 'Signals', href: '#/docs/signals', active: currentPath === '/docs/signals' },
                { label: 'Lifecycle Hooks', href: '#/docs/lifecycle', active: currentPath === '/docs/lifecycle' },
                {
                  label: 'Custom Rendering',
                  href: '#/docs/custom-rendering',
                  active: currentPath === '/docs/custom-rendering',
                },
                { label: 'JSX Support', href: '#/docs/jsx', active: currentPath === '/docs/jsx' },
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

    if (path === '/docs/cli') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'CLI Tool',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'Scaffold new projects quickly with the html-props CLI.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new H2({
            textContent: 'Creating a New Project',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new CodeBlock({ code: 'deno run jsr:@html-props/create my-app' }),
          new P({
            textContent: 'This will create a new directory called "my-app" with a basic project structure.',
            style: { marginTop: '1rem', marginBottom: '1rem', color: '#94a3b8' },
          }),
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

    if (path === '/docs/signals') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'Signals',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'Fine-grained reactivity for your components.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new P({
            textContent:
              'Signals are the backbone of reactivity in html-props. They allow you to create state that automatically updates your UI when changed.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `import { signal, effect } from '@html-props/signals';

const count = signal(0);

// Effects run whenever dependencies change
effect(() => {
  console.log(\`The count is \${count()}\`);
});

count(1); // Logs: "The count is 1"
count(2); // Logs: "The count is 2"`,
          }),
          new H2({
            textContent: 'Using Signals in Components',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'Component props are internally backed by signals. You can also use standalone signals for local state.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `class Counter extends HTMLPropsMixin(HTMLElement) {
  // Local state
  count = signal(0);

  render() {
    return new Button({
      textContent: \`Count: \${this.count()}\`,
      onclick: () => this.count.update(n => n + 1)
    });
  }
}`,
          }),
          new H2({
            textContent: 'Computed Values',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent: 'Computed signals derive their value from other signals and update automatically.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `import { computed } from '@html-props/signals';

const count = signal(1);
const double = computed(() => count() * 2);

console.log(double()); // 2
count(2);
console.log(double()); // 4`,
          }),
          new H2({
            textContent: 'Batch Updates',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent: 'Group multiple signal updates into a single effect run.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `import { batch } from '@html-props/signals';

batch(() => {
  count(10);
  count(20);
}); // Effects run only once`,
          }),
        ],
      });
    }

    if (path === '/docs/lifecycle') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'Lifecycle Hooks',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'Hook into the lifecycle of your components.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new H2({
            textContent: 'onMount()',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'Called when the component is connected to the DOM. This is a good place to fetch data or set up subscriptions.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new H2({
            textContent: 'onUnmount()',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'Called when the component is disconnected from the DOM. Use this to clean up timers or subscriptions.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `class Timer extends HTMLPropsMixin(HTMLElement) {
  count = signal(0);
  intervalId = null;

  onMount() {
    console.log('Timer mounted');
    this.intervalId = setInterval(() => {
      this.count.update(c => c + 1);
    }, 1000);
  }

  onUnmount() {
    console.log('Timer unmounted');
    clearInterval(this.intervalId);
  }

  render() {
    return new Div({ textContent: \`Seconds: \${this.count()}\` });
  }
}`,
          }),
        ],
      });
    }

    if (path === '/docs/jsx') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'JSX Support',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'Use JSX syntax for templating in your components.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new H2({
            textContent: 'Installation',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new CodeBlock({ code: 'deno add jsr:@html-props/jsx' }),
          new H2({
            textContent: 'Configuration',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent: 'Configure your compiler options in deno.json:',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@html-props/jsx"
  }
}`,
          }),
          new H2({
            textContent: 'Usage',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new CodeBlock({
            code: `import { HTMLPropsMixin } from '@html-props/core';

class MyElement extends HTMLPropsMixin(HTMLElement) {
  render() {
    return (
      <div class="container">
        <h1>Hello JSX</h1>
        <p>This is rendered using JSX!</p>
      </div>
    );
  }
}`,
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
          new H2({
            textContent: 'Built-in Elements',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'A collection of type-safe wrappers for standard HTML elements. They accept all standard HTML attributes plus \`style\`, \`class\`, and \`content\`.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `import { Div, Button, Input } from '@html-props/built-ins';

// Usage
new Div({
  style: { padding: '1rem' },
  class: 'container',
  content: [
    new Button({ 
      textContent: 'Click me',
      onclick: () => console.log('Clicked')
    })
  ]
})`,
          }),
        ],
      });
    }

    if (path === '/docs/builder') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'Builder',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'Visual HTML page building tool for VS Code.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new Img({
            src: 'builder_1.png',
            alt: 'HTML Props Builder Interface',
            style: {
              width: '100%',
              borderRadius: '8px',
              marginBottom: '2rem',
              border: `1px solid ${theme.colors.border}`,
            },
          }),
          new P({
            textContent:
              'The Builder allows you to construct web pages visually while maintaining full control over the underlying code. It bridges the gap between design and development by directly manipulating your source files.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),

          // Section 1: Getting Started
          new H2({
            textContent: 'Getting Started',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent: 'To open the visual editor:',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new Ul({
            style: { paddingLeft: '1.5rem', marginBottom: '2rem', color: '#94a3b8' },
            content: [
              new Li({ textContent: 'Right-click on any .html or .ts file in the explorer' }),
              new Li({ textContent: 'Select "Open With..."' }),
              new Li({ textContent: 'Choose "HTML Props Builder Visual Editor"' }),
            ],
          }),

          // Section 2: Resource Management (UI + Config)
          new H2({
            textContent: 'Resource Management',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'The Resources panel lets you manage your component libraries. Actions here directly affect your project configuration.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),

          new H3({
            textContent: 'Adding Resource Directories',
            style: { fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: theme.colors.text },
          }),
          new P({
            textContent: 'Click the "+" button in the Resources panel to select a folder containing your components.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new P({
            textContent:
              'Technical Effect: This updates your VS Code workspace settings (settings.json) to include the new path:',
            style: { marginBottom: '0.5rem', color: theme.colors.text, fontWeight: 'bold', fontSize: '0.9rem' },
          }),
          new CodeBlock({
            code: `{
  "webBuilder.resourceDirectories": [
    {
      "name": "My Components",
      "path": "./src/components"
    }
  ]
}`,
          }),

          new H3({
            textContent: 'Creating Components',
            style: { fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: theme.colors.text },
          }),
          new P({
            textContent:
              'Use the category menu (three dots) in the Resources panel to "Create Resource". The wizard guides you through defining the tag name, properties, and base element.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new P({
            textContent: 'Technical Effect: Generates a new TypeScript file with the component class definition:',
            style: { marginBottom: '0.5rem', color: theme.colors.text, fontWeight: 'bold', fontSize: '0.9rem' },
          }),
          new CodeBlock({
            code: `// Generated file: src/components/MyButton.ts
class MyButton extends HTMLProps(HTMLElement)<MyButtonProps>() {
  static props = {
    label: { type: String, default: '' }
  };
  // ...
}
MyButton.define('my-button');`,
          }),

          new H3({
            textContent: 'Supported Resource Types',
            style: { fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: theme.colors.text },
          }),
          new Ul({
            style: { paddingLeft: '1.5rem', marginBottom: '1rem', color: '#94a3b8' },
            content: [
              new Li({
                content: [
                  new P({
                    textContent: 'Custom Components (.ts/.js)',
                    style: { fontWeight: 'bold', color: theme.colors.text, display: 'inline' },
                  }),
                  new P({
                    textContent: ': Scanned via regex for `customElements.define()` or `HTMLProps`.',
                    style: { display: 'inline' },
                  }),
                ],
              }),
              new Li({
                content: [
                  new P({
                    textContent: 'HTML Templates (.html)',
                    style: { fontWeight: 'bold', color: theme.colors.text, display: 'inline' },
                  }),
                  new P({
                    textContent: ': Static files treated as insertable templates.',
                    style: { display: 'inline' },
                  }),
                ],
              }),
            ],
          }),

          // Section 3: Visual Editing (UI + Code)
          new H2({
            textContent: 'Visual Editing & Code Generation',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'The visual editor is a WYSIWYG interface that writes standard HTML. It supports editing both static HTML files and the render methods of your .ts/.js web components.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),

          new H3({
            textContent: 'Drag & Drop Composition',
            style: { fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: theme.colors.text },
          }),
          new P({
            textContent:
              'Dragging an element from the panel into the editor inserts the corresponding tag into your document.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new P({
            textContent:
              'Technical Effect: Inserts the HTML tag at the cursor position or drop target. For .ts/.js components, it updates the render method code.',
            style: { marginBottom: '0.5rem', color: theme.colors.text, fontWeight: 'bold', fontSize: '0.9rem' },
          }),
          new CodeBlock({
            code: `<!-- HTML File -->
<div class="container">
  <my-button></my-button>
</div>

// TypeScript Component (html-props)
new Div({
  class: 'container',
  content: [
    new MyButton({})
  ]
})`,
          }),

          new H3({
            textContent: 'Property Editing',
            style: { fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: theme.colors.text },
          }),
          new P({
            textContent:
              'Selecting an element populates the Properties panel. Changing values here updates the element attributes in real-time.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new P({
            textContent:
              'Technical Effect: Updates HTML attributes. For HTMLProps components, these attributes map to reactive props.',
            style: { marginBottom: '0.5rem', color: theme.colors.text, fontWeight: 'bold', fontSize: '0.9rem' },
          }),
          new CodeBlock({
            code: `<!-- HTML File -->
<my-counter count="5"></my-counter>

// TypeScript Component (html-props)
new MyCounter({
  count: 5
})`,
          }),

          new H3({
            textContent: 'Interface Panels',
            style: { fontSize: '1.4rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: theme.colors.text },
          }),
          new Ul({
            style: { paddingLeft: '1.5rem', marginBottom: '2rem', color: '#94a3b8' },
            content: [
              new Li({ textContent: 'Elements: Built-in HTML tags.' }),
              new Li({ textContent: 'Resources: Your custom components (configured via settings.json).' }),
              new Li({ textContent: 'Layers: DOM tree view for reordering.' }),
              new Li({ textContent: 'Properties: Attribute editor.' }),
            ],
          }),
        ],
      });
    }

    if (path === '/docs/custom-rendering') {
      return new Article({
        style: { flex: '1', padding: '3rem 4rem', maxWidth: '800px' },
        content: [
          new H1({
            textContent: 'Custom Rendering',
            style: { fontSize: '2.5rem', marginBottom: '1.5rem', color: theme.colors.text },
          }),
          new P({
            textContent:
              'By default, components re-render their entire content when properties change. You can optimize this by implementing a custom update strategy.',
            style: { marginBottom: '1.5rem', color: '#94a3b8' },
          }),
          new H2({
            textContent: 'The update() Method',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'Define an `update()` method to take control of subsequent renders. The initial render is always handled automatically.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `class MyElement extends HTMLPropsMixin(HTMLElement) {
  static props = {
    count: { type: Number, default: 0 }
  };

  render() {
    // Called for initial render
    // Also called manually in update() if needed
    return document.createTextNode(\`Count: \${this.count}\`);
  }

  update() {
    // Called ONLY for updates (not initial render)
    // Manually call render() if needed
    const newContent = this.render();
    
    // Perform fine-grained DOM updates
    this.firstChild.textContent = newContent.textContent;
  }
}`,
          }),
          new H2({
            textContent: 'Fallback to Default',
            style: { fontSize: '1.8rem', marginTop: '2rem', marginBottom: '1rem' },
          }),
          new P({
            textContent:
              'You can call `this.defaultUpdate()` to fall back to the default behavior (replacing all children) if needed.',
            style: { marginBottom: '1rem', color: '#94a3b8' },
          }),
          new CodeBlock({
            code: `update() {
  if (this.shouldOptimize) {
    // Custom logic
    const newContent = this.render();
    this.applyOptimization(newContent);
  } else {
    // Fallback
    this.defaultUpdate();
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
