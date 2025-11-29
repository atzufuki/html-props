import { HTMLPropsMixin } from '@html-props/core';
import { Code, Div, Pre } from '@html-props/built-ins';
import { theme } from '../theme.ts';

interface CodeBlockProps {
  code: string;
}

export class CodeBlock extends HTMLPropsMixin<typeof HTMLElement, CodeBlockProps>(HTMLElement) {
  static props = {
    code: { type: String, default: '' },
  };

  declare code: string;

  private highlight(code: string): string {
    // Escape HTML first
    let result = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const tokens: string[] = [];
    const save = (html: string) => {
      tokens.push(html);
      return `###TOKEN${tokens.length - 1}###`;
    };

    // 1. Comments (high priority)
    result = result.replace(
      /(\/\/.*)/g,
      (match) => save(`<span style="color: ${theme.colors.comment}; font-style: italic;">${match}</span>`),
    );

    // 2. Strings
    result = result.replace(
      /('.*?'|`.*?`)/g,
      (match) => save(`<span style="color: ${theme.colors.string}">${match}</span>`),
    );

    // 3. Keywords
    result = result.replace(
      /\b(import|from|class|extends|static|return|new|const|this)\b/g,
      (match) => save(`<span style="color: ${theme.colors.keyword}">${match}</span>`),
    );

    // 4. Class names
    result = result.replace(
      /\b(HTMLPropsMixin|HTMLElement|Button|Div|CounterApp)\b/g,
      (match) => save(`<span style="color: ${theme.colors.className}">${match}</span>`),
    );

    // 5. Functions
    result = result.replace(
      /\b(render|define)\b/g,
      (match) => save(`<span style="color: ${theme.colors.function}">${match}</span>`),
    );

    // 6. Numbers
    result = result.replace(
      /\b(\d+)\b/g,
      (match) => save(`<span style="color: ${theme.colors.number}">${match}</span>`),
    );

    // 7. Properties
    result = result.replace(
      /(\w+):/g,
      (match, name) => save(`<span style="color: ${theme.colors.property}">${name}</span>:`),
    );

    // Restore tokens
    tokens.forEach((token, index) => {
      result = result.replace(`###TOKEN${index}###`, () => token);
    });

    return result;
  }

  render() {
    return new Div({
      style: {
        backgroundColor: theme.colors.codeBg,
        padding: '1.5rem',
        fontFamily: theme.fonts.mono,
        fontSize: '0.9rem',
        overflowX: 'auto',
        borderRight: `1px solid ${theme.colors.border}`,
      },
      content: new Pre({
        content: new Code({
          innerHTML: this.highlight(this.code),
        }),
      }),
    });
  }
}

CodeBlock.define('code-block');
