import {
  type HTMLPropsElementConstructor,
  HTMLPropsMixin,
  type InferConstructorProps,
  type InferProps,
} from '@html-props/core';
import { effect } from '@html-props/signals';
import { Alignment } from './stack.ts';

const config = {
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  padding: { type: String, default: '' },
  margin: { type: String, default: '' },
  color: { type: String, default: '' },
  border: { type: String, default: '' },
  radius: { type: String, default: '' },
  alignment: { type: String, default: '' },
  shadow: { type: String, default: '' },
  style: { display: 'block', boxSizing: 'border-box' },
};

const ContainerBase:
  & HTMLPropsElementConstructor<
    typeof HTMLElement,
    InferConstructorProps<typeof config>,
    InferProps<typeof config>
  >
  & Pick<typeof HTMLElement, keyof typeof HTMLElement> = HTMLPropsMixin(HTMLElement, config);

export class Container extends ContainerBase {
  private _dispose: (() => void) | null = null;

  onMount() {
    this._dispose = effect(() => {
      const w = this.width;
      if (w) this.style.width = w;

      const h = this.height;
      if (h) this.style.height = h;

      const p = this.padding;
      if (p) this.style.padding = p;

      const m = this.margin;
      if (m) this.style.margin = m;

      const c = this.color;
      if (c) this.style.backgroundColor = c;

      const b = this.border;
      if (b) this.style.border = b;

      const r = this.radius;
      if (r) this.style.borderRadius = r;

      const s = this.shadow;
      if (s) this.style.boxShadow = s;

      const align = this.alignment;
      if (align) {
        this.style.display = 'flex';
        // Map alignment to justify/align
        // We can reuse the logic from Stack or Flex, but Container alignment is usually single child.
        // Flutter: Alignment(x, y).
        // Here we can use the string constants from Stack.

        const cssAlign = (Alignment as any)[align] || align;
        // Alignment in Stack uses place-items (grid).
        // For flex:
        // center -> justify-content: center; align-items: center;

        if (cssAlign === 'center center') {
          this.style.justifyContent = 'center';
          this.style.alignItems = 'center';
        } else if (cssAlign === 'start start') {
          this.style.justifyContent = 'flex-start';
          this.style.alignItems = 'flex-start';
        }
        // ... full mapping is tedious. Maybe switch to Grid for alignment?
        // Grid is easier for 2D alignment.

        this.style.display = 'grid';
        this.style.placeItems = cssAlign;
      }
    });
  }

  onUnmount() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
  }
}
Container.define('layout-container');
