import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
  type Prop,
  prop,
} from '@html-props/core';

const config: {
  flex: Prop<number>;
  style: { minWidth: string; minHeight: string };
} = {
  flex: prop(1),
  style: { minWidth: '0', minHeight: '0' },
};

const ExpandedBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(
    HTMLElement,
    config,
  );

/**
 * Expanded component for flex layouts.
 *
 * A widget that expands a child of a Row, Column, or Flex
 * so that the child fills the available space.
 *
 * Using an Expanded widget makes a child of a Row, Column, or Flex
 * expand to fill the available space along the main axis.
 *
 * @example
 * ```typescript
 * new Row({
 *   content: [
 *     new Icon({ name: "search" }),
 *     new Expanded({
 *       content: new Input({ placeholder: "Search..." }),
 *     }),
 *     new Button({ content: ["Go"] }),
 *   ],
 * });
 * ```
 */
export class Expanded extends ExpandedBase {
  render() {
    this.style.flex = String(this.flex);
  }
}

Expanded.define('layout-expanded');
