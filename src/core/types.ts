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

// Generic PropsConfig that includes native properties of T for suggestions
export type PropsConfig<T = any> =
  & {
    [K in keyof T]?: NativePropertyType<T, K>;
  }
  & {
    [key: string]: any;
  };

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

type IsPropConfig<T> = T extends { type: PropType } ? true : false;
type HasDefault<T> = T extends { default: any } ? true : false;

// If T is PropConfig, use ConstructorType<T['type']>. Else use T (direct value type).
export type InferProps<C extends PropsConfig> = {
  [K in keyof C]: IsPropConfig<C[K]> extends true ? ConstructorType<C[K]['type']>
    : C[K];
};

export type InferConstructorProps<C extends PropsConfig> =
  & {
    // Required: PropConfig without default
    [K in keyof C as IsPropConfig<C[K]> extends true ? (HasDefault<C[K]> extends true ? never : K) : never]:
      ConstructorType<C[K]['type']>;
  }
  & {
    // Optional: PropConfig with default OR Direct Value
    [K in keyof C as IsPropConfig<C[K]> extends true ? (HasDefault<C[K]> extends true ? K : never) : K]?:
      IsPropConfig<C[K]> extends true ? ConstructorType<C[K]['type']> : C[K];
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

// Helper to get the expected type for a native property
// We allow Partial<CSSStyleDeclaration> | string for style
export type NativePropertyType<T, K extends keyof T> = K extends 'style' ? Partial<CSSStyleDeclaration> | string
  : T[K];

// Validator type to enforce:
// 1. Native properties must match their native type (no PropConfig allowed)
// 2. Custom properties must be valid PropConfig
export type PropsConfigValidator<T, C> = {
  [K in keyof C]: K extends keyof T ? NativePropertyType<T, K>
    : PropConfig;
};

export type HTMLProps<T> = Omit<Partial<T>, 'style'> & { style?: Partial<CSSStyleDeclaration> | string } & {
  [key: string]: any;
};
