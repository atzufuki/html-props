import type { PropConfig } from './types.ts';

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
): { default: T } & PropConfig {
  return {
    default: defaultValue,
    ...config,
  };
}
