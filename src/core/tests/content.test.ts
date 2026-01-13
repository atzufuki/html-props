/**
 * Content Rendering Specification Tests
 *
 * Nämä testit validoivat docs/internal/content-rendering-spec.md
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

/** Yksinkertainen wrapper ilman render-metodia */
class SimpleWrapper extends HTMLPropsMixin(HTMLElement) {}
SimpleWrapper.define('simple-wrapper');

/** Komponentti jolla on render-metodi */
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

/** Komponentti joka käyttää content:ia renderissä */
class ContentInRender extends HTMLPropsMixin(HTMLElement) {
  constructor(props?: Record<string, unknown>) {
    super(props);
    this.attachShadow({ mode: 'open' });
  }
  render() {
    const span = document.createElement('span');
    // content getter pitäisi olla käytettävissä
    // @ts-ignore - content tulee getteristä
    span.textContent = `Prefix: ${this.content ?? ''}`;
    return span;
  }
}
ContentInRender.define('content-in-render');

/** Shadow DOM komponentti */
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
// Spec: Content-prop mapattuu replaceChildren()
// =============================================================================

Deno.test('content-prop: string mapattuu replaceChildren():iin', () => {
  const el = new SimpleWrapper({ content: 'Hello' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Hello');

  el.remove();
});

Deno.test('content-prop: array mapattuu replaceChildren():iin', () => {
  const el = new SimpleWrapper({
    content: ['Hello', ' ', 'World'],
  });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Hello World');

  el.remove();
});

Deno.test('content-prop: Node mapattuu replaceChildren():iin', () => {
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
// Spec: Render-kohde (host vs shadowRoot)
// =============================================================================

Deno.test('render-kohde: ilman shadowRoot renderöi host:iin', () => {
  const el = new SimpleWrapper({ content: 'Host content' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Host content');
  assertEquals(el.shadowRoot, null);

  el.remove();
});

Deno.test('render-kohde: shadowRoot:lla renderöi shadowRoot:iin', () => {
  const el = new ShadowComponent();
  document.body.appendChild(el);

  assertEquals(el.shadowRoot?.textContent, 'Shadow content');
  // Light DOM pitäisi olla tyhjä
  assertEquals(el.childNodes.length, 0);

  el.remove();
});

Deno.test('render-kohde: render() komponentti kirjoittaa shadowRoot:iin', () => {
  const el = new RenderComponent();
  document.body.appendChild(el);

  // Render kirjoittaa shadowRoot:iin
  assertEquals(el.shadowRoot?.textContent, 'Rendered content');
  // Light DOM tyhjä
  assertEquals(el.childNodes.length, 0);

  el.remove();
});

// =============================================================================
// Spec: Content vs Render (eri kohteet, eivät kilpaile)
// =============================================================================

Deno.test('content vs render: molemmat toimivat yhdessä', () => {
  // content menee Light DOM:iin, render() menee Shadow DOM:iin
  const el = new RenderComponent({ content: 'Light DOM content' });
  document.body.appendChild(el);

  // render() kirjoittaa shadowRoot:iin
  assertEquals(el.shadowRoot?.textContent, 'Rendered content');
  // content kirjoittaa Light DOM:iin
  assertEquals(el.textContent, 'Light DOM content');

  el.remove();
});

Deno.test('content vs render: wrapper käyttää content:ia', () => {
  const el = new SimpleWrapper({ content: 'Wrapper content' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Wrapper content');

  el.remove();
});

Deno.test('content vs render: eksplisiittinen yhdistäminen toimii', () => {
  const el = new ContentInRender({ content: 'User content' });
  document.body.appendChild(el);

  // render() lukee content:n ja yhdistää sen shadowRoot:iin
  assertEquals(el.shadowRoot?.textContent, 'Prefix: User content');

  el.remove();
});

// =============================================================================
// Spec: CE-spec ja HTML upgrade
// =============================================================================

Deno.test('html upgrade: säilyttää olemassaolevan sisällön jos content ei annettu', () => {
  // Simuloi HTML upgrade: elementti on DOM:ssa ennen kuin se upgraydataan
  const el = document.createElement('simple-wrapper');
  el.textContent = 'Existing content';
  document.body.appendChild(el);

  // Tarkista että sisältö säilyi
  assertEquals(el.textContent, 'Existing content');

  el.remove();
});

Deno.test('html upgrade: content ylikirjoittaa olemassaolevan sisällön', () => {
  // Simuloi tilanne jossa content annetaan eksplisiittisesti
  const el = document.createElement('simple-wrapper') as SimpleWrapper;
  el.textContent = 'Existing content';
  document.body.appendChild(el);

  // Aseta content eksplisiittisesti
  // @ts-ignore - content on dynamic prop
  el.content = 'New content';

  assertEquals(el.textContent, 'New content');

  el.remove();
});

// =============================================================================
// Spec: Wrapperit (Lit/FAST simulaatio)
// =============================================================================

/**
 * Simuloi Lit-komponenttia jolla on oma requestUpdate
 */
class FakeLitBase extends HTMLElement {
  private _litUpdated = false;

  requestUpdate() {
    this._litUpdated = true;
    // Lit tekisi oman renderöinnin tässä
  }

  get litUpdated() {
    return this._litUpdated;
  }
}

class WrappedLitComponent extends HTMLPropsMixin(FakeLitBase) {}
WrappedLitComponent.define('wrapped-lit-component');

Deno.test('wrapper: content toimii vaikka parent delegoi requestUpdate:n', () => {
  const el = new WrappedLitComponent({ content: 'Lit content' });
  document.body.appendChild(el);

  // Content pitäisi toimia riippumatta siitä kuka hoitaa renderöinnin
  assertEquals(el.textContent, 'Lit content');

  el.remove();
});

Deno.test('wrapper: parent saa oman requestUpdate-kutsunsa', () => {
  const el = new WrappedLitComponent({ content: 'Test' });
  document.body.appendChild(el);

  // Lit:n requestUpdate pitäisi silti ajautua
  assertEquals(el.litUpdated, true);

  el.remove();
});

// =============================================================================
// Spec: Content-päivitykset (setter)
// =============================================================================

Deno.test('content-päivitys: setter päivittää DOM:n', () => {
  const el = new SimpleWrapper({ content: 'Initial' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Initial');

  // Päivitä content setterillä
  // @ts-ignore - content on dynamic prop
  el.content = 'Updated';

  assertEquals(el.textContent, 'Updated');

  el.remove();
});

Deno.test('content-päivitys: wrapper Lit-komponentissa', () => {
  const el = new WrappedLitComponent({ content: 'Initial' });
  document.body.appendChild(el);

  assertEquals(el.textContent, 'Initial');

  // Päivitä content - pitäisi toimia vaikka Lit delegoi requestUpdate:n
  // @ts-ignore - content on dynamic prop
  el.content = 'Updated via setter';

  assertEquals(el.textContent, 'Updated via setter');

  el.remove();
});
