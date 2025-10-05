import { insertContent } from '../content.ts';
import type { Constructor, Content, HTMLElementLifecycles } from '../types.ts';

/**
 * A mixin that adds template rendering capabilities to a custom element.
 *
 * @template P - The type of the props.
 * @template Base - The base class to extend.
 * @returns {Constructor<HTMLTemplateMixinClass>} The extended class with template rendering capabilities.
 */
export const HTMLTemplateMixin = <P = any, Base extends Constructor<any, any> = Constructor<HTMLElement>>(
  superClass: Base,
) => {
  type PropsType = 0 extends (1 & P) ? InstanceType<Base> : P;

  class HTMLTemplateMixinClass extends (superClass as Constructor<HTMLElementLifecycles, any>) {
    connectedCallback(): void {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      this.build();
    }

    /**
     * Renders the content of the component.
     *
     * This method should be overridden by subclasses to provide the specific template rendering logic.
     * The return value can be a Node, a string, an array of Nodes, or null/undefined.
     *
     * @returns {Content} The rendered content of the component.
     */
    render?(): Content;

    /**
     * Builds the component by rendering its content based on the output of the `render` method.
     *
     * The `build` method processes the result of the `render` method, which can be a Node, a string,
     * an array of Nodes, or null/undefined. It then updates the component's children accordingly.
     *
     * @throws {Error} If the render result is of an invalid type.
     */
    build(): void {
      if (this.render) {
        const render = this.render();
        insertContent(this, render);
      }
    }
  }

  return HTMLTemplateMixinClass as unknown as Constructor<InstanceType<Base> & HTMLTemplateMixinClass, PropsType>;
};
