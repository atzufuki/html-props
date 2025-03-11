type Constructor<T> = new (...args: any[]) => T;

/**
 * JSX namespace containing methods for creating elements.
 */
export const JSX = {
  /**
   * Creates an HTML element or a custom element.
   *
   * @param {Constructor<HTMLElement> | string} type - The type of element to create.
   * @param {Object|null} props - The properties to set on the element.
   * @param {...HTMLElement[][]} children - The children of the element.
   * @returns {HTMLElement | string} The created element or an empty string if the type is not a function.
   */
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
