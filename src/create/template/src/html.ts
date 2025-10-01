import HTMLProps from "@html-props/core";

export const Div = HTMLProps(HTMLDivElement).define("html-div", {
  extends: "div",
});

export const Anchor = HTMLProps(HTMLAnchorElement).define("html-a", {
  extends: "a",
});

export const Image = HTMLProps(HTMLImageElement).define("html-img", {
  extends: "img",
});

export const Heading1 = HTMLProps(HTMLHeadingElement).define("html-h1", {
  extends: "h1",
});

export const Button = HTMLProps(HTMLButtonElement).define("html-button", {
  extends: "button",
});

export const Paragraph = HTMLProps(HTMLParagraphElement).define("html-p", {
  extends: "p",
});

export const Code = HTMLProps(HTMLElement).define("html-code", {
  extends: "code",
});
