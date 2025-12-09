import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';
import { effect } from '@html-props/signals';

const config: {
  columns: Prop<string>;
  rows: Prop<string>;
  gap: Prop<string>;
  style: { display: string };
} = {
  columns: prop('1fr'),
  rows: prop('auto'),
  gap: prop('0'),
  style: { display: 'grid' },
};

const GridBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class Grid extends GridBase {
  private _cleanup?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._cleanup = effect(() => {
      this.style.gridTemplateColumns = this.columns;
      this.style.gridTemplateRows = this.rows;
      this.style.gap = this.gap;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanup?.();
  }
}

Grid.define('layout-grid');
