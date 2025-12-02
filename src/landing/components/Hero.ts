import { HTMLPropsMixin } from '@html-props/core';
import { Div, H1, P, Section } from '@html-props/built-ins';
import { AppButton } from './AppButton.ts';

export class Hero extends HTMLPropsMixin(HTMLElement, {
  heading: { type: String, default: '', reflect: true },
  subtitle: { type: String, default: '', reflect: true },
  primaryCta: { type: String, default: 'Get Started', reflect: true },
  secondaryCta: { type: String, default: 'View on GitHub', reflect: true },
  primaryCtaLink: { type: String, default: '#', reflect: true },
  secondaryCtaLink: { type: String, default: '#', reflect: true },
}) {
  render() {
    return new Section({
      style: {
        padding: '6rem 2rem',
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
      },
      content: [
        new H1({
          innerHTML: this.heading,
          style: {
            fontSize: '3.5rem',
            lineHeight: '1.2',
            marginBottom: '1.5rem',
            background: 'linear-gradient(to right, #fff, #94a3b8)',
            backgroundClip: 'text',
            webkitBackgroundClip: 'text',
            webkitTextFillColor: 'transparent',
            color: 'transparent', // Fallback
          },
        }),
        new P({
          textContent: this.subtitle,
          style: {
            fontSize: '1.25rem',
            color: '#94a3b8',
            maxWidth: '600px',
            margin: '0 auto 2.5rem',
          },
        }),
        new Div({
          style: {
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
          },
          content: [
            new AppButton({
              href: this.primaryCtaLink,
              label: this.primaryCta,
              variant: 'primary',
            }),
            new AppButton({
              href: this.secondaryCtaLink,
              label: this.secondaryCta,
              variant: 'secondary',
            }),
          ],
        }),
      ],
    });
  }
}

Hero.define('app-hero');
