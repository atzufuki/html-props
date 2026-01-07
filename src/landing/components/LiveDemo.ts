import * as Core from '@html-props/core';
import * as BuiltIns from '@html-props/built-ins';
import * as Signals from '@html-props/signals';
import * as Layout from '@html-props/layout';
import { ref } from '@html-props/core';
import { signal } from '@html-props/signals';
import { theme } from '../theme.ts';

const { HTMLPropsMixin, prop } = Core;
const { MediaQuery } = Layout;
const { Div } = BuiltIns;

export class LiveDemo extends HTMLPropsMixin(HTMLElement, {
  code: prop(''),
}) {
  // Refs for DOM access
  private textareaRef = ref<HTMLTextAreaElement>();
  private preRef = ref<HTMLPreElement>();
  private previewRef = ref<HTMLDivElement>();
  private errorRef = ref<HTMLDivElement>();

  // Internal state
  private highlightedCode = signal('');
  private errorMessage = signal('');
  private _disposers: Array<() => void> = [];
  private _previewContent?: ReturnType<typeof Signals.computed<Node | null>>;

  // Computed preview content from code evaluation (lazy init)
  private get previewContent() {
    if (!this._previewContent) {
      this._previewContent = Signals.computed(() => {
        const code = this.code; // Read the prop (which is a signal)

        // Don't evaluate empty code
        if (!code || code.trim().length === 0) {
          return null;
        }

        this.errorMessage.set('');

        try {
          // 1. Strip imports
          const cleanCode = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');

          // 2. Find class name
          const classMatches = [...cleanCode.matchAll(/class\s+(\w+)/g)];
          if (classMatches.length === 0) throw new Error('No class definition found');
          const className = classMatches[classMatches.length - 1][1];

          // 3. Replace define calls with unique tags
          const codeWithUniqueTags = cleanCode.replace(
            /\.define\s*\(\s*(['"`])(.*?)\1/g,
            (_match, quote, tagName) => {
              const random = Math.random().toString(36).substring(7);
              return `.define(${quote}live-${tagName}-${random}${quote}`;
            },
          );

          // 4. Execute
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
            return instance;
          }
          return null;
        } catch (e: any) {
          this.errorMessage.set(e.message);
          return null;
        }
      });
    }
    return this._previewContent;
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

  connectedCallback() {
    super.connectedCallback();

    // Add custom styles for scrollbars
    const style = document.createElement('style');
    style.textContent = `
      live-demo textarea::-webkit-scrollbar,
      live-demo pre::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      live-demo textarea::-webkit-scrollbar-track,
      live-demo pre::-webkit-scrollbar-track {
        background: ${theme.colors.codeBg};
      }
      live-demo textarea::-webkit-scrollbar-thumb,
      live-demo pre::-webkit-scrollbar-thumb {
        background: ${theme.colors.border};
        border-radius: 4px;
        border: 2px solid ${theme.colors.codeBg};
      }
      live-demo textarea::-webkit-scrollbar-thumb:hover,
      live-demo pre::-webkit-scrollbar-thumb:hover {
        background: ${theme.colors.comment};
      }
      live-demo textarea::-webkit-scrollbar-corner,
      live-demo pre::-webkit-scrollbar-corner {
        background: ${theme.colors.codeBg};
      }
    `;
    this.appendChild(style);

    // Setup event listeners after render
    setTimeout(() => {
      const textarea = this.textareaRef.current;
      const pre = this.preRef.current;

      if (!textarea || !pre) return;

      // Sync scroll between textarea and pre
      textarea.addEventListener('scroll', () => {
        pre.scrollTop = textarea.scrollTop;
        pre.scrollLeft = textarea.scrollLeft;
      });

      // Handle tab key for indentation
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 2;
          this.handleCodeChange(textarea.value);
        }
      });

      // Handle input changes
      textarea.addEventListener('input', () => {
        this.handleCodeChange(textarea.value);
      });

      // Initial code execution
      this.handleCodeChange(this.code);
    }, 0);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._disposers.forEach((d) => d());
    this._disposers = [];
  }

  handleCodeChange(code: string) {
    // Update highlighted code
    this.highlightedCode.set(this.highlight(code) + '<br>');
    // Update the code prop - this will automatically trigger previewContent recomputation
    this.code = code;
  }

  render() {
    const isMobile = MediaQuery.isMobile();
    const errorMsg = this.errorMessage();
    const highlighted = this.highlightedCode();

    const commonStyles = {
      margin: '0',
      padding: '1rem',
      fontFamily: "Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: '0.9rem',
      lineHeight: '1.5',
      border: 'none',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      whiteSpace: 'pre',
      overflow: 'auto',
    };

    // Editor wrapper
    const editorWrapper = new Div({
      style: {
        position: 'relative',
        flex: '1',
        backgroundColor: theme.colors.codeBg,
        overflow: 'hidden',
      },
      content: [
        // Highlighted code (pre)
        (() => {
          const pre = document.createElement('pre');
          pre.style.cssText = Object.entries(commonStyles)
            .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v}`)
            .join('; ');
          pre.style.position = 'absolute';
          pre.style.top = '0';
          pre.style.left = '0';
          pre.style.pointerEvents = 'none';
          pre.style.color = theme.colors.text;
          pre.style.zIndex = '0';
          pre.innerHTML = highlighted;
          this.preRef.current = pre;
          return pre;
        })(),
        // Textarea input
        (() => {
          const textarea = document.createElement('textarea');
          textarea.value = this.code;
          textarea.style.cssText = Object.entries(commonStyles)
            .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v}`)
            .join('; ');
          textarea.style.position = 'absolute';
          textarea.style.top = '0';
          textarea.style.left = '0';
          textarea.style.zIndex = '1';
          textarea.style.color = 'transparent';
          textarea.style.background = 'transparent';
          textarea.style.caretColor = theme.colors.text;
          textarea.style.outline = 'none';
          textarea.style.resize = 'none';
          textarea.spellcheck = false;
          this.textareaRef.current = textarea;
          return textarea;
        })(),
      ],
    });

    // Editor column
    const editorCol = new Div({
      style: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: isMobile ? '400px' : '962px',
        height: isMobile ? '400px' : 'auto',
        borderRight: isMobile ? 'none' : `1px solid ${theme.colors.border}`,
        borderBottom: isMobile ? `1px solid ${theme.colors.border}` : 'none',
      },
      content: [
        editorWrapper,
        // Error container
        new Div({
          ref: this.errorRef,
          style: {
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            color: '#f87171',
            fontSize: '0.8rem',
            borderTop: '1px solid rgba(220, 38, 38, 0.2)',
            display: errorMsg ? 'block' : 'none',
          },
          textContent: errorMsg,
        }),
      ],
    });

    // Preview column - use ref for dynamic content
    const previewCol = new Div({
      style: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.secondaryBg,
        backgroundImage: `radial-gradient(${theme.colors.border} 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
        transition: 'background-color 0.3s',
      },
      content: new Div({
        style: {
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        },
        content: new Div({
          ref: this.previewRef,
          style: {
            background: theme.colors.bg,
            padding: '2rem',
            borderRadius: '0.5rem',
            border: `1px solid ${theme.colors.border}`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            minWidth: '300px',
          },
          // Use computed signal - automatically updates when code changes
          content: this.previewContent(),
        }),
      }),
    });

    return new Div({
      style: {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gridTemplateRows: isMobile ? 'auto auto' : 'auto',
        gap: '0',
        backgroundColor: theme.colors.secondaryBg,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      content: [editorCol, previewCol],
    });
  }
}

LiveDemo.define('live-demo');
