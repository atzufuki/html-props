import { HTMLPropsMixin } from '@html-props/core';
import { A, Div, H1, H2, H3, H4, H5, H6, Img, Li, Ol, P, Span, Ul } from '@html-props/built-ins';
import { CodeBlock } from './CodeBlock.ts';
import { MarkdownService } from '../services/MarkdownService.ts';
import { theme } from '../theme.ts';
import { effect } from '@html-props/signals';

export class MarkdownViewer extends HTMLPropsMixin(HTMLElement, {
  src: { type: String, default: '' },
  version: { type: String, default: 'local' },
  markdown: { type: String, default: '' }, // Add markdown prop
}) {
  private service = MarkdownService.getInstance();
  private loading = false;
  private error: string | null = null;
  private tokens: any[] = [];
  private _lastSrc = '';
  private _lastMarkdown = ''; // Track markdown changes
  private _disposeEffect: (() => void) | null = null;

  onMount() {
    this._disposeEffect = effect(() => {
      const markdown = this.markdown;
      const src = this.src;

      if (markdown) {
        // Avoid infinite loops if parseMarkdown triggers update which triggers effect?
        // parseMarkdown calls requestUpdate, which triggers render effect, not this effect.
        // But we should check if value actually changed to avoid redundant work if effect runs for other reasons.
        if (markdown !== this._lastMarkdown) {
          this.parseMarkdown(markdown);
        }
      } else if (src) {
        if (src !== this._lastSrc) {
          this.loadDoc();
        }
      }
    });
  }

  onUnmount() {
    if (this._disposeEffect) {
      this._disposeEffect();
      this._disposeEffect = null;
    }
  }

  async loadDoc() {
    if (this.loading) return;
    this._lastSrc = this.src;
    this.loading = true;
    this.error = null;
    this.tokens = [];
    this.requestUpdate();

    try {
      const content = await this.service.fetchDoc(this.src, this.version);
      this.tokens = content.tokens;
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  // Helper to parse direct markdown
  private parseMarkdown(content: string) {
    this._lastMarkdown = content;
    this.tokens = this.service.parse(content);
    this.requestUpdate();
  }

  render() {
    if (this.loading) {
      return new Div({ textContent: 'Loading...', style: { color: '#94a3b8', padding: '2rem' } });
    }

    if (this.error) {
      return new Div({ textContent: `Error: ${this.error}`, style: { color: 'red', padding: '2rem' } });
    }

    if (!this.tokens.length) {
      return new Div({ textContent: 'No content found.', style: { padding: '2rem', color: theme.colors.text } });
    }

    return new Div({
      className: 'markdown-content',
      content: this.tokens.map((t) => this.renderToken(t)),
    });
  }

  renderToken(token: any): any {
    switch (token.type) {
      case 'heading': {
        const H = [H1, H1, H2, H3, H4, H5, H6][token.depth] || H6;
        return new H({
          content: this.renderInline(token.tokens || []),
          style: {
            marginTop: '2rem',
            marginBottom: '1rem',
            color: theme.colors.text,
            fontSize: token.depth === 1 ? '2.5rem' : token.depth === 2 ? '1.8rem' : '1.4rem',
          },
        });
      }

      case 'paragraph':
        return new P({
          content: this.renderInline(token.tokens || []),
          style: {
            marginBottom: '1rem',
            lineHeight: '1.7',
            color: '#94a3b8',
          },
        });

      case 'code':
        return new CodeBlock({
          code: token.text,
        });

      case 'list': {
        const List = token.ordered ? Ol : Ul;
        return new List({
          style: { paddingLeft: '1.5rem', marginBottom: '1rem', color: '#94a3b8' },
          content: token.items.map((item: any) =>
            new Li({
              content: this.renderInline(item.tokens || []),
              style: { marginBottom: '0.5rem' },
            })
          ),
        });
      }

      case 'space':
        return null;

      default:
        console.warn('Unknown token type:', token.type, token);
        return null;
    }
  }

  renderInline(tokens: any[]): any[] {
    return tokens.map((t) => {
      if (t.type === 'text') {
        // Handle decoded HTML entities if necessary, but marked usually handles it.
        // However, we might want to parse simple text for safety or just return text node.
        return document.createTextNode(t.text);
      }
      if (t.type === 'strong') {
        return new Span({
          content: this.renderInline(t.tokens || []),
          style: { fontWeight: 'bold', color: theme.colors.text },
        });
      }
      if (t.type === 'em') {
        return new Span({
          content: this.renderInline(t.tokens || []),
          style: { fontStyle: 'italic' },
        });
      }
      if (t.type === 'codespan') {
        return new Span({
          textContent: t.text,
          style: {
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '0.2rem 0.4rem',
            borderRadius: '0.25rem',
            fontFamily: theme.fonts.mono,
            fontSize: '0.9em',
            color: theme.colors.accent,
          },
        });
      }
      if (t.type === 'link') {
        return new A({
          href: t.href,
          content: this.renderInline(t.tokens || []),
          style: { color: theme.colors.accent, textDecoration: 'none' },
        });
      }
      if (t.type === 'image') {
        let src = t.href;
        if (src && !src.startsWith('http') && !src.startsWith('/')) {
          if (this.version === 'local') {
            src = `/docs/${src}`;
          } else {
            src = `https://raw.githubusercontent.com/atzufuki/html-props/${this.version}/docs/${src}`;
          }
        }
        return new Img({
          src,
          alt: t.text,
          title: t.title,
          style: { maxWidth: '100%', borderRadius: '0.5rem', margin: '1rem 0', display: 'block' },
        });
      }
      return document.createTextNode(t.raw || '');
    });
  }
}

MarkdownViewer.define('markdown-viewer');
