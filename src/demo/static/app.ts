import { HTMLPropsMixin } from '@html-props/core';

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

document.body.appendChild(element);
