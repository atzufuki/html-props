import type { Content } from './types.ts';

/**
 * Inserts content into an HTMLElement, handling various content types including strings, nodes, and arrays.
 * @param element - The HTMLElement to insert content into.
 * @param content - The content to insert, which can be a string, Node, or array of such.
 */
export function insertContent(element: HTMLElement, content: Content) {
  const isHTML = (string: string) => {
    const doc = new DOMParser().parseFromString(string, 'text/html');
    return Array.from(doc.body.childNodes).some(
      (node) => node.nodeType === 1,
    );
  };

  const createFragmentFromHTML = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const fragment = document.createDocumentFragment();
    Array.from(tempDiv.childNodes).forEach((node) => fragment.appendChild(node));
    return fragment;
  };

  const convertContent = (contentItem: Node | string | unknown): Node | string => {
    if (contentItem instanceof Node) {
      return contentItem;
    }

    if (typeof contentItem === 'string') {
      return contentItem;
    }

    if (Array.isArray(contentItem)) {
      const fragment = document.createDocumentFragment();
      contentItem.forEach((item) => {
        const child = convertContent(item);
        if (typeof child === 'string') {
          fragment.appendChild(createFragmentFromHTML(child));
        } else {
          fragment.appendChild(child);
        }
      });
      return fragment;
    }

    return '';
  };

  const child = convertContent(content);

  if (typeof child === 'string' && isHTML(child)) {
    element.innerHTML = child;
  } else if (child instanceof DocumentFragment || child instanceof Node) {
    element.replaceChildren(child);
  }
}
