import { HTMLPropsMixin, prop } from '@html-props/core';
import {
  A,
  Div,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Img,
  Li,
  Ol,
  P,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Ul,
} from '@html-props/built-ins';
import { CodeBlock } from './CodeBlock.ts';
import { MarkdownService } from '../services/MarkdownService.ts';
import { theme } from '../theme.ts';
import { batch, signal } from '@html-props/signals';

export class MarkdownViewer extends HTMLPropsMixin(HTMLElement, {
  src: prop(''),
  version: prop('local'),
  markdown: prop(''), // Add markdown prop
}) {
  private service = MarkdownService.getInstance();
  private loading = false;
  private error: string | null = null;
  private tokens = signal<any[]>([]);

  async mountedCallback() {
    await this.service.fetchDoc(this.src, this.version);
    const doc = this.service.getDocSync(this.src, this.version);
    batch(() => {
      this.tokens.set(doc ? doc.tokens : []);
    });
  }

  render() {
    const tokens = this.tokens();

    if (this.loading) {
      return this.renderSkeleton();
    }

    if (this.error) {
      return new Div({
        textContent: `Error: ${this.error}`,
        style: { color: 'red', padding: '2rem' },
      });
    }

    return new Div({
      className: 'markdown-content',
      content: tokens.map((t) => this.renderToken(t)),
    });
  }

  renderSkeleton() {
    const lineStyle = {
      backgroundColor: theme.colors.border,
      borderRadius: '0.25rem',
      marginBottom: '1rem',
    };

    return new Div({
      style: {
        padding: '2rem 0',
        // Pulse animation + FadeIn with delay to prevent flash on fast loads
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, fadeIn 0.3s 0.2s both',
      },
      content: [
        // Title
        new Div({ style: { ...lineStyle, height: '2.5rem', width: '60%', marginBottom: '2rem' } }),
        // Paragraph 1
        new Div({ style: { ...lineStyle, height: '1rem', width: '100%' } }),
        new Div({ style: { ...lineStyle, height: '1rem', width: '90%' } }),
        new Div({ style: { ...lineStyle, height: '1rem', width: '95%' } }),
        // Spacer
        new Div({ style: { height: '2rem' } }),
        // Subtitle
        new Div({ style: { ...lineStyle, height: '1.75rem', width: '40%', marginBottom: '1.5rem' } }),
        // Paragraph 2
        new Div({ style: { ...lineStyle, height: '1rem', width: '100%' } }),
        new Div({ style: { ...lineStyle, height: '1rem', width: '85%' } }),
      ],
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
            fontSize: token.depth === 1 ? '1.75rem' : token.depth === 2 ? '1.5rem' : '1.25rem',
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

      case 'table': {
        return new Table({
          style: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '1.5rem',
            color: theme.colors.text,
          },
          content: [
            new Thead({
              content: new Tr({
                content: token.header.map((cell: any) =>
                  new Th({
                    content: this.renderInline(cell.tokens),
                    style: {
                      textAlign: cell.align || 'left',
                      padding: '0.75rem',
                      borderBottom: `1px solid ${theme.colors.border}`,
                      fontWeight: '600',
                    },
                  })
                ),
              }),
            }),
            new Tbody({
              content: token.rows.map((row: any) =>
                new Tr({
                  content: row.map((cell: any, i: number) =>
                    new Td({
                      content: this.renderInline(cell.tokens),
                      style: {
                        textAlign: token.header[i].align || 'left',
                        padding: '0.75rem',
                        borderBottom: `1px solid ${theme.colors.border}`,
                      },
                    })
                  ),
                })
              ),
            }),
          ],
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
    return tokens.flatMap((t) => {
      if (t.type === 'text') {
        if (t.tokens) {
          return this.renderInline(t.tokens);
        }
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
        let href = t.href;
        // Transform relative .md links to absolute paths for the router
        if (href && !href.startsWith('http') && !href.startsWith('/') && href.endsWith('.md')) {
          const page = href.slice(0, -3);
          href = `/docs/${this.version}/${page}`;
        }

        return new A({
          href,
          content: this.renderInline(t.tokens || []),
          style: { color: theme.colors.accent, textDecoration: 'none' },
        });
      }
      if (t.type === 'image') {
        let src = t.href;
        if (src && !src.startsWith('http') && !src.startsWith('/')) {
          const resolvedVersion = this.service.resolveVersion(this.version);
          if (resolvedVersion === 'local') {
            src = `/docs/${src}`;
          } else {
            src = `https://raw.githubusercontent.com/atzufuki/html-props/${resolvedVersion}/docs/${src}`;
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
