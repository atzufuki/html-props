import { HTMLPropsMixin } from '@html-props/core';

export const Div = HTMLPropsMixin(HTMLDivElement).define('html-div', {
  extends: 'div',
});

export const Anchor = HTMLPropsMixin(HTMLAnchorElement).define('html-a', {
  extends: 'a',
});

export const Image = HTMLPropsMixin(HTMLImageElement).define('html-img', {
  extends: 'img',
});

export const Heading1 = HTMLPropsMixin(HTMLHeadingElement).define('html-h1', {
  extends: 'h1',
});

export const Button = HTMLPropsMixin(HTMLButtonElement).define('html-button', {
  extends: 'button',
});

export const Paragraph = HTMLPropsMixin(HTMLParagraphElement).define('html-p', {
  extends: 'p',
});

export const Code = HTMLPropsMixin(HTMLElement).define('html-code', {
  extends: 'code',
});
