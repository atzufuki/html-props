import { HTMLPropsMixin } from '@html-props/core';
import { Div, H3, P } from '@html-props/built-ins';
import { theme } from '../theme.ts';

export class FeatureCard extends HTMLPropsMixin(HTMLElement, {
  icon: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
}) {
  render() {
    return new Div({
      style: {
        padding: '1.5rem',
        backgroundColor: theme.colors.bg,
        borderRadius: '0.75rem',
        border: `1px solid ${theme.colors.border}`,
        height: '100%',
      },
      content: [
        new Div({
          textContent: this.icon,
          style: {
            fontSize: '1.5rem',
            marginBottom: '1rem',
            display: 'inline-block',
            padding: '0.5rem',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderRadius: '0.5rem',
            color: theme.colors.accent,
          },
        }),
        new H3({
          textContent: this.title,
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
    });
  }
}

FeatureCard.define('feature-card');
