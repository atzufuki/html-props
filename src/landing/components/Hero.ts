import { HTMLPropsMixin, prop } from '@html-props/core';
import { Column, Container, MediaQuery, Responsive, Row } from '@html-props/layout';
import { AppButton } from './AppButton.ts';
import { Heading, Text } from './Typography.ts';

export class Hero extends HTMLPropsMixin(HTMLElement, {
  heading: prop('', { reflect: true }),
  subtitle: prop('', { reflect: true }),
  primaryCta: prop('Get Started', { reflect: true }),
  secondaryCta: prop('View on GitHub', { reflect: true }),
  primaryCtaLink: prop('#', { reflect: true }),
  secondaryCtaLink: prop('#', { reflect: true }),
}) {
  render() {
    const isMobile = MediaQuery.isMobile();

    return new Container({
      padding: isMobile ? '3rem 1rem' : '6rem 2rem',
      style: {
        textAlign: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
      },
      content: new Column({
        crossAxisAlignment: 'center',
        content: [
          new Heading({
            level: '1',
            align: 'center',
            html: this.heading,
            style: {
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              lineHeight: '1.2',
              marginBottom: '1.5rem',
              background: 'linear-gradient(to right, #fff, #94a3b8)',
              backgroundClip: 'text',
              webkitBackgroundClip: 'text',
              webkitTextFillColor: 'transparent',
              color: 'transparent', // Fallback
            },
          }),
          new Text({
            html: this.subtitle,
            variant: 'muted',
            align: 'center',
            style: {
              fontSize: isMobile ? '1rem' : '1.25rem',
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
            },
          }),
          new Responsive({
            desktop: new Row({
              mainAxisAlignment: 'center',
              gap: '1rem',
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
            mobile: new Column({
              crossAxisAlignment: 'center',
              gap: '1rem',
              content: [
                new AppButton({
                  href: this.primaryCtaLink,
                  label: this.primaryCta,
                  variant: 'primary',
                  style: { width: '100%', textAlign: 'center' },
                }),
                new AppButton({
                  href: this.secondaryCtaLink,
                  label: this.secondaryCta,
                  variant: 'secondary',
                  style: { width: '100%', textAlign: 'center' },
                }),
              ],
            }),
          }),
        ],
      }),
    });
  }
}

Hero.define('app-hero');
