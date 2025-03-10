// deno-lint-ignore-file no-explicit-any

type Constructor<T> = new (...args: any[]) => T;

declare global {
  var JSX: {
    createElement: (type: Constructor<any> | string, props: any, ...children: any[]) => any;
  };
}

globalThis.JSX = {
  createElement: (type: Constructor<any> | string, props: any, ...children: any[]) => {
    if (typeof type === 'function') {
      return new type({ ...props, children });
    }

    return { type, props, children };
  },
};
