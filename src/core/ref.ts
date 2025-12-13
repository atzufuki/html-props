export interface RefObject<T> {
  current: T | null;
}

export function ref<T>(initialValue: T | null = null): RefObject<T> {
  return { current: initialValue };
}

/**
 * @deprecated Use `ref` instead.
 */
export function createRef<T>(initialValue: T | null = null): RefObject<T> {
  return ref(initialValue);
}
