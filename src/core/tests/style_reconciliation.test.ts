import { assertEquals } from "jsr:@std/assert";
import { HTMLPropsMixin } from "../mixin.ts";
import { prop } from "../prop.ts";

import { Window } from "happy-dom";

// Setup environment with happy-dom
if (!globalThis.document) {
  const happyWindow = new Window();

  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  Object.assign(globalThis, {
    window: happyWindow,
    document: w.document,
    customElements: w.customElements,
    HTMLElement: w.HTMLElement,
    Node: w.Node,
    CustomEvent: w.CustomEvent,
    MutationObserver: w.MutationObserver,
  });
}

// =============================================================================
// Test: Style values should be cleared when switching between render states
// =============================================================================
// This test simulates the issue where:
// 1. Component renders with isLoading=true, showing a container with
//    display:flex, alignItems:center, justifyContent:center
// 2. Component renders with isLoading=false, showing a container WITHOUT
//    those style properties
// 3. BUG: The old style properties (display:flex, alignItems:center) persist
//    because applyStyle only adds/updates but never removes old values

Deno.test("Style reconciliation: old style values should be cleared when not present in new render", () => {
  // Inner container WITHOUT default styles - this is key for this test
  // We want to test that styles passed via props are cleared when not present in new render
  class InnerContainer extends HTMLPropsMixin(HTMLElement, {
    // No default style here!
  }) {
    render() {
      return null;
    }
  }
  customElements.define("inner-container-style-test", InnerContainer);

  // Parent component that switches between loading and content states
  class LoadingComponent extends HTMLPropsMixin(HTMLElement, {
    isLoading: prop(true),
  }) {
    render() {
      if (this.isLoading) {
        // Loading state: container with centering styles
        return new InnerContainer({
          dataset: { key: "container" },
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
          },
        });
      }

      // Content state: container WITHOUT centering styles
      return new InnerContainer({
        dataset: { key: "container" },
        style: {
          maxWidth: "1200px",
          margin: "0 auto",
          // NOTE: display, alignItems, justifyContent are NOT specified here
        },
      });
    }
  }
  customElements.define("loading-component-style-test", LoadingComponent);

  const el = new LoadingComponent();
  el.connectedCallback();

  // Verify loading state styles
  const containerLoading = el.querySelector(
    "inner-container-style-test",
  ) as HTMLElement;
  assertEquals(
    containerLoading.style.display,
    "flex",
    "Loading: display should be flex",
  );
  assertEquals(
    containerLoading.style.alignItems,
    "center",
    "Loading: alignItems should be center",
  );
  assertEquals(
    containerLoading.style.justifyContent,
    "center",
    "Loading: justifyContent should be center",
  );
  assertEquals(
    containerLoading.style.minHeight,
    "200px",
    "Loading: minHeight should be 200px",
  );

  // Switch to content state
  el.isLoading = false;

  // Get the container again (should be the same element after morphing)
  const containerContent = el.querySelector(
    "inner-container-style-test",
  ) as HTMLElement;

  // Verify content state styles
  assertEquals(
    containerContent.style.maxWidth,
    "1200px",
    "Content: maxWidth should be 1200px",
  );
  assertEquals(
    containerContent.style.margin,
    "0px auto",
    "Content: margin should be 0px auto",
  );

  // BUG CHECK: These should be empty/cleared, but currently they persist!
  assertEquals(
    containerContent.style.display,
    "",
    "Content: display should be cleared (was flex)",
  );
  assertEquals(
    containerContent.style.alignItems,
    "",
    "Content: alignItems should be cleared (was center)",
  );
  assertEquals(
    containerContent.style.justifyContent,
    "",
    "Content: justifyContent should be cleared (was center)",
  );
  assertEquals(
    containerContent.style.minHeight,
    "",
    "Content: minHeight should be cleared (was 200px)",
  );

  el.disconnectedCallback();
});

