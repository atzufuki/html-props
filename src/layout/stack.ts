import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';

export const Alignment = {
  topLeft: 'start start',
  topCenter: 'start center',
  topRight: 'start end',
  centerLeft: 'center start',
  center: 'center center',
  centerRight: 'center end',
  bottomLeft: 'end start',
  bottomCenter: 'end center',
  bottomRight: 'end end',
} as const;

const config: {
  alignment: Prop<keyof typeof Alignment>;
  style: { display: string; gridTemplateAreas: string };
} = {
  alignment: prop<keyof typeof Alignment>('topLeft'),
  style: { display: 'grid', gridTemplateAreas: '"stack"' },
};

const StackBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class Stack extends StackBase {
  private _observer?: MutationObserver;

  connectedCallback() {
    super.connectedCallback();
    this.updateChildren();

    this._observer = new MutationObserver(() => this.updateChildren());
    this._observer.observe(this, { childList: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
  }

  private updateChildren() {
    Array.from(this.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        child.style.gridArea = 'stack';
      }
    });
  }

  render() {
    const align = this.alignment;
    this.style.placeItems = (Alignment as any)[align] || align;
  }
}
Stack.define('layout-stack');
