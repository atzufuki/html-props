import { HTMLPropsMixin } from '@html-props/core';
import { Button, Div, Span } from '@html-props/built-ins';
import { theme } from '../theme.ts';

export class InstallBox extends HTMLPropsMixin(HTMLElement, {
  command: { type: String, default: '' },
}) {
  render() {
    return new Div({
      style: {
        backgroundColor: theme.colors.codeBg,
        padding: '1rem 2rem',
        borderRadius: '0.5rem',
        fontFamily: theme.fonts.mono,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '1rem',
        border: `1px solid ${theme.colors.border}`,
        marginTop: '2rem',
        color: '#a5b4fc',
      },
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
    });
  }
}

InstallBox.define('install-box');
