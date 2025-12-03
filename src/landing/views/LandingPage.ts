import { HTMLPropsMixin } from '@html-props/core';
import { Column, Container, Grid, SizedBox } from '@html-props/layout';
import { NavBar } from '../components/NavBar.ts';
import { Hero } from '../components/Hero.ts';
import { FeatureCard } from '../components/FeatureCard.ts';
import { InstallBox } from '../components/InstallBox.ts';
import { LiveDemo } from '../components/LiveDemo.ts';
import { SectionHeading, Text } from '../components/Typography.ts';
import { AppFooter } from '../components/AppFooter.ts';
import { theme } from '../theme.ts';

export class LandingPage extends HTMLPropsMixin(HTMLElement) {
  render() {
    return [
      new NavBar({
        links: [
          { label: 'Documentation', href: '#/docs' },
          { label: 'Examples', href: '#/examples' },
          { label: 'GitHub', href: 'https://github.com/atzufuki/html-props' },
        ],
      }),
      new Hero({
        heading: 'Reactive Custom Elements,<br>Simplified.',
        subtitle:
          'A lightweight mixin for building native Web Components with reactive props, signals, and zero dependencies. No build step required.',
        primaryCta: 'Get Started',
        secondaryCta: 'View on GitHub',
        primaryCtaLink: '#/docs',
        secondaryCtaLink: 'https://github.com/atzufuki/html-props',
      }),
      new Container({
        padding: '4rem 2rem',
        color: theme.colors.secondaryBg,
        border: `1px solid ${theme.colors.border}`,
        style: { borderLeft: 'none', borderRight: 'none' }, // Only top/bottom
        content: new Container({
          style: { maxWidth: '1200px', margin: '0 auto' },
          content: new Grid({
            columns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            content: [
              new FeatureCard({
                icon: '⚡',
                heading: 'Zero Dependencies',
                description:
                  'Extremely lightweight. No framework lock-in. Just a simple mixin for your native HTMLElement classes.',
              }),
              new FeatureCard({
                icon: '🔄',
                heading: 'Reactive Signals',
                description:
                  'Built-in signal-based reactivity. Props automatically map to signals and trigger efficient updates.',
              }),
              new FeatureCard({
                icon: '📘',
                heading: 'TypeScript First',
                description:
                  'Designed with strong type inference in mind. Define props via static config and get full type safety.',
              }),
              new FeatureCard({
                icon: '🎨',
                heading: 'Native DOM',
                description:
                  'Works seamlessly with standard DOM APIs. Use it with vanilla JS, or integrate into any framework.',
              }),
            ],
          }),
        }),
      }),
      new Container({
        padding: '6rem 2rem',
        style: { maxWidth: '1200px', margin: '0 auto' },
        content: [
          new Column({
            crossAxisAlignment: 'center',
            content: [
              new SectionHeading({
                text: 'Write Less, Do More',
              }),
              new Text({
                text: 'Define props, handle events, and render content with a clean, declarative API.',
                variant: 'muted',
                align: 'center',
              }),
              new SizedBox({ height: '3rem' }),
            ],
          }),
          new LiveDemo({
            code: `import { HTMLPropsMixin } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';

class CounterApp extends HTMLPropsMixin(HTMLElement, {
  count: { type: Number, default: 0 }
}) {
  render() {
    return new Div({
      style: { padding: '1rem', textAlign: 'center' },
      content: [
        new Div({ 
            textContent: \`Count is: \${this.count}\`,
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
      new Container({
        padding: '4rem 2rem',
        color: theme.colors.secondaryBg,
        style: { borderTop: `1px solid ${theme.colors.border}` },
        content: new Column({
          crossAxisAlignment: 'center',
          content: [
            new SectionHeading({
              text: 'Ready to build?',
            }),
            new InstallBox({ command: 'deno add @html-props/core' }),
          ],
        }),
      }),
      new AppFooter({}),
    ];
  }
}

LandingPage.define('landing-page');
