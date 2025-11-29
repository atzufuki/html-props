export interface RefObject<T> {
  current: T | null;
}

export function createRef<T>(initialValue: T | null = null): RefObject<T> {
  return { current: initialValue };
}
