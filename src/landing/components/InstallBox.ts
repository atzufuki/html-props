import { HTMLPropsMixin } from '@html-props/core';
import { Button, Span } from '@html-props/built-ins';
import { Container, Row } from '@html-props/layout';
import { theme } from '../theme.ts';

export class InstallBox extends HTMLPropsMixin(HTMLElement, {
  command: { type: String, default: '' },
}) {
  render() {
    return new Container({
      color: theme.colors.codeBg,
      padding: '1rem 2rem',
      radius: '0.5rem',
      border: `1px solid ${theme.colors.border}`,
      style: {
        fontFamily: theme.fonts.mono,
        marginTop: '2rem',
        color: '#a5b4fc',
        display: 'inline-block', // Container is block by default, but we want inline behavior for the box itself?
        // Actually, Container sets display based on alignment or default block.
        // Let's keep it simple and wrap the Row.
      },
      content: new Row({
        crossAxisAlignment: 'center',
        gap: '1rem',
        content: [
          new Span({ textContent: this.command }),
          new Button({
            title: 'Copy to clipboard',
            textContent: '📋',
            style: {
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              marginLeft: '1rem',
              transition: 'color 0.2s',
            },
            onmouseover: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.text,
            onmouseout: (e: MouseEvent) => (e.target as HTMLElement).style.color = '#64748b',
            onclick: () => {
              navigator.clipboard.writeText(this.command);
              // Could add a toast or tooltip here
            },
          }),
        ],
      }),
    });
  }
}

InstallBox.define('install-box');
