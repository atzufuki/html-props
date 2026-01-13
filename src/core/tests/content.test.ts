/**
 * Content Rendering Specification Tests
 *
 * These tests validate docs/internal/content-rendering-spec.md
 */

import { assertEquals } from 'jsr:@std/assert';
import { JSDOM } from 'npm:jsdom';
import { HTMLPropsMixin /*prop*/ } from '../mod.ts';

// Setup DOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.customElements = dom.window.customElements;
globalThis.Node = dom.window.Node;

// =============================================================================
// Test Components
// =============================================================================

/** Simple wrapper without render method */
class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
SimpleWrapper.define('simple-wrapper');

/** Component with render method */
class RenderComponent extends HTMLPropsMixin(HTMLElement) {
  constructor(props?: Record<string, unknown>) {
    super(props);
    this.attachShadow({ mode: 'open' });
  }
  render() {
    return document.createTextNode('Rendered content');
  }
}
RenderComponent.define('render-component');

/** Component that uses content in render */
class ContentInRender extends HTMLPropsMixin(HTMLElement) {
  constructor(props?: Record<string, unknown>) {
    super(props);
    this.attachShadow({ mode: 'open' });
  }
  render() {
    const span = document.createElement('span');
    // content getter should be available
    // @ts-ignore - content comes from getter
    span.textContent = `Prefix: ${this.content ?? ''}`;
    return span;
  }
}
ContentInRender.define('content-in-render');

/** Shadow DOM component */
class ShadowComponent extends HTMLPropsMixin(HTMLElement) {
  constructor(props?: Record<string, unknown>) {
    super(props);
    this.attachShadow({ mode: 'open' });
  }
  render() {
    return document.createTextNode('Shadow content');
  }
}
ShadowComponent.define('shadow-component');

// =============================================================================
// Spec: Content prop maps to replaceChildren()
// =============================================================================

Deno.test('content-prop: string maps to replaceChildren()', () => {
  const el = new SimpleWrapper({ content: 'Hello' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Hello');

  el.remove();
});

Deno.test('content-prop: array maps to replaceChildren()', () => {
  const el = new SimpleWrapper({
    content: ['Hello', ' ', 'World'],
  });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Hello World');

  el.remove();
});

Deno.test('content-prop: Node maps to replaceChildren()', () => {
  const span = document.createElement('span');
  span.textContent = 'Span content';

  const el = new SimpleWrapper({ content: span });
  document.body.appendChild(el);

  assertEquals(el.children.length, 1);
  assertEquals(el.children[0].tagName, 'SPAN');
  assertEquals(el.children[0].textContent, 'Span content');

  el.remove();
});

// =============================================================================
// Spec: Render target (host vs shadowRoot)
// =============================================================================

Deno.test('render-target: without shadowRoot renders to host', () => {
  const el = new SimpleWrapper({ content: 'Host content' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Host content');
  assertEquals(el.shadowRoot, null);

  el.remove();
});

Deno.test('render-target: with shadowRoot renders to shadowRoot', () => {
  const el = new ShadowComponent();
  document.body.appendChild(el);

  assertEquals(el.shadowRoot?.textContent, 'Shadow content');
  // Light DOM should be empty
  assertEquals(el.childNodes.length, 0);

  el.remove();
});

Deno.test('render-target: render() component writes to shadowRoot', () => {
  const el = new RenderComponent();
  document.body.appendChild(el);

  // Render writes to shadowRoot
  assertEquals(el.shadowRoot?.textContent, 'Rendered content');
  // Light DOM empty
  assertEquals(el.childNodes.length, 0);

  el.remove();
});

// =============================================================================
// Spec: Content vs Render (different targets, no conflict)
// =============================================================================

Deno.test('content vs render: both work together', () => {
  // content goes to Light DOM, render() goes to Shadow DOM
  const el = new RenderComponent({ content: 'Light DOM content' });
  document.body.appendChild(el);

  // render() writes to shadowRoot
  assertEquals(el.shadowRoot?.textContent, 'Rendered content');
  // content writes to Light DOM
  assertEquals(el.textContent, 'Light DOM content');

  el.remove();
});

Deno.test('content vs render: wrapper uses content', () => {
  const el = new SimpleWrapper({ content: 'Wrapper content' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Wrapper content');

  el.remove();
});

Deno.test('content vs render: explicit combination works', () => {
  const el = new ContentInRender({ content: 'User content' });
  document.body.appendChild(el);

  // render() reads content and combines it into shadowRoot
  assertEquals(el.shadowRoot?.textContent, 'Prefix: User content');

  el.remove();
});

// =============================================================================
// Spec: CE-spec and HTML upgrade
// =============================================================================

Deno.test('html upgrade: preserves existing content if content not provided', () => {
  // Simulate HTML upgrade: element is in DOM before it gets upgraded
  const el = document.createElement('simple-wrapper');
  el.textContent = 'Existing content';
  document.body.appendChild(el);

  // Check that content was preserved
  assertEquals(el.textContent, 'Existing content');

  el.remove();
});

Deno.test('html upgrade: content overwrites existing content', () => {
  // Simulate situation where content is provided explicitly
  const el = document.createElement('simple-wrapper') as SimpleWrapper;
  el.textContent = 'Existing content';
  document.body.appendChild(el);

  // Set content explicitly
  // @ts-ignore - content is a dynamic prop
  el.content = 'New content';

  assertEquals(el.textContent, 'New content');

  el.remove();
});

// =============================================================================
// Spec: Content updates (setter)
// =============================================================================

Deno.test('content-update: setter updates DOM', () => {
  const el = new SimpleWrapper({ content: 'Initial' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Initial');

  // Update content with setter
  // @ts-ignore - content is a dynamic prop
  el.content = 'Updated';

  assertEquals(el.textContent, 'Updated');

  el.remove();
});
