import { HTMLPropsMixin } from '@html-props/core';
import { H1, H2, H3, H4, H5, H6, P, Span } from '@html-props/built-ins';
import { theme } from '../theme.ts';

export class Heading extends HTMLPropsMixin(HTMLElement, {
  text: { type: String, default: '' },
  html: { type: String, default: '' },
  level: { type: String, default: '2' }, // 1-6
  align: { type: String, default: 'left' },
  color: { type: String, default: '' },
}) {
  render() {
    const style = {
      fontWeight: '700',
      textAlign: this.align,
      color: this.color || theme.colors.text,
      margin: '0',
      marginBottom: '0.5rem',
    };

    const props: any = { style };

    if (this.html) {
      props.innerHTML = this.html;
    } else {
      props.textContent = this.text || this.textContent;
    }

    switch (this.level) {
      case '1':
        return new H1(props);
      case '2':
        return new H2(props);
      case '3':
        return new H3(props);
      case '4':
        return new H4(props);
      case '5':
        return new H5(props);
      case '6':
        return new H6(props);
      default:
        return new H2(props);
    }
  }
}
Heading.define('app-heading');

export class SectionHeading extends HTMLPropsMixin(HTMLElement, {
  text: { type: String, default: '' },
  align: { type: String, default: 'center' },
}) {
  render() {
    return new Heading({
      text: this.text,
      level: '2',
      align: this.align,
      style: {
        fontSize: '2.5rem',
        marginBottom: '1rem',
      },
    });
  }
}
SectionHeading.define('app-section-heading');

export class Text extends HTMLPropsMixin(HTMLElement, {
  text: { type: String, default: '' },
  variant: { type: String, default: 'body' }, // body, muted, small, code
  align: { type: String, default: 'left' },
  tag: { type: String, default: 'p' },
}) {
  render() {
    const style: any = {
      textAlign: this.align,
      margin: '0',
    };

    if (this.variant === 'muted') {
      style.color = '#94a3b8';
    } else if (this.variant === 'small') {
      style.fontSize = '0.9rem';
      style.color = '#64748b';
    } else if (this.variant === 'code') {
      style.fontFamily = theme.fonts.mono;
      style.color = theme.colors.accent;
    } else {
      style.color = theme.colors.text;
    }

    const content = this.text || this.textContent;

    if (this.tag === 'span') {
      return new Span({ textContent: content, style });
    }
    return new P({ textContent: content, style });
  }
}
Text.define('app-text');