Deno.test("Style reconciliation: switching between completely different style objects", () => {
  class StyledBox extends HTMLPropsMixin(HTMLElement, {
    variant: prop<"A" | "B">("A"),
  }) {
    render() {
      if (this.variant === "A") {
        const div = document.createElement("div");
        div.dataset.key = "box";
        div.style.backgroundColor = "red";
        div.style.padding = "10px";
        div.style.border = "1px solid black";
        return div;
      }

      const div = document.createElement("div");
      div.dataset.key = "box";
      div.style.color = "blue";
      div.style.margin = "20px";
      // NOTE: backgroundColor, padding, border are NOT specified
      return div;
    }
  }
  customElements.define("styled-box-test", StyledBox);

  const el = new StyledBox();
  el.connectedCallback();

  const boxA = el.querySelector("div") as HTMLElement;
  assertEquals(
    boxA.style.backgroundColor,
    "red",
    "Variant A: backgroundColor should be red",
  );
  assertEquals(boxA.style.padding, "10px", "Variant A: padding should be 10px");
  assertEquals(
    boxA.style.border,
    "1px solid black",
    "Variant A: border should be set",
  );

  // Switch to variant B
  el.variant = "B";

  const boxB = el.querySelector("div") as HTMLElement;
  assertEquals(boxB.style.color, "blue", "Variant B: color should be blue");
  assertEquals(boxB.style.margin, "20px", "Variant B: margin should be 20px");

  // Old styles should be cleared
  assertEquals(
    boxB.style.backgroundColor,
    "",
    "Variant B: backgroundColor should be cleared",
  );
  assertEquals(boxB.style.padding, "", "Variant B: padding should be cleared");
  assertEquals(boxB.style.border, "", "Variant B: border should be cleared");

  el.disconnectedCallback();
});

Deno.test("Style reconciliation: styles set via props.style object should be clearable", () => {
  class DynamicStyleComponent extends HTMLPropsMixin(HTMLElement, {
    showCentered: prop(true),
  }) {
    render() {
      const container = document.createElement("div");
      container.dataset.key = "dynamic-container";

      if (this.showCentered) {
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
      } else {
        container.style.display = "block";
        // alignItems and justifyContent not set - should be cleared from previous
      }

      return container;
    }
  }
  customElements.define("dynamic-style-component-test", DynamicStyleComponent);

  const el = new DynamicStyleComponent();
  el.connectedCallback();

  const containerCentered = el.querySelector("div") as HTMLElement;
  assertEquals(containerCentered.style.display, "flex");
  assertEquals(containerCentered.style.alignItems, "center");
  assertEquals(containerCentered.style.justifyContent, "center");

  // Switch to non-centered
  el.showCentered = false;

  const containerBlock = el.querySelector("div") as HTMLElement;
  assertEquals(containerBlock.style.display, "block", "Should be block");

  // These should be cleared
  assertEquals(
    containerBlock.style.alignItems,
    "",
    "alignItems should be cleared",
  );
  assertEquals(
    containerBlock.style.justifyContent,
    "",
    "justifyContent should be cleared",
  );

  el.disconnectedCallback();
});

// =============================================================================
// Test: Default styles from config should be preserved during morphing
// =============================================================================
// This test simulates the issue where:
// 1. A component has default styles in its config (like Column: display:flex, flexDirection:column)
// 2. When morphing occurs, applyStyle is called with a new style object
// 3. BUG: The default styles get cleared because they're not in the new style object

