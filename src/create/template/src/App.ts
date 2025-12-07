import { createRef, HTMLPropsMixin } from '@html-props/core';
import { computed, effect, signal } from '@html-props/signals';
import { Anchor, Button, Code, Div, Heading1, Image, Paragraph } from '@html-props/built-ins';
import './App.css';

export default class App extends HTMLPropsMixin(HTMLElement) {
  aborter = new AbortController();
  buttonRef = createRef<HTMLButtonElement>();
  count = signal(0);
  doubleCount = computed(() => this.count() * 2);

  connectedCallback(): void {
    super.connectedCallback?.();

    const signal = this.aborter.signal;

    effect(() => {
      const button = this.buttonRef.current;
      if (button) {
        button.textContent = `count is ${this.count()}`;
      }
    }, { signal });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();
    this.aborter.abort();
  }

  render() {
    return new Div({
      content: [
        new Anchor({
          href: 'https://www.typescriptlang.org/',
          target: '_blank',
          content: new Image({
            src: '/typescript.svg',
            alt: 'TypeScript logo',
            className: 'logo',
          }),
        }),
        new Anchor({
          href: 'https://github.com/atzufuki/html-props',
          target: '_blank',
          content: new Image({
            src: '/html-props.svg',
            alt: 'HTML Props logo',
            className: 'logo html-props',
          }),
        }),
        new Heading1({ textContent: 'TypeScript + HTML Props' }),
        new Div({
          className: 'card',
          content: [
            new Button({
              ref: this.buttonRef,
              onclick: () => {
                this.count.update((c) => c + 1);
              },
              textContent: `count is ${this.count.get()}`,
            }),
            new Paragraph({
              content: [
                'Edit ',
                new Code({ textContent: 'src/App.ts' }),
                ' and save to test bundling',
              ],
            }),
          ],
        }),
        new Paragraph({
          className: 'read-the-docs',
          textContent: 'Click on the TypeScript and HTML Props logos to learn more',
        }),
      ],
    });
  }
}

App.define('my-app');
