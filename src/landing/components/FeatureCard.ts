import { HTMLPropsMixin, prop } from '@html-props/core';
import { Column, Container } from '@html-props/layout';
import { Div } from '@html-props/built-ins';
import { Heading, Text } from './Typography.ts';
import { theme } from '../theme.ts';

const FEATURE_ICONS = {
  package:
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  zap:
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  code:
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
  globe:
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
};

export type FeatureIconName = keyof typeof FEATURE_ICONS;

export class FeatureCard extends HTMLPropsMixin(HTMLElement, {
  icon: prop<FeatureIconName | string>('package'),
  heading: prop(''),
  description: prop(''),
}) {
  render() {
    const iconName = this.icon as FeatureIconName;
    const svg = FEATURE_ICONS[iconName] || this.icon;

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
            color: theme.colors.secondaryBg,
            radius: '0.5rem',
            width: '3rem',
            height: '3rem',
            style: {
              fontSize: '1.5rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.accent,
            },
            content: new Div({ innerHTML: svg, style: { display: 'flex' } }),
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
