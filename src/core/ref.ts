import type { RefObject } from './types.ts';

export type { RefObject };

/**
 * Creates a RefObject with an optional default value.
 *
 * @template T - The type of the value held by the RefObject.
 * @param {any} [defaultValue=undefined] - The initial value of the RefObject.
 * @returns {RefObject<T>} - The created RefObject.
 */
export function createRef<T>(defaultValue: any = undefined): RefObject<T> {
  return { current: defaultValue };
}
