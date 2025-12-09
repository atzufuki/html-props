import type { PropConfig } from './types.ts';

export type Prop<T> = { default: T } & PropConfig;

/**
 * Helper to define a property with an explicit type and default value.
 *
 * @example
 * ```ts
 * mode: prop<'light' | 'dark'>('light')
 * user: prop<User | null>(null, { type: Object })
 * ```
 */
export function prop<T>(
  defaultValue: T,
  config: Omit<PropConfig, 'default'> = {},
): Prop<T> {
  return {
    default: defaultValue,
    ...config,
  };
}
