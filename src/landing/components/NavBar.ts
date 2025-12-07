import { HTMLPropsMixin, prop } from '@html-props/core';
import { A, Button, Span } from '@html-props/built-ins';
import { Column, Container, Responsive, Row } from '@html-props/layout';
import { effect, signal } from '@html-props/signals';
import { theme } from '../theme.ts';
import { ThemeService } from '../services/ThemeService.ts';
import { IconButton, IconName } from './IconButton.ts';

export class NavBar extends HTMLPropsMixin(HTMLElement, {
  links: prop<Array<{ label: string; href: string }>>([], { type: Array }),
}) {
  private isOpen = signal(false);

  render() {
    return new Responsive({
      desktop: this.renderDesktop(),
      mobile: this.renderMobile(),
    });
  }

  renderDesktop() {
    return new Container({
      padding: '0.75rem 2rem',
      color: 'color-mix(in srgb, var(--color-bg), transparent 20%)',
      style: {
        borderBottom: `1px solid ${theme.colors.border}`,
        position: 'sticky',
        top: '0',
        backdropFilter: 'blur(8px)',
        zIndex: '100',
      },
      content: new Row({
        mainAxisAlignment: 'spaceBetween',
        crossAxisAlignment: 'center',
        content: [
          this.renderLogo(),
          new Row({
            gap: '2rem',
            crossAxisAlignment: 'center',
            content: [
              ...this.links.map((link) => this.renderLink(link)),
              this.renderThemeToggle(),
            ],
          }),
        ],
      }),
    });
  }

  renderThemeToggle() {
    const themeService = ThemeService.getInstance();

    const btn = new IconButton({
      onclick: () => themeService.toggle(),
      style: {
        color: theme.colors.text,
        width: '2.5rem',
        height: '2.5rem',
      },
    });

    effect(() => {
      const mode = themeService.mode();
      let icon: IconName = 'system';
      if (mode === 'light') icon = 'sun';
      if (mode === 'dark') icon = 'moon';

      (btn as any).icon = icon;
      (btn as any).label = `Theme: ${mode}`;
    });

    return btn;
  }

  renderMobile() {
    return new Container({
      padding: '1rem',
      color: 'color-mix(in srgb, var(--color-bg), transparent 5%)',
      style: {
        borderBottom: `1px solid ${theme.colors.border}`,
        position: 'sticky',
        top: '0',
        backdropFilter: 'blur(8px)',
        zIndex: '100',
      },
      content: new Column({
        content: [
          new Row({
            mainAxisAlignment: 'spaceBetween',
            crossAxisAlignment: 'center',
            content: [
              this.renderLogo(),
              new Button({
                textContent: this.isOpen() ? '✕' : '☰',
                style: {
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.text,
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                },
                onclick: () => this.isOpen.update((v) => !v),
              }),
            ],
          }),
          this.isOpen()
            ? new Column({
              gap: '1rem',
              style: { padding: '1rem 0' },
              content: [
                ...this.links.map((link) => this.renderLink(link, true)),
                new Row({
                  mainAxisAlignment: 'spaceBetween',
                  crossAxisAlignment: 'center',
                  style: { padding: '0.5rem 0', borderTop: `1px solid ${theme.colors.border}`, marginTop: '0.5rem' },
                  content: [
                    new Span({ textContent: 'Theme', style: { fontWeight: '500' } }),
                    this.renderThemeToggle(),
                  ],
                }),
              ],
            })
            : null,
        ],
      }),
    });
  }

  renderLogo() {
    return new Row({
      crossAxisAlignment: 'center',
      gap: '0.5rem',
      style: {
        fontWeight: '700',
        fontSize: '1.25rem',
      },
      content: [
        new Span({
          textContent: '</>',
          style: { color: theme.colors.accent },
        }),
        document.createTextNode(' HTML Props'),
      ],
    });
  }

  renderLink(link: { label: string; href: string }, mobile = false) {
    return new A({
      href: link.href,
      textContent: link.label,
      style: {
        color: theme.colors.text,
        fontWeight: '500',
        textDecoration: 'none',
        transition: 'color 0.2s',
        display: mobile ? 'block' : 'inline',
        padding: mobile ? '0.5rem 0' : '0',
      },
      onmouseover: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.accent,
      onmouseout: (e: MouseEvent) => (e.target as HTMLElement).style.color = theme.colors.text,
      onclick: () => {
        if (mobile) this.isOpen.set(false);
      },
    });
  }
}

NavBar.define('app-navbar');
