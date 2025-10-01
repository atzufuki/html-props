import HTMLProps, { createRef } from "@html-props/core";
import * as html from "./html.ts";
import "./App.css";

export default class App extends HTMLProps(HTMLElement) {
  static get observedProperties() {
    return ["count"];
  }

  count: number = 0;
  buttonRef = createRef<HTMLButtonElement>();

  propertyChangedCallback(
    name: string,
    oldValue: unknown,
    newValue: unknown,
  ): void {
    if (name === "count" && oldValue !== newValue) {
      const button = this.buttonRef.current;
      if (button) {
        button.textContent = `count is ${newValue}`;
      }
    }
  }

  render() {
    return new html.Div({
      content: [
        new html.Anchor({
          href: "https://jsr.io/@html-props",
          target: "_blank",
          content: new html.Image({
            src: "/html-props.svg",
            alt: "HTML Props logo",
            className: "logo",
          }),
        }),
        new html.Anchor({
          href: "https://www.typescriptlang.org/",
          target: "_blank",
          content: new html.Image({
            src: "/typescript.svg",
            alt: "TypeScript logo",
            className: "logo typescript",
          }),
        }),
        new html.Heading1({ textContent: "HTML Props + TypeScript" }),
        new html.Div({
          className: "card",
          content: [
            new html.Button({
              ref: this.buttonRef,
              onclick: () => {
                this.count++;
              },
              textContent: `count is ${this.count}`,
            }),
            new html.Paragraph({
              content: [
                "Edit ",
                new html.Code({ textContent: "src/App.ts" }),
                " and save to test bundling",
              ],
            }),
          ],
        }),
        new html.Paragraph({
          className: "read-the-docs",
          textContent:
            "Click on the HTML Props and TypeScript logos to learn more",
        }),
      ],
    });
  }
}

App.define("my-app");
