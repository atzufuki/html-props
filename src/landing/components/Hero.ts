import { HTMLPropsMixin } from '@html-props/core';
import { A, Div, H1, P, Section } from '@html-props/built-ins';
import { theme } from '../theme.ts';

interface HeroProps {
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  primaryCtaLink?: string;
  secondaryCtaLink?: string;
}

export class Hero extends HTMLPropsMixin<typeof HTMLElement, HeroProps>(HTMLElement) {
  static props = {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    primaryCta: { type: String, default: 'Get Started' },
    secondaryCta: { type: String, default: 'View on GitHub' },
    primaryCtaLink: { type: String, default: '#' },
    secondaryCtaLink: { type: String, default: '#' },
  };

  declare title: string;
  declare subtitle: string;
  declare primaryCta: string;
  declare secondaryCta: string;
  declare primaryCtaLink: string;
  declare secondaryCtaLink: string;

  render() {
    const btnStyle = {
      display: 'inline-block',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontWeight: '600',
      transition: 'all 0.2s',
      cursor: 'pointer',
      border: 'none',
      fontSize: '1rem',
      textDecoration: 'none',
    };

    return new Section({
      style: {
        padding: '6rem 2rem',
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
      },
      content: [
        new H1({
          innerHTML: this.title,
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
            new A({
              href: this.primaryCtaLink,
              textContent: this.primaryCta,
              style: {
                ...btnStyle,
                backgroundColor: theme.colors.accent,
                color: theme.colors.bg,
              },
              onMouseOver: (e: MouseEvent) => {
                const el = e.target as HTMLElement;
                el.style.backgroundColor = theme.colors.accentHover;
                el.style.transform = 'translateY(-1px)';
              },
              onMouseOut: (e: MouseEvent) => {
                const el = e.target as HTMLElement;
                el.style.backgroundColor = theme.colors.accent;
                el.style.transform = 'none';
              },
            }),
            new A({
              href: this.secondaryCtaLink,
              textContent: this.secondaryCta,
              style: {
                ...btnStyle,
                backgroundColor: theme.colors.secondaryBg,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
              },
              onMouseOver: (e: MouseEvent) => {
                const el = e.target as HTMLElement;
                el.style.borderColor = theme.colors.accent;
                el.style.transform = 'translateY(-1px)';
              },
              onMouseOut: (e: MouseEvent) => {
                const el = e.target as HTMLElement;
                el.style.borderColor = theme.colors.border;
                el.style.transform = 'none';
              },
            }),
          ],
        }),
      ],
    });
  }
}

Hero.define('app-hero');
