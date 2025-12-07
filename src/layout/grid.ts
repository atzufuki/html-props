import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
} from '@html-props/core';
import { effect } from '@html-props/signals';

const config = {
  columns: { type: String, default: '1fr' },
  rows: { type: String, default: 'auto' },
  gap: { type: String, default: '0' },
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
