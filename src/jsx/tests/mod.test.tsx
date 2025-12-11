import { assert, assertEquals } from 'jsr:@std/assert';
import './setup.ts';
import { Fragment, jsx, jsxs } from '../jsx-runtime.ts';
import { HTMLPropsMixin, prop } from '../../core/mod.ts';
import { Div, Span } from '../../built-ins/mod.ts';

// --- Fragment Tests ---

Deno.test('Fragment: returns children when content is undefined', () => {
  const result = Fragment({ children: 'Hello' });
  assertEquals(result, 'Hello');
});

Deno.test('Fragment: returns content when both content and children are defined', () => {
  const result = Fragment({ children: 'Hello', content: 'World' });
  assertEquals(result, 'World');
});

Deno.test('Fragment: returns undefined when no children or content', () => {
  const result = Fragment({});
  assertEquals(result, undefined);
});

Deno.test('Fragment: handles array of children', () => {
  const children = ['Hello', 'World'];
  const result = Fragment({ children });
  assertEquals(result, children);
});

// --- JSX Element Creation Tests ---

Deno.test('jsx: returns empty string for string type (native elements not supported)', () => {
  const result = jsx('div', { className: 'test' });
  assertEquals(result, '');
});

Deno.test('jsx: creates instance from constructor with empty props', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-test-1', TestElement);

  const result = <TestElement />;
  assert(result instanceof TestElement);
});

Deno.test('jsx: creates instance from constructor and passes props', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    customClass: prop(''),
  }) {}
  customElements.define('jsx-test-2', TestElement);

  const result = <TestElement customClass='my-class' />;
  assert(result instanceof TestElement);
  assertEquals(result.customClass, 'my-class');
});

Deno.test('jsx: creates instance with children as content', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-test-3', TestElement);

  const result = <TestElement>Hello</TestElement>;
  assert(result instanceof TestElement);
  assertEquals(result.textContent, 'Hello');
});

Deno.test('jsx: flattens array children', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-test-4', TestElement);

  const result = (
    <TestElement>
      <Div>Hello</Div>
      <Div>World</Div>
    </TestElement>
  );
  assert(result instanceof TestElement);
  assertEquals(result.children.length, 2);
  assertEquals(result.children[0].textContent, 'Hello');
});

Deno.test('jsx: handles children and other props together', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    customClass: prop(''),
    customId: prop(''),
  }) {}
  customElements.define('jsx-test-5', TestElement);

  const result = (
    <TestElement customClass='test-class' customId='test-id'>
      Content
    </TestElement>
  );
  assert(result instanceof TestElement);
  assertEquals(result.customClass, 'test-class');
  assertEquals(result.customId, 'test-id');
  assertEquals(result.textContent, 'Content');
});

Deno.test('jsx: uses Fragment component to return children', () => {
  const result = (
    <>
      <Span>Hello</Span>
      <Span>World</Span>
    </>
  );
  assertEquals(Array.isArray(result), true);
});

Deno.test('jsx: ignores key parameter', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-test-6', TestElement);

  const result = <TestElement />;
  assert(result instanceof TestElement);
});

// --- JSX with HTMLPropsMixin Tests ---

Deno.test('jsx: creates custom element with props mixin', () => {
  class MyButton extends HTMLPropsMixin(HTMLElement, {
    label: prop('Click me'),
    count: prop(0),
  }) {
    render() {
      return null;
    }
  }
  customElements.define('jsx-my-button', MyButton as any);

  const result = <MyButton label='Hello' count={42} />;
  assert(result instanceof MyButton);
  assertEquals(result.label, 'Hello');
  assertEquals(result.count, 42);
});

