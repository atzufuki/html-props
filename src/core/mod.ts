import { createRef, type RefObject } from './ref.ts';
import { HTMLUtilityMixin } from './mixins/utility.ts';
import { HTMLTemplateMixin } from './mixins/template.ts';
import { HTMLPropsMixin } from './mixins/props.ts';
import type {
  Constructor,
  HTMLPropsConstructorExtra,
  HTMLPropsExtra,
  HTMLTemplateConstructorExtra,
  HTMLTemplateExtra,
  HTMLUtilityConstructorExtra,
  HTMLUtilityExtra,
} from './types.ts';

export { createRef, HTMLPropsMixin, HTMLTemplateMixin, HTMLUtilityMixin, type RefObject };

/**
 * Type for the HTMLAllMixin function that combines HTMLPropsMixin, HTMLTemplateMixin, and HTMLUtilityMixin.
 */
type HTMLAllMixinType = <SuperClass extends Constructor<any, any>>(
  superClass: SuperClass,
) => <Props>() =>
  & Constructor<
    & InstanceType<SuperClass>
    & HTMLPropsExtra<Props>
    & HTMLTemplateExtra<Props>
    & HTMLUtilityExtra,
    Props
  >
  & Omit<SuperClass, keyof Constructor<any, any>>
  & HTMLPropsConstructorExtra
  & HTMLTemplateConstructorExtra
  & HTMLUtilityConstructorExtra;

/**
 * A mixin that combines HTMLPropsMixin, HTMLTemplateMixin, and HTMLUtilityMixin.
 * Provides full functionality for custom elements with props, rendering, and utility methods.
 */
const HTMLAllMixin = (<SuperClass extends Constructor<HTMLElement>>(superClass: SuperClass) => {
  return <Props>() => {
    return HTMLUtilityMixin(
      HTMLTemplateMixin(
        HTMLPropsMixin(superClass)<Props>(),
      ),
    );
  };
}) as HTMLAllMixinType;

export { HTMLAllMixin };
export default HTMLAllMixin;
