import { HTMLPropsMixin } from '@html-props/core';
import { Span } from '@html-props/built-ins';
import { Column, Container, Grid, MediaQuery, Row, SizedBox } from '@html-props/layout';
import { NavBar } from '../components/NavBar.ts';
import { Hero } from '../components/Hero.ts';
import { FeatureCard } from '../components/FeatureCard.ts';
import { InstallBox } from '../components/InstallBox.ts';
import { LiveDemo } from '../components/LiveDemo.ts';
import { Typography } from '../components/Typography.ts';
import { AppFooter } from '../components/AppFooter.ts';
import { AppButton } from '../components/AppButton.ts';
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
          { label: 'Home', href: '/' },
          { label: 'Documentation', href: '/docs' },
          { label: 'GitHub', href: 'https://github.com/atzufuki/html-props' },
        ],
      }),
      new Hero({
        heading: 'HTML Props',
        subtitle:
          "Stop struggling with imperative web or complex frameworks. Build type-safe props API's and declarative layouts for your<br>Web Components.",
        primaryCta: 'Get Started',
        secondaryCta: 'View on GitHub',
        primaryCtaLink: '/docs',
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
                icon: 'package',
                heading: 'Type-Safe Props',
                description:
                  'Create components which can take in objects, arrays, functions and even elements as props.',
              }),
              new FeatureCard({
                icon: 'code',
                heading: 'Declarative Layouts',
                description: 'Build your UI with a clean, nested, and fully typed API. No more imperative spaghetti.',
              }),
              new FeatureCard({
                icon: 'globe',
                heading: 'Native Standards',
                description: 'Relies on Custom Element standards. No opinionated patterns or paradigms.',
              }),
              new FeatureCard({
                icon: 'zap',
                heading: 'Zero Dependencies',
                description: 'No framework lock-in. Just a simple mixin for your native HTMLElement classes.',
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
            gap: '1.5rem',
            content: [
              new Typography({
                variant: 'headlineLarge',
                text: 'The Missing Piece of Custom Elements',
                align: 'center',
              }),
              new Typography({
                variant: 'bodyLarge',
                html:
                  'Standard HTML is limited to simple attributes and imperative coding style.<br>HTML Props brings declarativeness with rich data types and type safety to native components.',
                color: '#94a3b8',
                align: 'center',
              }),
              new SizedBox({ height: '1.5rem' }),
            ],
          }),
          new LiveDemo({
            code: `import { HTMLPropsMixin, prop } from '@html-props/core';
import { Div } from '@html-props/built-ins';
import { Column, Container } from '@html-props/layout';

class CounterButton extends HTMLPropsMixin(HTMLButtonElement, {
  is: prop('counter-button', { attribute: true }),
  style: {
    backgroundColor: '#a78bfa',
    color: '#13111c',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontWeight: '600'
  },
}) {}

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
          new CounterButton({
            textContent: 'Increment',
            onclick: () => this.count++
          })
        ]
      })
    });
  }
}

CounterButton.define('counter-button', { extends: 'button' });
CounterApp.define('counter-app');`,
          }),
        ],
      }),
      new Container({
        padding: '6rem 2rem',
        color: theme.colors.secondaryBg,
        style: {
          borderTop: `1px solid ${theme.colors.border}`,
          textAlign: 'center',
        },
        content: new Column({
          crossAxisAlignment: 'center',
          gap: '2rem',
          content: [
            new Typography({
              variant: 'headlineLarge',
              text: 'Join the HTML Props v1 Beta',
              align: 'center',
            }),
            new Typography({
              variant: 'bodyLarge',
              text: 'The v1 Beta is now available. Scaffold a new project or add it to your existing project.',
              color: '#94a3b8',
              align: 'center',
              style: { maxWidth: '600px' },
            }),
            new Container({
              alignment: 'center',
              content: new Column({
                crossAxisAlignment: 'center',
                gap: '1rem',
                content: [
                  new InstallBox({ command: 'deno run jsr:@html-props/create@^1.0.0-beta my-app' }),
                  new Typography({
                    variant: 'bodyMedium',
                    text: 'or',
                    color: '#94a3b8',
                  }),
                  new InstallBox({ command: 'deno add jsr:@html-props/core@^1.0.0-beta' }),
                ],
              }),
            }),
            new Row({
              gap: '1rem',
              content: [
                new AppButton({
                  label: 'Read the Docs',
                  href: '/docs/getting-started',
                  variant: 'primary',
                }),
                new AppButton({
                  label: 'View on GitHub',
                  href: 'https://github.com/atzufuki/html-props',
                  variant: 'secondary',
                }),
              ],
            }),
          ],
        }),
      }),
      new AppFooter({}),
    ];
  }
}

LandingPage.define('landing-page');
