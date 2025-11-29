import { HTMLPropsMixin } from '@html-props/core';
import { Div, Footer, P, Section } from '@html-props/built-ins';
import { NavBar } from '../components/NavBar.ts';
import { Hero } from '../components/Hero.ts';
import { FeatureCard } from '../components/FeatureCard.ts';
import { InstallBox } from '../components/InstallBox.ts';
import { LiveDemo } from '../components/LiveDemo.ts';
import { theme } from '../theme.ts';

export class LandingPage extends HTMLPropsMixin(HTMLElement) {
  render() {
    return new Div({
      content: [
        new NavBar({
          links: [
            { label: 'Documentation', href: '#/docs' },
            { label: 'Examples', href: '#/examples' },
            { label: 'GitHub', href: 'https://github.com/html-props/core' },
          ],
        }),
        new Hero({
          title: 'Reactive Custom Elements,<br>Simplified.',
          subtitle:
            'A lightweight mixin for building native Web Components with reactive props, signals, and zero dependencies. No build step required.',
          primaryCta: 'Get Started',
          secondaryCta: 'View on GitHub',
          primaryCtaLink: '#/docs',
          secondaryCtaLink: 'https://github.com/html-props/core',
        }),
        new Section({
          style: {
            padding: '4rem 2rem',
            backgroundColor: theme.colors.secondaryBg,
            borderTop: `1px solid ${theme.colors.border}`,
            borderBottom: `1px solid ${theme.colors.border}`,
          },
          content: new Div({
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
              maxWidth: '1200px',
              margin: '0 auto',
            },
            content: [
              new FeatureCard({
                icon: '⚡',
                title: 'Zero Dependencies',
                description:
                  'Extremely lightweight. No framework lock-in. Just a simple mixin for your native HTMLElement classes.',
              }),
              new FeatureCard({
                icon: '🔄',
                title: 'Reactive Signals',
                description:
                  'Built-in signal-based reactivity. Props automatically map to signals and trigger efficient updates.',
              }),
              new FeatureCard({
                icon: '📘',
                title: 'TypeScript First',
                description:
                  'Designed with strong type inference in mind. Define props via static config and get full type safety.',
              }),
              new FeatureCard({
                icon: '🎨',
                title: 'Native DOM',
                description:
                  'Works seamlessly with standard DOM APIs. Use it with vanilla JS, or integrate into any framework.',
              }),
            ],
          }),
        }),
        new Section({
          style: {
            padding: '6rem 2rem',
            maxWidth: '1200px',
            margin: '0 auto',
          },
          content: [
            new Div({
              style: {
                textAlign: 'center',
                marginBottom: '3rem',
              },
              content: [
                new Div({
                  tagName: 'h2',
                  textContent: 'Write Less, Do More',
                  style: { fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' },
                }),
                new P({
                  textContent: 'Define props, handle events, and render content with a clean, declarative API.',
                  style: { color: '#94a3b8' },
                }),
              ],
            }),
            new LiveDemo({
              code: `import { HTMLPropsMixin } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';

class CounterApp extends HTMLPropsMixin(HTMLElement) {
  static props = {
    count: { type: Number, default: 0 }
  };

  render() {
    const { count } = this;
    
    return new Div({
      style: { padding: '1rem', textAlign: 'center' },
      content: [
        new Div({ 
            textContent: \`Count is: \${count}\`,
            style: { marginBottom: '1rem' }
        }),
        new Button({
          textContent: 'Increment',
          style: {
            backgroundColor: '#38bdf8',
            color: '#0f172a',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontWeight: '600'
          },
          onclick: () => this.count++
        })
      ]
    });
  }
}

CounterApp.define('counter-app');`,
            }),
          ],
        }),
        new Section({
          style: {
            padding: '4rem 2rem',
            textAlign: 'center',
            backgroundColor: theme.colors.secondaryBg,
            borderTop: `1px solid ${theme.colors.border}`,
          },
          content: [
            new Div({
              tagName: 'h2',
              textContent: 'Ready to build?',
              style: { fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' },
            }),
            new InstallBox({ command: 'deno add @html-props/core' }),
          ],
        }),
        new Footer({
          style: {
            padding: '2rem',
            textAlign: 'center',
            color: '#64748b',
            borderTop: `1px solid ${theme.colors.border}`,
            fontSize: '0.9rem',
          },
          content: new P({ textContent: '© 2025 HTML Props. MIT License.' }),
        }),
      ],
    });
  }
}

LandingPage.define('landing-page');
