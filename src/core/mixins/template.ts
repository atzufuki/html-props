import { insertContent } from '../content.ts';
import type { Constructor, Content, HTMLTemplateConstructorExtra, HTMLTemplateExtra } from '../types.ts';

/**
 * Symbol used to detect if HTMLTemplateMixin has already been applied to a class.
 * Prevents duplicate mixin application in inheritance chains.
 */
const TEMPLATE_MIXIN_APPLIED = Symbol.for('html-props:template-mixin-applied');

/**
 * A mixin that adds template rendering capabilities to a custom element.
 *
 * @template P - The type of the props.
 * @template Base - The base class to extend.
 * @returns {Constructor<HTMLTemplateMixinClass>} The extended class with template rendering capabilities.
 */
type HTMLTemplateMixinType = <SuperClass extends Constructor<any, any> & Record<string, any>>(
  superClass: SuperClass,
) => SuperClass extends Constructor<infer T, infer P> ?
    & Constructor<
      T & HTMLTemplateExtra<P>,
      P
    >
    & Omit<SuperClass, keyof Constructor<any, any>>
    & HTMLTemplateConstructorExtra
  : never;

/**
 * A mixin that adds template rendering capabilities to a custom element.
 * Provides render() and build() methods for dynamic content insertion.
 */
export const HTMLTemplateMixin: HTMLTemplateMixinType = <SuperClass>(superClass: SuperClass) => {
  // Check if this mixin is already applied in the prototype chain
  if ((superClass as any)[TEMPLATE_MIXIN_APPLIED]) {
    // Already applied - return a pass-through class that only adds type info
    return class HTMLTemplateMixinPassThrough extends (superClass as any) {
      static [TEMPLATE_MIXIN_APPLIED] = true;
    } as any;
  }

  // Not applied yet - apply the full mixin
  /**
   * Class that extends the superclass with template rendering capabilities.
   */
  return class HTMLTemplateMixinClass extends (superClass as Constructor<HTMLTemplateExtra>) {
    static [TEMPLATE_MIXIN_APPLIED] = true;
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
  } as any;
};
