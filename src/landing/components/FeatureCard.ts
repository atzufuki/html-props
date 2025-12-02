import { HTMLPropsMixin } from '@html-props/core';
import { H3, P } from '@html-props/built-ins';
import { Column, Container } from '@html-props/layout';
import { theme } from '../theme.ts';

export class FeatureCard extends HTMLPropsMixin(HTMLElement, {
  icon: { type: String, default: '' },
  heading: { type: String, default: '' },
  description: { type: String, default: '' },
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
            color: 'rgba(56, 189, 248, 0.1)',
            radius: '0.5rem',
            style: {
              fontSize: '1.5rem',
              marginBottom: '1rem',
              display: 'inline-block',
              color: theme.colors.accent,
            },
            content: document.createTextNode(this.icon),
          }),
          new H3({
            textContent: this.heading,
            style: {
              marginBottom: '0.5rem',
              fontSize: '1.1rem',
            },
          }),
          new P({
            textContent: this.description,
            style: {
              color: '#94a3b8',
              fontSize: '0.95rem',
            },
          }),
        ],
      }),
    });
  }
}

FeatureCard.define('feature-card');
