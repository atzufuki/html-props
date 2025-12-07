import { HTMLPropsMixin } from '@html-props/core';
import { Span } from '@html-props/built-ins';
import { Column, Container, Grid, MediaQuery, SizedBox } from '@html-props/layout';
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
    const isMobile = MediaQuery.isMobile();
    const padding = isMobile ? '2rem 1rem' : '4rem 2rem';
    const sectionPadding = isMobile ? '3rem 1rem' : '6rem 2rem';

    return [
      new Container({
        padding: '0.75rem',
        color: theme.colors.accent,
        style: {
          textAlign: 'center',
          color: 'white',
          fontWeight: '500',
          fontSize: '0.9rem',
        },
        content: new Span({
          textContent:
            '🚀 HTML Props v1 Beta is here! This is a preview release. APIs are stable but subject to feedback.',
          style: { color: 'white' },
        }),
      }),
      new NavBar({
        links: [
          { label: 'Home', href: '#/' },
          { label: 'Documentation', href: '#/docs' },
          { label: 'GitHub', href: 'https://github.com/atzufuki/html-props' },
        ],
      }),
      new Hero({
        heading: 'HTML Props for Web Components',
        subtitle:
          "Stop struggling with imperative web or complex frameworks. Build type-safe props API's and declarative layouts for your<br>Custom Elements.",
        primaryCta: 'Get Started',
        secondaryCta: 'View on GitHub',
        primaryCtaLink: '#/docs',
        secondaryCtaLink: 'https://github.com/atzufuki/html-props',
      }),
      new Container({
        padding: padding,
        color: theme.colors.secondaryBg,
        border: `1px solid ${theme.colors.border}`,
        style: { borderLeft: 'none', borderRight: 'none' }, // Only top/bottom
        content: new Container({
          style: { maxWidth: '1200px', margin: '0 auto' },
          content: new Grid({
            columns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2rem',
            content: [
              new FeatureCard({
                icon: '📦',
                heading: 'Type-Safe Props',
                description:
                  'Pass objects, arrays, and functions directly to your components. Become a real HTML programmer. 🔥',
              }),
              new FeatureCard({
                icon: '⚡',
                heading: 'Zero Dependencies',
                description:
                  'Extremely lightweight. No framework lock-in. Just a simple mixin for your native HTMLElement classes.',
              }),
              new FeatureCard({
                icon: '📘',
                heading: 'TypeScript First',
                description:
                  'Designed with strong type inference in mind. Define props via static config and get full type safety.',
              }),
              new FeatureCard({
                icon: '🎨',
                heading: 'Native Standards',
                description: 'Relies on Custom Element standards. No opinionated patterns or paradigms.',
              }),
            ],
          }),
        }),
      }),
      new Container({
        padding: sectionPadding,
        style: { maxWidth: '1200px', margin: '0 auto' },
        content: [
          new Column({
            crossAxisAlignment: 'center',
            content: [
              new SectionHeading({
                text: 'The Missing Piece for Custom Elements',
              }),
              new Text({
                html:
                  'Plain HTML is limited to simple attributes and imperative coding style.<br>HTML Props brings declarativeness with rich data types and type safety to Web Components.',
                variant: 'muted',
                align: 'center',
              }),
              new SizedBox({ height: '3rem' }),
            ],
          }),
          new LiveDemo({
            code: `import { HTMLPropsMixin, prop } from '@html-props/core';
import { Button, Div } from '@html-props/built-ins';
import { Column, Container } from '@html-props/layout';

class CounterApp extends HTMLPropsMixin(HTMLElement, {
  count: prop(0)
}) {
  render() {
    return new Container({
      padding: '2rem',
      content: new Column({
        crossAxisAlignment: 'center',
        gap: '1rem',
        content: [
          new Div({ 
            textContent: \`Count is: \${this.count}\`,
            style: { fontSize: '1.2rem' }
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
      })
    });
  }
}

CounterApp.define('counter-app');`,
          }),
        ],
      }),
      new Container({
        padding: padding,
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
