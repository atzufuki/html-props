import { HTMLPropsMixin } from '@html-props/core';
import { A, Button } from '@html-props/built-ins';
import { theme } from '../theme.ts';

export class AppButton extends HTMLPropsMixin(HTMLElement, {
  label: { type: String, default: '' },
  variant: { type: String, default: 'primary' }, // primary, secondary
  href: { type: String, default: '' },
}) {
  render() {
    const isLink = !!this.href;
    const Tag = isLink ? A : Button;

    const baseStyle = {
      display: 'inline-block',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontWeight: '600',
      transition: 'all 0.2s',
      cursor: 'pointer',
      border: 'none',
      fontSize: '1rem',
      textDecoration: 'none',
      fontFamily: theme.fonts.sans,
    };

    const variants = {
      primary: {
        backgroundColor: theme.colors.accent,
        color: theme.colors.bg,
        border: '1px solid transparent',
      },
      secondary: {
        backgroundColor: theme.colors.secondaryBg,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
      },
    };

    const currentVariant = variants[this.variant as keyof typeof variants] || variants.primary;

    const props: any = {
      textContent: this.label,
      style: {
        ...baseStyle,
        ...currentVariant,
      },
      onmouseover: (e: MouseEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-1px)';
        if (this.variant === 'primary') {
          el.style.backgroundColor = theme.colors.accentHover;
        } else {
          el.style.borderColor = theme.colors.accent;
        }
      },
      onmouseout: (e: MouseEvent) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'none';
        if (this.variant === 'primary') {
          el.style.backgroundColor = theme.colors.accent;
        } else {
          el.style.borderColor = theme.colors.border;
        }
      },
    };

    if (isLink) {
      props.href = this.href;
    }

    return new Tag(props);
  }
}

AppButton.define('app-button');
