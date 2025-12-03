import { HTMLPropsMixin } from '@html-props/core';
import { Column, Container, Row } from '@html-props/layout';
import { AppButton } from './AppButton.ts';
import { Heading, Text } from './Typography.ts';

export class Hero extends HTMLPropsMixin(HTMLElement, {
  heading: { type: String, default: '', reflect: true },
  subtitle: { type: String, default: '', reflect: true },
  primaryCta: { type: String, default: 'Get Started', reflect: true },
  secondaryCta: { type: String, default: 'View on GitHub', reflect: true },
  primaryCtaLink: { type: String, default: '#', reflect: true },
  secondaryCtaLink: { type: String, default: '#', reflect: true },
}) {
  render() {
    return new Container({
      padding: '6rem 2rem',
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
              fontSize: '2rem',
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
              fontSize: '1.25rem',
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
            },
          }),
          new Row({
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
        ],
      }),
    });
  }
}

Hero.define('app-hero');
