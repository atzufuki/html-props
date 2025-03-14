export type RefObject<T> = { current: T | null };

export function createRef<T>(defaultValue: any = undefined): RefObject<T> {
  return { current: defaultValue };
}
