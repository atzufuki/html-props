import { HTMLPropsMixin, prop } from '@html-props/core';
import { Column, Container } from '@html-props/layout';
import { Heading, Text } from './Typography.ts';
import { theme } from '../theme.ts';

export class FeatureCard extends HTMLPropsMixin(HTMLElement, {
  icon: prop(''),
  heading: prop(''),
  description: prop(''),
}) {
  render() {
    return new Container({
      padding: '1.5rem',
      color: theme.colors.bg,
      radius: '0.75rem',
      border: `1px solid ${theme.colors.border}`,
      style: { height: '100%' },
      content: new Column({
        crossAxisAlignment: 'start',
        content: [
          new Container({
            padding: '0.5rem',
            color: theme.colors.secondaryBg,
            radius: '0.5rem',
            style: {
              fontSize: '1.5rem',
              marginBottom: '1rem',
              display: 'inline-block',
              color: theme.colors.accent,
            },
            content: new Text({ text: this.icon, tag: 'span' }),
          }),
          new Heading({
            text: this.heading,
            level: '3',
            style: {
              marginBottom: '0.5rem',
              fontSize: '1.1rem',
            },
          }),
          new Text({
            text: this.description,
            variant: 'muted',
            style: { fontSize: '0.95rem' },
          }),
        ],
      }),
    });
  }
}

FeatureCard.define('feature-card');
