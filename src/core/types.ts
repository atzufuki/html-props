export type PropType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ArrayConstructor
  | ObjectConstructor;

export interface PropConfig {
  type: PropType;
  default?: unknown;
  reflect?: boolean;
  attr?: string;
  event?: string;
}

export type PropsConfig = Record<string, PropConfig>;

export type InferPropType<T> = T extends string ? StringConstructor
  : T extends number ? NumberConstructor
  : T extends boolean ? BooleanConstructor
  : T extends any[] ? ArrayConstructor
  : ObjectConstructor;

export type ConstructorType<T> = T extends StringConstructor ? string
  : T extends NumberConstructor ? number
  : T extends BooleanConstructor ? boolean
  : T extends ArrayConstructor ? any[]
  : T extends ObjectConstructor ? object
  : any;

export type InferProps<C extends PropsConfig> = {
  [K in keyof C]: ConstructorType<C[K]['type']>;
};

export interface TypedPropConfig<T> extends Omit<PropConfig, 'type' | 'default'> {
  type: InferPropType<T>;
  default?: T;
}

export interface HTMLPropsInterface {
  render(): Node | Node[] | null;
  onMount?(): void;
  onUnmount?(): void;
}

export type HTMLProps<T> = Omit<Partial<T>, 'style'> & { style?: Partial<CSSStyleDeclaration> | string } & {
  [key: string]: any;
};
