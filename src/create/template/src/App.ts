import { HTMLPropsMixin, prop } from '@html-props/core';
import { Anchor, Button, Code, Heading1, Image, Paragraph } from '@html-props/built-ins';
import { Column, Row } from '@html-props/layout';

// Using prop() for reactive state - reconciliation handles efficient DOM updates
export default class App extends HTMLPropsMixin(HTMLElement, {
  count: prop(0),
}) {
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
              onclick: () => {
                this.count++;
              },
              textContent: `count is ${this.count}`,
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
