type Constructor<T> = new (...args: any[]) => T;

export const JSX = {
  createElement: (
    type: Constructor<HTMLElement> | string,
    props: {} | null,
    ...children: HTMLElement[][]
  ): HTMLElement | string => {
    if (typeof type === 'function') {
      return new type({ ...props, children: children.flat() });
    }

    return '';
  },
};
