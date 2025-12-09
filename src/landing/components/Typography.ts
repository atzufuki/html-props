import { HTMLPropsMixin, prop } from '@html-props/core';
import { H1, H2, H3, H4, H5, H6, P, Span } from '@html-props/built-ins';
import { theme } from '../theme.ts';

export type TypographyVariant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall';

const styles: Record<TypographyVariant, any> = {
  displayLarge: { fontSize: '57px', lineHeight: '64px', letterSpacing: '-0.25px', fontWeight: '400' },
  displayMedium: { fontSize: '45px', lineHeight: '52px', letterSpacing: '0px', fontWeight: '400' },
  displaySmall: { fontSize: '36px', lineHeight: '44px', letterSpacing: '0px', fontWeight: '400' },
  headlineLarge: { fontSize: '32px', lineHeight: '40px', letterSpacing: '0px', fontWeight: '400' },
  headlineMedium: { fontSize: '28px', lineHeight: '36px', letterSpacing: '0px', fontWeight: '400' },
  headlineSmall: { fontSize: '24px', lineHeight: '32px', letterSpacing: '0px', fontWeight: '400' },
  titleLarge: { fontSize: '22px', lineHeight: '28px', letterSpacing: '0px', fontWeight: '400' },
  titleMedium: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0.15px', fontWeight: '500' },
  titleSmall: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' },
  bodyLarge: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0.5px', fontWeight: '400' },
  bodyMedium: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0.25px', fontWeight: '400' },
  bodySmall: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0.4px', fontWeight: '400' },
  labelLarge: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' },
  labelMedium: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' },
  labelSmall: { fontSize: '11px', lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' },
};

const defaultTags: Record<TypographyVariant, string> = {
  displayLarge: 'h1',
  displayMedium: 'h2',
  displaySmall: 'h3',
  headlineLarge: 'h4',
  headlineMedium: 'h5',
  headlineSmall: 'h6',
  titleLarge: 'h6',
  titleMedium: 'h6',
  titleSmall: 'h6',
  bodyLarge: 'p',
  bodyMedium: 'p',
  bodySmall: 'p',
  labelLarge: 'span',
  labelMedium: 'span',
  labelSmall: 'span',
};

export class Typography extends HTMLPropsMixin(HTMLElement, {
  variant: prop<TypographyVariant>('bodyMedium'),
  tag: prop(''),
  text: prop(''),
  html: prop(''),
  color: prop(''),
  align: prop('left'),
}) {
  render() {
    const variantStyle = styles[this.variant] || styles.bodyMedium;
    const tag = this.tag || defaultTags[this.variant] || 'p';

    const style = {
      ...variantStyle,
      textAlign: this.align,
      color: this.color || theme.colors.text,
      margin: '0',
    };

    const props: any = { style };

    if (this.html) {
      props.innerHTML = this.html;
    } else {
      props.textContent = this.text || this.textContent;
    }

    switch (tag) {
      case 'h1':
        return new H1(props);
      case 'h2':
        return new H2(props);
      case 'h3':
        return new H3(props);
      case 'h4':
        return new H4(props);
      case 'h5':
        return new H5(props);
      case 'h6':
        return new H6(props);
      case 'span':
        return new Span(props);
      case 'p':
      default:
        return new P(props);
    }
  }
}

Typography.define('app-typography');