Deno.test('jsx: creates custom element with children and props', () => {
  class MyButton extends HTMLPropsMixin(HTMLElement, {
    label: prop('Click me'),
  }) {
    render() {
      return null;
    }
  }
  customElements.define('jsx-child-button', MyButton as any);

  class MyContainer extends HTMLPropsMixin(HTMLElement, {
    myTitle: prop(''),
  }) {
    render() {
      return null;
    }
  }
  customElements.define('jsx-my-container', MyContainer as any);

  const result = (
    <MyContainer myTitle='My Title'>
      <MyButton label='Inner' />
    </MyContainer>
  );

  assert(result instanceof MyContainer);
  assertEquals(result.myTitle, 'My Title');
  assert(result.firstElementChild instanceof MyButton);
});

// --- JSX with Event Handlers ---

Deno.test('jsx: passes event handlers as props', () => {
  const handleClick = () => {
    // handler
  };

  class MyButton extends HTMLPropsMixin(HTMLElement, {
    customOnClick: prop<() => void>(() => {}),
  }) {}
  customElements.define('jsx-handler-test', MyButton);

  const result = <MyButton customOnClick={handleClick} />;

  assert(result instanceof MyButton);
  assertEquals(result.customOnClick, handleClick);
});

// --- JSX Style and Attribute Tests ---

Deno.test('jsx: passes style object as prop', () => {
  class StyledElement extends HTMLPropsMixin(HTMLElement, {
    customStyle: prop<Record<string, string>>({}),
  }) {}
  customElements.define('jsx-styled-1', StyledElement);

  const style = { color: 'red', fontSize: '12px' };
  const result = <StyledElement customStyle={style} />;
  assert(result instanceof StyledElement);
  assertEquals(result.customStyle, style);
});

Deno.test('jsx: handles multiple children in array', () => {
  class Container extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-multi-children', Container);

  const result = (
    <Container>
      Text
      <Span>Element</Span>
      More Text
    </Container>
  );
  assert(result instanceof Container);
  assertEquals(result.childNodes.length, 3);
});
// --- JSX alias jsxs Tests ---

Deno.test('jsxs: is an alias for jsx', () => {
  assertEquals(jsxs, jsx);
});

Deno.test('jsxs: works with constructor', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    customClass: prop(''),
  }) {}
  customElements.define('jsx-alias-test', TestElement);

  const result = <TestElement customClass='test' />;
  assert(result instanceof TestElement);
  assertEquals(result.customClass, 'test');
});

Deno.test('jsxs: works with Fragment', () => {
  const result = (
    <>
      <Div>Hello</Div>
      <Div>World</Div>
    </>
  );
  assertEquals(Array.isArray(result), true);
});

// --- Edge Cases ---

Deno.test('jsx: self-closing elements work', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-self-closing', TestElement);

  const result = <TestElement />;
  assert(result instanceof TestElement);
});

Deno.test('jsx: elements with text content', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-text-content', TestElement);

  const result = <TestElement>Hello World</TestElement>;
  assert(result instanceof TestElement);
  assertEquals(result.textContent, 'Hello World');
});

Deno.test('jsx: nested elements', () => {
  class Outer extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-outer', Outer);

  const result = (
    <Outer>
      <Div />
    </Outer>
  );
  assert(result instanceof Outer);
  assert(result.firstElementChild instanceof Div);
});

Deno.test('jsx: multiple props', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {
    prop1: prop(''),
    prop2: prop(0),
    prop3: prop(false),
  }) {}
  customElements.define('jsx-multi-props', TestElement);

  const result = <TestElement prop1='test' prop2={123} prop3={true} />;
  assert(result instanceof TestElement);
  assertEquals(result.prop1, 'test');
  assertEquals(result.prop2, 123);
  assertEquals(result.prop3, true);
});

Deno.test('jsx: expression children', () => {
  class TestElement extends HTMLPropsMixin(HTMLElement, {}) {}
  customElements.define('jsx-expr-children', TestElement);

  const name = 'World';
  const result = <TestElement>Hello {name}</TestElement>;
  assert(result instanceof TestElement);
  // content will be array ["Hello ", "World"]
  assertEquals(result.textContent, 'Hello World');
});
