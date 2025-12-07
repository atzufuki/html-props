import { HTMLPropsMixin, prop } from '@html-props/core';
import { Container, Row } from '@html-props/layout';
import { Text } from './Typography.ts';
import { AppButton } from './AppButton.ts';
import { theme } from '../theme.ts';

export class InstallBox extends HTMLPropsMixin(HTMLElement, {
  command: prop(''),
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
        color: theme.colors.accent,
        display: 'inline-block',
      },
      content: new Row({
        crossAxisAlignment: 'center',
        gap: '1rem',
        content: [
          new Text({
            text: '$ ' + this.command,
            variant: 'code',
            style: { color: 'inherit', fontSize: '1rem' },
          }),
          new AppButton({
            label: '📋',
            variant: 'secondary',
            style: {
              background: 'none',
              border: 'none',
              color: theme.colors.comment,
              cursor: 'pointer',
              padding: '0.5rem',
              fontSize: '1.2rem',
              minWidth: 'auto',
              marginLeft: '1rem',
              transition: 'color 0.2s',
            },
            onmouseover: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.text,
            onmouseout: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.comment,
            onclick: () => {
              navigator.clipboard.writeText(this.command);
            },
          }),
        ],
      }),
    });
  }
}

InstallBox.define('install-box');
