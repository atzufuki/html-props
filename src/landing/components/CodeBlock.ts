import { HTMLPropsMixin, prop } from '@html-props/core';
import { Code, Pre } from '@html-props/built-ins';
import { Container } from '@html-props/layout';
import { theme } from '../theme.ts';

export class CodeBlock extends HTMLPropsMixin(HTMLElement, {
  code: prop(''),
}) {
  private highlight(code: string): string {
    // Escape HTML first
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const keywords =
      'import|from|class|extends|static|return|new|const|this|export|default|function|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|async|await|let|var|void|typeof|instanceof|in|of';

    const patterns = [
      // 1. Comment: // ...
      /(\/\/.*)/.source,
      // 2. String: '...' or `...`
      /('([^'\\\n]|\\.)*'|`([^`\\]|\\.)*`)/.source,
      // 3. Keyword
      `\\b(${keywords})\\b`,
      // 4. Function: name(
      /\b([a-zA-Z_]\w*)(?=\s*\()/.source,
      // 5. Property: name: or name=
      /([a-zA-Z_]\w*)(?=\s*[:=])/.source,
      // 6. Class: Capitalized
      /\b([A-Z][a-zA-Z0-9_]*)\b/.source,
      // 7. Number
      /\b(\d+)\b/.source,
      // 8. Member Access: .name
      /\.([a-zA-Z_]\w*)/.source,
      // 9. Operator / Punctuation
      /(&lt;|&gt;|&amp;|[=+\-*/|!%&^~<>?:.,;(){}[\]])/.source,
      // 10. Variable: name
      /\b([a-zA-Z_]\w*)\b/.source,
    ];

    const regex = new RegExp(patterns.join('|'), 'g');

    return escaped.replace(regex, (match, ...args) => {
      // args contains the captured groups.
      // We check which group matched to determine the token type.

      // 1. Comment (Group 1)
      if (args[0]) return `<span style="color: ${theme.colors.comment}; font-style: italic;">${match}</span>`;

      // 2. String (Group 2, 3, 4)
      if (args[1]) return `<span style="color: ${theme.colors.string}">${match}</span>`;

      // 3. Keyword (Group 5)
      if (args[4]) return `<span style="color: ${theme.colors.keyword}">${match}</span>`;

      // 4. Function (Group 6)
      if (args[5]) return `<span style="color: ${theme.colors.function}">${match}</span>`;

      // 5. Property (Group 7)
      if (args[6]) return `<span style="color: ${theme.colors.property}">${match}</span>`;

      // 6. Class (Group 8)
      if (args[7]) return `<span style="color: ${theme.colors.className}">${match}</span>`;

      // 7. Number (Group 9)
      if (args[8]) return `<span style="color: ${theme.colors.number}">${match}</span>`;

      // 8. Member Access (Group 10)
      if (args[9]) return `.<span style="color: ${theme.colors.property}">${args[9]}</span>`;

      // 9. Operator (Group 11)
      if (args[10]) return `<span style="color: ${theme.colors.operator}">${match}</span>`;

      // 10. Variable (Group 12)
      if (args[11]) return `<span style="color: #abb2bf">${match}</span>`;

      return match;
    });
  }

  render() {
    return new Container({
      color: theme.colors.codeBg,
      padding: '1.5rem',
      style: {
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
