import { assertEquals } from 'jsr:@std/assert';
import { HTMLPropsMixin } from '../mixin.ts';
import { parseHTML } from 'linkedom';

// Setup environment
if (!globalThis.document) {
  const {
    window,
    document,
    customElements,
    HTMLElement,
    Node,
    CustomEvent,
  } = parseHTML('<!DOCTYPE html><html><body></body></html>');

  Object.assign(globalThis, {
    window,
    document,
    customElements,
    HTMLElement,
    Node,
    CustomEvent,
  });
}

Deno.test('HTMLPropsMixin: Type Inference & Optional Types', async (t) => {
  await t.step('infers types from default values when type is omitted', () => {
    class InferredElement extends HTMLPropsMixin(HTMLElement, {
      count: { default: 0, reflect: true }, // Inferred Number
      active: { default: false, reflect: true }, // Inferred Boolean
      label: { default: 'start', reflect: true }, // Inferred String
    }) {}

    InferredElement.define('inferred-el');
    const el = new InferredElement();
    document.body.appendChild(el);

    // Check initial values
    assertEquals(el.count, 0);
    assertEquals(el.active, false);
    assertEquals(el.label, 'start');

    // Check attribute reflection (initial)
    assertEquals(el.getAttribute('count'), '0');
    assertEquals(el.hasAttribute('active'), false);
    assertEquals(el.getAttribute('label'), 'start');

    // Check attribute parsing (String -> Prop)

    // Number parsing
    el.setAttribute('count', '42');
    assertEquals(el.count, 42);

    // Boolean parsing
    el.setAttribute('active', '');
    assertEquals(el.active, true);
    el.removeAttribute('active');
    assertEquals(el.active, false);

    // String parsing
    el.setAttribute('label', 'changed');
    assertEquals(el.label, 'changed');

    document.body.removeChild(el);
  });

  await t.step('handles null defaults with explicit types', () => {
    class NullExplicitElement extends HTMLPropsMixin(HTMLElement, {
      count: { type: Number, default: null, reflect: true },
      active: { type: Boolean, default: null, reflect: true },
    }) {}

    NullExplicitElement.define('null-explicit-el');
    const el = new NullExplicitElement();
    document.body.appendChild(el);

    // Initial
    assertEquals(el.count, null);
    assertEquals(el.active, null);

    // Attribute parsing should still work based on explicit type
    el.setAttribute('count', '123');
    assertEquals(el.count, 123);

    el.setAttribute('active', '');
    assertEquals(el.active, true);

    document.body.removeChild(el);
  });

  await t.step('handles null defaults without explicit types (fallback to String)', () => {
    class NullImplicitElement extends HTMLPropsMixin(HTMLElement, {
      // No type, default null -> treated as String/Any
      data: { default: null, reflect: true },
    }) {}

    NullImplicitElement.define('null-implicit-el');
    const el = new NullImplicitElement();
    document.body.appendChild(el);

    assertEquals(el.data, null);

    // Should treat attribute as string
    el.setAttribute('data', '123');
    assertEquals(el.data, '123'); // Not parsed as number

    document.body.removeChild(el);
  });

  await t.step('handles Enum-like defaults', () => {
    class EnumElement extends HTMLPropsMixin(HTMLElement, {
      variant: { default: 'primary', reflect: true },
    }) {}

    EnumElement.define('enum-el');
    const el = new EnumElement();
    document.body.appendChild(el);

    assertEquals(el.variant, 'primary');

    el.variant = 'secondary';
    assertEquals(el.getAttribute('variant'), 'secondary');

    document.body.removeChild(el);
  });
});
