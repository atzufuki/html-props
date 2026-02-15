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
  });
}

Deno.test("HTMLPropsMixin: Type Inference & Optional Types", async (t) => {
  await t.step("infers types from default values when type is omitted", () => {
    class InferredElement extends HTMLPropsMixin(HTMLElement, {
      count: prop(0, { attribute: true }), // Inferred Number
      active: prop(false, { attribute: true }), // Inferred Boolean
      label: prop("start", { attribute: true }), // Inferred String
    }) {}

    InferredElement.define("inferred-el");
    const el = new InferredElement();
    document.body.appendChild(el);

    // Check initial values
    assertEquals(el.count, 0);
    assertEquals(el.active, false);
    assertEquals(el.label, "start");

    // Check attribute reflection (initial)
    assertEquals(el.getAttribute("count"), "0");
    assertEquals(el.hasAttribute("active"), false);
    assertEquals(el.getAttribute("label"), "start");

    // Check attribute parsing (String -> Prop)

    // Number parsing
    el.setAttribute("count", "42");
    assertEquals(el.count, 42);

    // Boolean parsing
    el.setAttribute("active", "");
    assertEquals(el.active, true);
    el.removeAttribute("active");
    assertEquals(el.active, false);

    // String parsing
    el.setAttribute("label", "changed");
    assertEquals(el.label, "changed");

    document.body.removeChild(el);
  });

  await t.step("handles null defaults with explicit types", () => {
    class NullExplicitElement extends HTMLPropsMixin(HTMLElement, {
      count: prop<number | null>(null, { type: Number, attribute: true }),
      active: prop<boolean | null>(null, { type: Boolean, attribute: true }),
    }) {}

    NullExplicitElement.define("null-explicit-el");
    const el = new NullExplicitElement();
    document.body.appendChild(el);

    // Initial
    assertEquals(el.count, null);
    assertEquals(el.active, null);

    // Attribute parsing should still work based on explicit type
    el.setAttribute("count", "123");
    assertEquals(el.count, 123);

    el.setAttribute("active", "");
    assertEquals(el.active, true);

    document.body.removeChild(el);
  });

  await t.step(
    "handles null defaults without explicit types (fallback to String)",
    () => {
      class NullImplicitElement extends HTMLPropsMixin(HTMLElement, {
        // No type, default null -> treated as String/Any
        data: prop(null, { attribute: true }),
      }) {}

      NullImplicitElement.define("null-implicit-el");
      const el = new NullImplicitElement();
      document.body.appendChild(el);

      assertEquals(el.data, null);

      // Should treat attribute as string
      el.setAttribute("data", "123");
      assertEquals(el.data, "123"); // Not parsed as number

      document.body.removeChild(el);
    },
  );

  await t.step("handles Enum-like defaults", () => {
    class EnumElement extends HTMLPropsMixin(HTMLElement, {
      variant: { default: "primary", attribute: true },
    }) {}

    EnumElement.define("enum-el");
    const el = new EnumElement();
    document.body.appendChild(el);

    assertEquals(el.variant, "primary");

    el.variant = "secondary";
    assertEquals(el.getAttribute("variant"), "secondary");

    document.body.removeChild(el);
  });
});
