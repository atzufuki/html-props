import { HTMLPropsMixin, prop } from '@html-props/core';
import { signal } from '@html-props/signals';
import { Container, Row } from '@html-props/layout';
import { Text } from './Typography.ts';
import { theme } from '../theme.ts';
import { IconButton } from './IconButton.ts';

export class InstallBox extends HTMLPropsMixin(HTMLElement, {
  command: prop(''),
}) {
  private copied = signal(false);

  render() {
    const isCopied = this.copied();

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
          new IconButton({
            icon: isCopied ? 'check' : 'copy',
            label: 'Copy to clipboard',
            style: {
              color: isCopied ? theme.colors.string : theme.colors.comment,
              marginLeft: '1rem',
              opacity: '0.8',
            },
            onclick: () => {
              navigator.clipboard.writeText(this.command);
              this.copied.set(true);
              setTimeout(() => this.copied.set(false), 2000);
            },
          }),
        ],
      }),
    });
  }
}

InstallBox.define('install-box');
