import HTMLProps, { HTMLPropsMixin, HTMLUtilityMixin } from '@html-props/core';

const Div = HTMLUtilityMixin(HTMLPropsMixin<{}>(HTMLDivElement));

Div.define('html-div', {
  extends: 'div',
});

class MyElement extends HTMLProps<MyElement>(HTMLElement) {
  static get observedProperties() {
    return ['text', 'textColor'];
  }

  text?: string;
  textColor?: string;

  propertyChangedCallback(name: string, oldValue: any, newValue: any) {
    switch (name) {
      case 'text':
        const div = this.querySelector<HTMLDivElement>(Div.getSelectors());
        if (div) {
          div.textContent = newValue;
        }
        break;

      case 'textColor':
        this.style.color = newValue;
        break;

      default:
        break;
    }
  }

  getDefaultProps(): this['props'] {
    return {
      style: {
        display: 'block',
        backgroundColor: '#595959',
        color: this.props.textColor ?? '#3d3d95',
        boxSizing: 'border-box',
        borderRadius: '5px',
        overflow: 'inherit',
      },
    };
  }

  render() {
    return new Div({
      style: {
        display: 'flex',
        gap: '10px',
        padding: '10px',
        backgroundColor: 'inherit',
        color: 'inherit',
        width: 'inherit',
        height: 'inherit',
        boxSizing: 'inherit',
        overflow: 'inherit',
      },
      children: [
        this.text,
        this.props.child,
      ],
    });
  }
}

MyElement.define('my-element');

class MyButton extends HTMLProps<MyButton & HTMLButtonElement>(HTMLButtonElement) {
  static get observedProperties() {
    return ['text', 'color', 'textColor'];
  }

  text?: string;
  color?: string;
  textColor?: string;

  getDefaultProps(): this['props'] {
    return {
      color: '#3d3d95',
      textColor: '#f78787',
      style: {
        borderRadius: '20px',
        backgroundColor: 'inherit',
        color: 'inherit',
        width: 'inherit',
        height: 'inherit',
        boxSizing: 'inherit',
        overflow: 'inherit',
        cursor: 'pointer',
      },
      onmouseenter: (event) => {
        const button = this as unknown as MyButton & HTMLButtonElement;
        if (button.disabled) return;

        this.color = '#f78787';
        this.textColor = '#3d3d95';
        this.text = 'Hovered!';
      },
      onmouseleave: (event) => {
        const button = this as unknown as MyButton & HTMLButtonElement;
        if (button.disabled) return;

        const defaults = this.getDefaultProps();
        this.color = defaults.color;
        this.textColor = defaults.textColor;
        this.text = this.props.text;
      },
    };
  }

  propertyChangedCallback(name: string, oldValue: any, newValue: any) {
    switch (name) {
      case 'text':
        const div = this.querySelector<HTMLDivElement>(Div.getSelectors());
        if (div) {
          div.textContent = newValue;
        }
        break;

      case 'color':
        this.style.backgroundColor = newValue;
        break;

      case 'textColor':
        this.style.color = newValue;
        break;

      default:
        break;
    }
  }

  render() {
    return new Div({
      style: {
        display: 'block',
        padding: '10px',
        backgroundColor: 'inherit',
        color: 'inherit',
        width: 'inherit',
        height: 'inherit',
        boxSizing: 'inherit',
        overflow: 'inherit',
      },
      textContent: this.text,
    });
  }
}

MyButton.define('my-custom-button', { extends: 'button' });

class App extends HTMLProps<App>(HTMLElement) {
  getDefaultProps(): this['props'] {
    return {
      style: {
        display: 'block',
        padding: '10px',
        backgroundColor: '#232323',
        color: 'inherit',
        width: 'inherit',
        height: 'inherit',
        boxSizing: 'border-box',
        overflow: 'hidden',
      },
    };
  }

  render() {
    return new MyElement({
      text: 'Hello world!',
      textColor: '#ffffff',
      child: new MyButton({
        text: 'Click me!',
        onclick: (event) => {
          const button = event.currentTarget as MyButton & HTMLButtonElement;
          button.text = 'Clicked!';
          button.disabled = true;
          setTimeout(() => {
            button.text = 'Click me!';
            button.disabled = false;
          }, 3000);
        },
      }),
    });
  }
}

App.define('my-app');

document.body.appendChild(new App({}));
