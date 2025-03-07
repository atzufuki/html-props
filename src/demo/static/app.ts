import { HTMLPropsMixin } from '@html-props/core';

const Button = HTMLPropsMixin<HTMLButtonElement>(HTMLButtonElement).define(
  'html-button',
  {
    extends: 'button',
  },
);

class MyElement extends HTMLPropsMixin<MyElement>(HTMLElement) {
  text?: string;
  textColor?: string;

  getDefaultProps(props: this['props']): this['props'] {
    return {
      text: 'Default text',
      style: {
        color: props.textColor ?? 'blue',
      },
    };
  }

  render() {
    return this.text ?? '-';
  }
}

MyElement.define('my-element');

const element = new MyElement({ text: 'Hello world!', textColor: 'red' });
const button = new Button({ textContent: 'Click me!', type: 'button' });

document.body.appendChild(element);
document.body.appendChild(button);
