import { HTMLPropsMixin, prop } from '@html-props/core';
import { Column, Container, MediaQuery, Responsive, Row } from '@html-props/layout';
import { AppButton } from './AppButton.ts';
import { Typography } from './Typography.ts';
import { theme } from '../theme.ts';

export class Hero extends HTMLPropsMixin(HTMLElement, {
  heading: prop('', { attribute: true }),
  subtitle: prop('', { attribute: true }),
  primaryCta: prop('Get Started', { attribute: true }),
  secondaryCta: prop('View on GitHub', { attribute: true }),
  primaryCtaLink: prop('#', { attribute: true }),
  secondaryCtaLink: prop('#', { attribute: true }),
}) {
  render() {
    const isMobile = MediaQuery.isMobile();

    return new Container({
      padding: isMobile ? '3rem 1rem' : '6rem 2rem',
      style: {
        textAlign: 'center',
        margin: '0 auto',
      },
      content: new Column({
        crossAxisAlignment: 'center',
        content: [
          new Typography({
            variant: isMobile ? 'displaySmall' : 'displayLarge',
            align: 'center',
            html: this.heading,
            style: {
              marginBottom: '1.5rem',
              color: theme.colors.text,
            },
          }),
          new Typography({
            html: this.subtitle,
            variant: isMobile ? 'bodyLarge' : 'titleLarge',
            align: 'center',
            color: '#94a3b8',
            style: {
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
