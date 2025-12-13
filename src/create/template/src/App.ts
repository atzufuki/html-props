import { HTMLPropsMixin, ref } from '@html-props/core';
import { signal } from '@html-props/signals';
import { Anchor, Button, Code, Heading1, Image, Paragraph } from '@html-props/built-ins';
import { Column, Row } from '@html-props/layout';

export default class App extends HTMLPropsMixin(HTMLElement) {
  buttonRef = ref<HTMLButtonElement>();
  count = signal(0);

  update() {
    const button = this.buttonRef.current;
    if (button) {
      button.textContent = `count is ${this.count.get()}`;
    }
  }

  render() {
    return new Column({
      crossAxisAlignment: 'center',
      content: [
        new Row({
          mainAxisAlignment: 'center',
          gap: '2rem',
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
          ],
        }),
        new Heading1({ textContent: 'TypeScript + HTML Props' }),
        new Column({
          className: 'card',
          crossAxisAlignment: 'center',
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
