import HTMLProps, { HTMLPropsMixin, HTMLUtilityMixin } from '@html-props/core';

const Button = HTMLUtilityMixin(
  HTMLPropsMixin<HTMLButtonElement>(HTMLButtonElement),
).define(
  'html-button',
  {
    extends: 'button',
  },
);
const Div = HTMLUtilityMixin(
  HTMLPropsMixin<HTMLDivElement>(HTMLDivElement),
).define(
  'html-div',
  {
    extends: 'div',
  },
);

interface MyElementProps extends HTMLElement {
  text?: string;
  textColor?: string;
}

class MyElement extends HTMLProps<MyElementProps>(HTMLElement) {
  text?: string;
  textColor?: string;

  getDefaultProps(): this['props'] {
    return {
      text: 'Default text',
      style: {
        display: 'block',
        padding: '1rem',
        backgroundColor: 'lightgray',
        color: this.props.textColor ?? 'blue',
      },
    };
  }

  render() {
    return (
      <Div>
        {this.props.content}
      </Div>
    );
  }
}

MyElement.define('my-element');

const jsx = (
  <MyElement text='Hello world!' textColor='red'>
    <Button type='button'>Click me!</Button>
  </MyElement>
);

document.body.appendChild(jsx);
