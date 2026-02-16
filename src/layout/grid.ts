import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';

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
  render() {
    this.style.gridTemplateColumns = this.columns;
    this.style.gridTemplateRows = this.rows;
    this.style.gap = this.gap;
  }
}

Grid.define('layout-grid');
