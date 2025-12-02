import { HTMLPropsMixin } from '@html-props/core';
import { effect } from '@html-props/signals';

export class Grid extends HTMLPropsMixin(HTMLElement, {
  columns: { type: String, default: '1fr' },
  rows: { type: String, default: 'auto' },
  gap: { type: String, default: '0' },
  style: { display: 'grid' },
}) {
  private _cleanup?: () => void;

  onMount() {
    this._cleanup = effect(() => {
      this.style.gridTemplateColumns = this.columns;
      this.style.gridTemplateRows = this.rows;
      this.style.gap = this.gap;
    });
  }

  onUnmount() {
    this._cleanup?.();
  }
}

Grid.define('layout-grid');