Deno.test("Style reconciliation: default styles from config should be preserved", () => {
  // Simulate a layout component like Column that has default styles
  class ColumnLike extends HTMLPropsMixin(HTMLElement, {
    // These are default styles that should always be present
    style: { display: "flex", flexDirection: "column" },
  }) {
    render() {
      return null;
    }
  }
  customElements.define("column-like-test", ColumnLike);

  // Parent that contains and may morph the ColumnLike
  class ParentComponent extends HTMLPropsMixin(HTMLElement, {
    count: prop(0),
  }) {
    render() {
      return new ColumnLike({
        dataset: { key: "column" },
        // Pass gap via style object, not as a separate prop
        style: { gap: "16px" },
        // Note: we're NOT specifying display or flexDirection here
        // because they're defaults that should be inherited from config
      });
    }
  }
  customElements.define("parent-component-default-style-test", ParentComponent);

  const el = new ParentComponent();
  el.connectedCallback();

  const column = el.querySelector("column-like-test") as HTMLElement;

  // Verify default styles are applied along with passed styles
  assertEquals(
    column.style.display,
    "flex",
    "Initial: display should be flex (from defaults)",
  );
  assertEquals(
    column.style.flexDirection,
    "column",
    "Initial: flexDirection should be column (from defaults)",
  );
  assertEquals(column.style.gap, "16px", "Initial: gap should be 16px");

  // Trigger a re-render by changing a prop
  el.count = 1;

  // Get the column again (should be the same element after morphing)
  const columnAfterMorph = el.querySelector("column-like-test") as HTMLElement;

  // Default styles should STILL be present
  assertEquals(
    columnAfterMorph.style.display,
    "flex",
    "After morph: display should still be flex (from defaults)",
  );
  assertEquals(
    columnAfterMorph.style.flexDirection,
    "column",
    "After morph: flexDirection should still be column (from defaults)",
  );
  assertEquals(
    columnAfterMorph.style.gap,
    "16px",
    "After morph: gap should still be 16px",
  );

  el.disconnectedCallback();
});

Deno.test("Style reconciliation: explicit style props should override and preserve defaults", () => {
  // Component with default styles
  class BoxWithDefaults extends HTMLPropsMixin(HTMLElement, {
    style: { display: "block", boxSizing: "border-box" },
  }) {
    render() {
      return null;
    }
  }
  customElements.define("box-with-defaults-test", BoxWithDefaults);

  // Parent that passes additional styles
  class ParentWithStyles extends HTMLPropsMixin(HTMLElement, {
    useRed: prop(true),
  }) {
    render() {
      return new BoxWithDefaults({
        dataset: { key: "box" },
        style: this.useRed
          ? { backgroundColor: "red", padding: "10px" }
          : { backgroundColor: "blue", margin: "20px" },
      });
    }
  }
  customElements.define("parent-with-styles-test", ParentWithStyles);

  const el = new ParentWithStyles();
  el.connectedCallback();

  const box = el.querySelector("box-with-defaults-test") as HTMLElement;

  // Default styles should be present along with custom styles
  assertEquals(box.style.display, "block", "Default display should be block");
  assertEquals(
    box.style.boxSizing,
    "border-box",
    "Default boxSizing should be border-box",
  );
  assertEquals(
    box.style.backgroundColor,
    "red",
    "Custom backgroundColor should be red",
  );
  assertEquals(box.style.padding, "10px", "Custom padding should be 10px");

  // Switch styles
  el.useRed = false;

  const boxAfter = el.querySelector("box-with-defaults-test") as HTMLElement;

  // Default styles should STILL be present
  assertEquals(
    boxAfter.style.display,
    "block",
    "After switch: default display should still be block",
  );
  assertEquals(
    boxAfter.style.boxSizing,
    "border-box",
    "After switch: default boxSizing should still be border-box",
  );

  // New custom styles should be applied
  assertEquals(
    boxAfter.style.backgroundColor,
    "blue",
    "After switch: backgroundColor should be blue",
  );
  assertEquals(
    boxAfter.style.margin,
    "20px",
    "After switch: margin should be 20px",
  );

  // Old custom styles should be cleared
  assertEquals(
    boxAfter.style.padding,
    "",
    "After switch: padding should be cleared",
  );

  el.disconnectedCallback();
});
