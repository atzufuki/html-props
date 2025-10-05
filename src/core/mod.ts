import type { Constructor, HTMLUtilityConstructor } from './types.ts';
import { createRef, type RefObject } from './ref.ts';
import { HTMLUtilityMixin } from './mixins/utility.ts';
import { HTMLTemplateMixin } from './mixins/template.ts';
import { HTMLPropsMixin } from './mixins/props.ts';

export { createRef, HTMLPropsMixin, HTMLTemplateMixin, HTMLUtilityMixin, type RefObject };

const HTMLAllMixin = <P = any, Base extends Constructor<any, any> = Constructor<HTMLElement>>(
  superClass: Base,
) => {
  type PropsType = 0 extends (1 & P) ? InstanceType<Base> : P;

  // Chain the mixins properly
  const WithProps = HTMLPropsMixin<P, Base>(superClass);
  const WithTemplate = HTMLTemplateMixin<PropsType, typeof WithProps>(WithProps as any);
  const WithUtility = HTMLUtilityMixin<PropsType, typeof WithTemplate>(WithTemplate as any);

  return WithUtility as unknown as HTMLUtilityConstructor<
    & InstanceType<Base>
    & InstanceType<typeof WithProps>
    & InstanceType<typeof WithTemplate>
    & InstanceType<typeof WithUtility>,
    PropsType
  >;
};

export default HTMLAllMixin;
