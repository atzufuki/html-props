import * as Core from '@html-props/core';
import * as BuiltIns from '@html-props/built-ins';
import * as Signals from '@html-props/signals';
import * as Layout from '@html-props/layout';
import { theme } from '../theme.ts';

const { HTMLPropsMixin, prop } = Core;
const { signal, effect } = Signals;
const { MediaQuery } = Layout;
const { Div } = BuiltIns;

export class LiveDemo extends HTMLPropsMixin(HTMLElement, {
  code: prop(''),
}) {
  private codeSignal = signal('');
  private errorSignal = signal('');
  private highlightedSignal = signal('');
  private isMobileSignal = signal(false);

  connectedCallback() {
    // @ts-ignore: super has connectedCallback from mixin
    if (super.connectedCallback) super.connectedCallback();

    // Initialize code signal with prop value
    this.codeSignal.set(this.code);

    // Responsive layout
    effect(() => {
      this.isMobileSignal.set(MediaQuery.isMobile());
    });

    // Update highlighting when code changes
    effect(() => {
      const code = this.codeSignal();
      this.highlightedSignal.set(this.highlight(code));
    });

    // Run code when it changes
    effect(() => {
      const code = this.codeSignal();
      this.runCode(code);
    });
  }

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
      if (args[11]) return `<span style="color: ${theme.colors.text}">${match}</span>`;

      return match;
    });
  }

  private handleCodeInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.codeSignal.set(textarea.value);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      this.codeSignal.set(newCode);
      textarea.value = newCode;
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }
  }

  private runCode(code: string) {
    this.errorSignal.set('');

    try {
      const cleanCode = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
      const classMatches = [...cleanCode.matchAll(/class\s+(\w+)/g)];
      if (classMatches.length === 0) throw new Error('No class definition found');
      const className = classMatches[classMatches.length - 1][1];

      const codeWithUniqueTags = cleanCode.replace(
        /\.define\s*\(\s*(['"`])(.*?)\1/g,
        (_match, quote, tagName) => {
          const random = Math.random().toString(36).substring(7);
          return `.define(${quote}live-${tagName}-${random}${quote}`;
        },
      );

      const context = {
        ...Core,
        ...BuiltIns,
        ...Signals,
        ...Layout,
        HTMLElement,
      };

      const keys = Object.keys(context);
      const values = Object.values(context);

      const func = new Function(
        ...keys,
        `return (function() { 
          ${codeWithUniqueTags};
          return ${className};
        })()`,
      );

      const ComponentClass = func(...values);
      if (ComponentClass) {
        const instance = new ComponentClass();
        const preview = this.querySelector('[data-preview]');
        if (preview) {
          preview.replaceChildren(instance);
        }
      }
    } catch (e: any) {
      this.errorSignal.set(e.message);
    }
  }

  render() {
    const isMobile = this.isMobileSignal();
    const hasError = this.errorSignal() !== '';

    return new Div({
      style: {
        display: 'grid',
        gap: '0',
        backgroundColor: theme.colors.secondaryBg,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gridTemplateRows: isMobile ? 'auto auto' : 'auto',
      },
      content: [
        // Editor Column
        new Div({
          style: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: isMobile ? '400px' : 'auto',
            borderRight: isMobile ? 'none' : `1px solid ${theme.colors.border}`,
            borderBottom: isMobile ? `1px solid ${theme.colors.border}` : 'none',
          },
          content: [
            // Editor wrapper - scrollable container
            new Div({
              style: {
                flex: '1',
                backgroundColor: theme.colors.codeBg,
                overflow: 'auto',
                maxHeight: '965px',
              },
              content: [
                // Grid container - pre and textarea overlay
                new Div({
                  style: {
                    display: 'grid',
                    minHeight: '100%',
                  },
                  content: [
                    // Pre (highlighted code)
                    new Div({
                      innerHTML: this.highlightedSignal() + '<br>',
                      style: {
                        gridArea: '1/1',
                        margin: '0',
                        padding: '1rem',
                        fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        color: theme.colors.text,
                        pointerEvents: 'none',
                        boxSizing: 'border-box',
                        whiteSpace: 'pre',
                      },
                    }),
                    // Textarea (input)
                    new BuiltIns.Textarea({
                      value: this.codeSignal(),
                      oninput: (e: Event) => this.handleCodeInput(e),
                      onkeydown: (e: KeyboardEvent) => this.handleKeyDown(e),
                      style: {
                        gridArea: '1/1',
                        margin: '0',
                        padding: '1rem',
                        fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        border: 'none',
                        boxSizing: 'border-box',
                        whiteSpace: 'pre',
                        color: 'transparent',
                        background: 'transparent',
                        caretColor: theme.colors.text,
                        outline: 'none',
                        resize: 'none',
                      },
                    }),
                  ],
                }),
              ],
            }),
            // Error display
            hasError
              ? new Div({
                textContent: this.errorSignal(),
                style: {
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  color: '#f87171',
                  fontSize: '0.8rem',
                  borderTop: '1px solid rgba(220, 38, 38, 0.2)',
                },
              })
              : null,
          ],
        }),
        // Preview Column
        new Div({
          style: {
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: theme.colors.secondaryBg,
            backgroundImage: `radial-gradient(${theme.colors.border} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          },
          content: [
            new Div({
              style: {
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
              },
              content: [
                new Div({
                  dataset: { preview: '' },
                  style: {
                    background: theme.colors.bg,
                    padding: '2rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${theme.colors.border}`,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    minWidth: '300px',
                  },
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }
}

LiveDemo.define('live-demo');
