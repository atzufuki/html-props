import HTMLProps, { HTMLHelperMixin, HTMLPropsMixin } from '@html-props/core';

const Button = HTMLHelperMixin(
  HTMLPropsMixin<HTMLButtonElement>(HTMLButtonElement),
).define(
  'html-button',
  {
    extends: 'button',
  },
);

class MyElement extends HTMLProps<{
  text?: string;
  textColor?: string;
}>(HTMLElement) {
  text?: string;
  textColor?: string;

  getDefaultProps(): this['props'] {
    return {
      text: 'Default text',
      style: {
        color: this.props.textColor ?? 'blue',
      },
    };
  }

  render() {
    return this.text ?? '-';
  }
}

MyElement.define('my-element');

class MyButton extends HTMLProps(HTMLButtonElement) {
  render() {
    return this.textContent ?? '-';
  }
}

MyButton.define('my-custom-button', { extends: 'button' });

const element = new MyElement({ text: 'Hello world!', textColor: 'red' });
const button = new Button({ textContent: 'Click me!', type: 'button' });
const myButton = new MyButton({ textContent: 'Click me!' });

document.body.appendChild(element);
document.body.appendChild(button);
document.body.appendChild(myButton);
