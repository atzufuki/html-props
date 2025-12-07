import { type HTMLPropsElementConstructor, HTMLPropsMixin } from '@html-props/core';

type BuiltIn<T extends new (...args: any[]) => any> = HTMLPropsElementConstructor<T, {}> & Pick<T, keyof T>;

export const Div: BuiltIn<typeof HTMLDivElement> = HTMLPropsMixin(HTMLDivElement).define('html-div', {
  extends: 'div',
});
export const Span: BuiltIn<typeof HTMLSpanElement> = HTMLPropsMixin(HTMLSpanElement).define('html-span', {
  extends: 'span',
});
export const Button: BuiltIn<typeof HTMLButtonElement> = HTMLPropsMixin(HTMLButtonElement).define('html-button', {
  extends: 'button',
});
export const P: BuiltIn<typeof HTMLParagraphElement> = HTMLPropsMixin(HTMLParagraphElement).define('html-p', {
  extends: 'p',
});
export const A: BuiltIn<typeof HTMLAnchorElement> = HTMLPropsMixin(HTMLAnchorElement).define('html-a', {
  extends: 'a',
});
export const Img: BuiltIn<typeof HTMLImageElement> = HTMLPropsMixin(HTMLImageElement).define('html-img', {
  extends: 'img',
});
export const Input: BuiltIn<typeof HTMLInputElement> = HTMLPropsMixin(HTMLInputElement).define('html-input', {
  extends: 'input',
});
export const Label: BuiltIn<typeof HTMLLabelElement> = HTMLPropsMixin(HTMLLabelElement).define('html-label', {
  extends: 'label',
});
export const H1: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h1', {
  extends: 'h1',
});
export const H2: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h2', {
  extends: 'h2',
});
export const H3: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h3', {
  extends: 'h3',
});
export const H4: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h4', {
  extends: 'h4',
});
export const H5: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h5', {
  extends: 'h5',
});
export const H6: BuiltIn<typeof HTMLHeadingElement> = HTMLPropsMixin(HTMLHeadingElement).define('html-h6', {
  extends: 'h6',
});
export const Ul: BuiltIn<typeof HTMLUListElement> = HTMLPropsMixin(HTMLUListElement).define('html-ul', {
  extends: 'ul',
});
export const Ol: BuiltIn<typeof HTMLOListElement> = HTMLPropsMixin(HTMLOListElement).define('html-ol', {
  extends: 'ol',
});
export const Li: BuiltIn<typeof HTMLLIElement> = HTMLPropsMixin(HTMLLIElement).define('html-li', { extends: 'li' });
export const Table: BuiltIn<typeof HTMLTableElement> = HTMLPropsMixin(HTMLTableElement).define('html-table', {
  extends: 'table',
});
export const Thead: BuiltIn<typeof HTMLTableSectionElement> = HTMLPropsMixin(HTMLTableSectionElement).define(
  'html-thead',
  { extends: 'thead' },
);
export const Tbody: BuiltIn<typeof HTMLTableSectionElement> = HTMLPropsMixin(HTMLTableSectionElement).define(
  'html-tbody',
  { extends: 'tbody' },
);
export const Tr: BuiltIn<typeof HTMLTableRowElement> = HTMLPropsMixin(HTMLTableRowElement).define('html-tr', {
  extends: 'tr',
});
export const Th: BuiltIn<typeof HTMLTableCellElement> = HTMLPropsMixin(HTMLTableCellElement).define('html-th', {
  extends: 'th',
});
export const Td: BuiltIn<typeof HTMLTableCellElement> = HTMLPropsMixin(HTMLTableCellElement).define('html-td', {
  extends: 'td',
});
export const Form: BuiltIn<typeof HTMLFormElement> = HTMLPropsMixin(HTMLFormElement).define('html-form', {
  extends: 'form',
});
export const Section: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-section', {
  extends: 'section',
});
export const Header: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-header', {
  extends: 'header',
});
export const Footer: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-footer', {
  extends: 'footer',
});
export const Nav: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-nav', { extends: 'nav' });
export const Article: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-article', {
  extends: 'article',
});
export const Aside: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-aside', {
  extends: 'aside',
});
export const Main: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-main', { extends: 'main' });
export const Pre: BuiltIn<typeof HTMLPreElement> = HTMLPropsMixin(HTMLPreElement).define('html-pre', {
  extends: 'pre',
});
export const Code: BuiltIn<typeof HTMLElement> = HTMLPropsMixin(HTMLElement).define('html-code', { extends: 'code' });
export const Select: BuiltIn<typeof HTMLSelectElement> = HTMLPropsMixin(HTMLSelectElement).define('html-select', {
  extends: 'select',
});
export const Option: BuiltIn<typeof HTMLOptionElement> = HTMLPropsMixin(HTMLOptionElement).define('html-option', {
  extends: 'option',
});
