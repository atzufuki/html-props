import * as Core from '@html-props/core';
import * as BuiltIns from '@html-props/built-ins';
import * as Signals from '@html-props/signals';
import * as Layout from '@html-props/layout';
import { theme } from '../theme.ts';

const { HTMLPropsMixin, prop } = Core;
const { effect } = Signals;
const { MediaQuery } = Layout;

export class LiveDemo extends HTMLPropsMixin(HTMLElement, {
  code: prop(''),
}) {
  private textarea!: HTMLTextAreaElement;
  private pre!: HTMLPreElement;
  private previewContainer!: HTMLElement;
  private errorContainer!: HTMLElement;
  private _disposeEffect: (() => void) | null = null;

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
    // @ts-ignore: super has connectedCallback from mixin
    if (super.connectedCallback) super.connectedCallback();

    // Scrollbar Styles
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

    // Layout
    this.style.display = 'grid';
    this.style.gap = '0'; // Gap handled by border
    this.style.backgroundColor = theme.colors.secondaryBg;
    this.style.border = `1px solid ${theme.colors.border}`;
    this.style.borderRadius = '1rem';
    this.style.overflow = 'hidden';
    this.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';

    // Editor Column
    const editorCol = document.createElement('div');
    editorCol.style.display = 'flex';
    editorCol.style.flexDirection = 'column';
    editorCol.style.minHeight = '400px'; // Reduced minHeight for mobile friendliness

    // Editor Wrapper
    const editorWrapper = document.createElement('div');
    editorWrapper.style.position = 'relative';
    editorWrapper.style.flex = '1';
    editorWrapper.style.backgroundColor = theme.colors.codeBg;
    editorWrapper.style.overflow = 'hidden';

    const commonStyles = `
      margin: 0;
      padding: 1rem;
      font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      border: none;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      white-space: pre;
      overflow: auto;
    `;

    // Pre (Highlighting)
    this.pre = document.createElement('pre');
    this.pre.style.cssText = commonStyles;
    this.pre.style.position = 'absolute';
    this.pre.style.top = '0';
    this.pre.style.left = '0';
    this.pre.style.pointerEvents = 'none';
    this.pre.style.color = theme.colors.text;
    this.pre.style.zIndex = '0';

    // Textarea (Input)
    this.textarea = document.createElement('textarea');
    this.textarea.value = this.code;
    this.textarea.style.cssText = commonStyles;
    this.textarea.style.position = 'absolute';
    this.textarea.style.top = '0';
    this.textarea.style.left = '0';
    this.textarea.style.zIndex = '1';
    this.textarea.style.color = 'transparent';
    this.textarea.style.background = 'transparent';
    this.textarea.style.caretColor = theme.colors.text;
    this.textarea.style.outline = 'none';
    this.textarea.style.resize = 'none';
    this.textarea.spellcheck = false;

    // Sync scroll
    this.textarea.addEventListener('scroll', () => {
      this.pre.scrollTop = this.textarea.scrollTop;
      this.pre.scrollLeft = this.textarea.scrollLeft;
    });

    // Simple auto-indent
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.updateHighlight();
        this.runCode();
      }
    });

    this.textarea.addEventListener('input', () => {
      this.updateHighlight();
      this.runCode();
    });

    editorWrapper.appendChild(this.pre);
    editorWrapper.appendChild(this.textarea);
    editorCol.appendChild(editorWrapper);

    // Error area
    this.errorContainer = document.createElement('div');
    this.errorContainer.style.padding = '0.5rem 1rem';
    this.errorContainer.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
    this.errorContainer.style.color = '#f87171';
    this.errorContainer.style.fontSize = '0.8rem';
    this.errorContainer.style.borderTop = '1px solid rgba(220, 38, 38, 0.2)';
    this.errorContainer.style.display = 'none';
    editorCol.appendChild(this.errorContainer);

    // Preview Column
    const previewCol = document.createElement('div');
    previewCol.style.display = 'flex';
    previewCol.style.flexDirection = 'column';
    previewCol.style.backgroundColor = theme.colors.secondaryBg;
    previewCol.style.backgroundImage = `radial-gradient(${theme.colors.border} 1px, transparent 1px)`;
    previewCol.style.backgroundSize = '20px 20px';
    previewCol.style.transition = 'background-color 0.3s';

    const previewContentWrapper = document.createElement('div');
    previewContentWrapper.style.flex = '1';
    previewContentWrapper.style.display = 'flex';
    previewContentWrapper.style.alignItems = 'center';
    previewContentWrapper.style.justifyContent = 'center';
    previewContentWrapper.style.padding = '2rem';

    this.previewContainer = document.createElement('div');
    this.previewContainer.style.background = theme.colors.bg;
    this.previewContainer.style.padding = '2rem';
    this.previewContainer.style.borderRadius = '0.5rem';
    this.previewContainer.style.border = `1px solid ${theme.colors.border}`;
    this.previewContainer.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    this.previewContainer.style.minWidth = '300px';

    previewContentWrapper.appendChild(this.previewContainer);
    previewCol.appendChild(previewContentWrapper);

    this.appendChild(editorCol);
    this.appendChild(previewCol);

    // Responsive Layout Effect
    this._disposeEffect = effect(() => {
      const isMobile = MediaQuery.isMobile();
      if (isMobile) {
        this.style.gridTemplateColumns = '1fr';
        this.style.gridTemplateRows = 'auto auto';
        editorCol.style.borderRight = 'none';
        editorCol.style.borderBottom = `1px solid ${theme.colors.border}`;
        editorCol.style.height = '400px';
      } else {
        this.style.gridTemplateColumns = '1fr 1fr';
        this.style.gridTemplateRows = 'auto';
        editorCol.style.borderRight = `1px solid ${theme.colors.border}`;
        editorCol.style.borderBottom = 'none';
        editorCol.style.height = 'auto';
        editorCol.style.minHeight = '855px';
      }
    });

    // Initial run
    this.updateHighlight();
    this.runCode();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._disposeEffect) {
      this._disposeEffect();
      this._disposeEffect = null;
    }
  }

  updateHighlight() {
    const code = this.textarea.value;
    // Add a trailing space to ensure the last line is rendered if it's empty
    this.pre.innerHTML = this.highlight(code) + '<br>';
  }

  runCode() {
    const code = this.textarea.value;
    this.errorContainer.style.display = 'none';
    this.errorContainer.textContent = '';

    try {
      // 1. Strip imports
      const cleanCode = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');

      // 2. Find class name
      const classMatch = cleanCode.match(/class\s+(\w+)/);
      if (!classMatch) throw new Error('No class definition found');
      const className = classMatch[1];

      // 3. Replace define with unique tag
      const uniqueTag = `live-${className.toLowerCase()}-${Math.random().toString(36).substring(7)}`;
      const codeWithUniqueTag = cleanCode.replace(
        /\.define\(['"](.*?)['"]\)/,
        `.define('${uniqueTag}')`,
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
          ${codeWithUniqueTag};
          return ${className};
        })()`,
      );

      const ComponentClass = func(...values);

      if (ComponentClass) {
        const instance = new ComponentClass();
        this.previewContainer.replaceChildren(instance);
      }
    } catch (e: any) {
      this.errorContainer.style.display = 'block';
      this.errorContainer.textContent = e.message;
    }
  }
}

LiveDemo.define('live-demo');
