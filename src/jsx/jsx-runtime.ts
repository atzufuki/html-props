type Constructor<T> = new (...args: any[]) => T;

/**
 * Fragment component that renders its children directly.
 */
export function Fragment(props: { children?: any; content?: any }): any {
  return props.content ?? props.children;
}

/**
 * Creates an HTML element or a custom element (Automatic Runtime).
 *
 * @param {Constructor<HTMLElement> | string | typeof Fragment} type - The type of element to create.
 * @param {Object} props - The properties to set on the element.
 * @param {string} [key] - The key of the element.
 * @returns {HTMLElement | string | any[]} The created element.
 */
export function jsx(
  type: Constructor<HTMLElement> | string | typeof Fragment,
  props: Record<string, any>,
  key?: string,
): HTMLElement | string | any[] {
  if (typeof type === 'function') {
    // Handle Fragment
    if (type === Fragment) {
      return props.children;
    }

    const { children, ...rest } = props;
    const componentProps: any = { ...rest };

    if (children !== undefined) {
      // Flatten children to support Fragments and nested arrays
      componentProps.content = Array.isArray(children) ? children.flat(Infinity) : children;
    }

    // We assume it's a constructor for an HTMLElement
    return new (type as Constructor<HTMLElement>)(componentProps);
  }
  return '';
}

export const jsxs = jsx;
