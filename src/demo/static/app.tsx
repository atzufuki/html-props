import HTMLProps, { HTMLPropsMixin, HTMLUtilityMixin } from '@html-props/core';

const Button = HTMLUtilityMixin(
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
        padding: '1rem',
        backgroundColor: 'lightgray',
        color: this.props.textColor ?? 'blue',
      },
    };
  }
}

MyElement.define('my-element');

const jsx = (
  <MyElement text='Hello world!' textColor='red'>
    <Button type='button'>Click me!</Button>
  </MyElement>
);

document.body.appendChild(jsx);
