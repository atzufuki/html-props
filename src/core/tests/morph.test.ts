// deno-lint-ignore-file no-explicit-any
import { assertEquals } from 'jsr:@std/assert';
import { parseHTML } from 'linkedom';
import { morph } from '../morph.ts';

// Setup environment
if (!globalThis.document) {
  const {
    window,
    document,
    customElements,
    HTMLElement,
    HTMLButtonElement,
    HTMLInputElement,
    HTMLTextAreaElement,
    HTMLSelectElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
  } = parseHTML('<!DOCTYPE html><html><body></body></html>');

  Object.assign(globalThis, {
    window,
    document,
    customElements,
    HTMLElement,
    HTMLButtonElement,
    HTMLInputElement,
    HTMLTextAreaElement,
    HTMLSelectElement,
    Node,
    CustomEvent,
    Event,
    MutationObserver,
  });
}

// Symbol used by @html-props/core for the controller
const PROPS_CONTROLLER = Symbol.for('html-props:controller');

/**
 * Helper to create a DOM element with content
 */
function createElement(tag: string, attrs: Record<string, string> = {}, children: any[] = []): any {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}

// ============================================================================
// Basic Morphing Tests
// ============================================================================

Deno.test('morph - updates text content', () => {
  const container = createElement('div', {}, [
    createElement('p', { id: 'para' }, ['Hello']),
  ]);
  // Mark the element to prove identity preservation
  (container.querySelector('p') as any)._marker = 'original';

  const newContent = createElement('p', { id: 'para' }, ['World']);
  morph(container, newContent);

  // Element should be reused (marker still present)
  assertEquals((container.querySelector('p') as any)._marker, 'original');
  // Content should be updated
  assertEquals(container.querySelector('p')!.textContent, 'World');
});

Deno.test('morph - updates attributes', () => {
  const container = createElement('div', {}, [
    createElement('a', { href: '/old', class: 'link' }),
  ]);
  (container.querySelector('a') as any)._marker = 'original';

  const newContent = createElement('a', { href: '/new', id: 'mylink' });
  morph(container, newContent);

  // Element should be reused
  assertEquals((container.querySelector('a') as any)._marker, 'original');
  // Attributes should be updated
  const a = container.querySelector('a')!;
  assertEquals(a.getAttribute('href'), '/new');
  assertEquals(a.getAttribute('id'), 'mylink');
  // Removed attribute should be gone
  assertEquals(a.hasAttribute('class'), false);
});

Deno.test('morph - removes stale style properties', () => {
  const container = createElement('div');
  const oldSpan = document.createElement('span') as any;
  oldSpan.style.color = 'red';
  oldSpan.style.backgroundColor = 'blue';
  oldSpan._marker = 'original';
  container.appendChild(oldSpan);

  const newSpan = document.createElement('span') as any;
  newSpan.style.color = 'green'; // Update this
  // Note: backgroundColor not set - should be removed from old

  morph(container, newSpan);

  // Element should be reused
  const span = container.querySelector('span') as any;
  assertEquals(span._marker, 'original');
  // Updated style
  assertEquals(span.style.color, 'green');
  // Stale style should be removed (essential for responsive layouts)
  assertEquals(span.style.backgroundColor, undefined);
});

Deno.test('morph - removes stale styles for responsive layout changes', () => {
  const container = createElement('div');
  const oldDiv = document.createElement('div');
  oldDiv.style.gap = '1.5rem';
  oldDiv.style.display = 'flex';
  container.appendChild(oldDiv);

  const newDiv = document.createElement('div');
  newDiv.style.display = 'flex'; // Same style
  // Note: gap not set - simulates new render without that style

  morph(container, newDiv);

  // gap should be removed (essential for responsive layouts)
  assertEquals(oldDiv.style.gap, undefined);
  assertEquals(oldDiv.style.display, 'flex');
});

// ============================================================================
// Child Manipulation Tests
// ============================================================================

Deno.test('morph - appends new children', () => {
  const container = createElement('ul', {}, [
    createElement('li', { id: 'first' }, ['Item 1']),
  ]);

  const newContent = createElement('ul', {}, [
    createElement('li', { id: 'first' }, ['Item 1']),
    createElement('li', { id: 'second' }, ['Item 2']),
  ]);

  morph(container, newContent);

  assertEquals(container.querySelectorAll('li').length, 2);
  // First item should still have id
  assertEquals(container.querySelector('li')!.id, 'first');
  assertEquals(container.querySelectorAll('li')[1].textContent, 'Item 2');
  assertEquals(container.querySelectorAll('li')[1].id, 'second');
});

Deno.test('morph - removes extra children', () => {
  const container = createElement('ul', {}, [
    createElement('li', { id: 'first' }, ['Item 1']),
    createElement('li', { id: 'second' }, ['Item 2']),
    createElement('li', { id: 'third' }, ['Item 3']),
  ]);

  const newContent = createElement('ul', {}, [
    createElement('li', { id: 'first' }, ['Item 1']),
  ]);

  morph(container, newContent);

  assertEquals(container.querySelectorAll('li').length, 1);
  assertEquals(container.querySelector('li')!.id, 'first');
});

Deno.test('morph - handles empty to populated', () => {
  const container = createElement('div');

  const newContent = createElement('div', {}, [
    createElement('p', {}, ['New content']),
  ]);

  morph(container, newContent);

  assertEquals(container.querySelectorAll('p').length, 1);
  assertEquals(container.querySelector('p')!.textContent, 'New content');
});

Deno.test('morph - handles populated to empty', () => {
  const container = createElement('div', {}, [
    createElement('p', {}, ['Old content']),
    createElement('span', {}, ['More content']),
  ]);

  // Use document fragment with no children to represent "empty"
  const newContent = document.createDocumentFragment();

  morph(container, newContent);

  assertEquals(container.children.length, 0);
});

Deno.test('morph - reorders children correctly', () => {
  const container = createElement('ul', {}, [
    createElement('li', { id: 'a' }, ['A']),
    createElement('li', { id: 'b' }, ['B']),
    createElement('li', { id: 'c' }, ['C']),
  ]);

  const newContent = createElement('ul', {}, [
    createElement('li', { id: 'c' }, ['C']),
    createElement('li', { id: 'a' }, ['A']),
  ]);

  morph(container, newContent);

  const lis = container.querySelectorAll('li');
  assertEquals(lis.length, 2);
  assertEquals(lis[0].id, 'c');
  assertEquals(lis[1].id, 'a');
});

// ============================================================================
// Event Handler Tests
// ============================================================================

Deno.test('morph - syncs onclick handlers', () => {
  const container = createElement('div', {}, [
    createElement('button', { id: 'btn' }),
  ]);
  let clicked = false;
  (container.querySelector('button') as any).onclick = () => {
    clicked = true;
  };

  const newButton = document.createElement('button');
  newButton.id = 'btn';
  let newClicked = false;
  newButton.onclick = () => {
    newClicked = true;
  };

  const newContent = createElement('div', {}, [newButton]);
  morph(container, newContent);

  // Button should still exist with same id
  const btn = container.querySelector('button') as any;
  assertEquals(btn.id, 'btn');

  // Trigger click
  btn.click();

  // New handler should have been synced
  assertEquals(newClicked, true);
  assertEquals(clicked, false);
});

Deno.test('morph - syncs multiple event handlers', () => {
  const container = createElement('div', {}, [
    createElement('input', { id: 'inp' }),
  ]);

  const newInput = document.createElement('input') as any;
  newInput.id = 'inp';
  let focusCalled = false;
  let blurCalled = false;
  newInput.onfocus = () => {
    focusCalled = true;
  };
  newInput.onblur = () => {
    blurCalled = true;
  };

  const newContent = createElement('div', {}, [newInput]);
  morph(container, newContent);

  const inp = container.querySelector('input') as any;
  inp.dispatchEvent(new Event('focus'));
  inp.dispatchEvent(new Event('blur'));

  assertEquals(focusCalled, true);
  assertEquals(blurCalled, true);
});

// ============================================================================
// Form Element Tests
// ============================================================================

Deno.test('morph - syncs input value when not focused', () => {
  const container = createElement('div', {}, [
    createElement('input', { id: 'inp' }),
  ]);
  const oldInput = container.querySelector('input') as any;
  oldInput.value = 'old value';

  const newInput = document.createElement('input') as any;
  newInput.id = 'inp';
  newInput.value = 'new value';

  const newContent = createElement('div', {}, [newInput]);
  morph(container, newContent);

  const inp = container.querySelector('input') as any;
  assertEquals(inp.value, 'new value');
});

Deno.test('morph - syncs checkbox checked state', () => {
  const container = createElement('div', {}, [
    createElement('input', { type: 'checkbox', id: 'chk' }),
  ]);
  const oldInput = container.querySelector('input') as any;
  oldInput.checked = false;

  const newInput = document.createElement('input') as any;
  newInput.type = 'checkbox';
  newInput.id = 'chk';
  newInput.checked = true;

  const newContent = createElement('div', {}, [newInput]);
  morph(container, newContent);

  const chk = container.querySelector('input') as any;
  assertEquals(chk.checked, true);
});

Deno.test('morph - syncs disabled state', () => {
  const container = createElement('div', {}, [
    createElement('input', { id: 'inp' }),
  ]);
  const oldInput = container.querySelector('input') as any;
  oldInput.disabled = false;

  const newInput = document.createElement('input') as any;
  newInput.id = 'inp';
  newInput.disabled = true;

  const newContent = createElement('div', {}, [newInput]);
  morph(container, newContent);

  const inp = container.querySelector('input') as any;
  assertEquals(inp.disabled, true);
});

// ============================================================================
// Custom Element Tests
// ============================================================================

Deno.test('morph - syncs custom element properties', () => {
  // Define a simple custom element using happy-dom's HTMLElement
  class TestElement extends (HTMLElement as any) {
    private _value = '';
    get value() {
      return this._value;
    }
    set value(v: string) {
      this._value = v;
    }
  }

  if (!(customElements as any).get('test-element2')) {
    (customElements as any).define('test-element2', TestElement);
  }

  const container = createElement('div');
  const oldEl = document.createElement('test-element2') as any;
  oldEl.value = 'old';
  oldEl.id = 'te';
  container.appendChild(oldEl);

  const newEl = document.createElement('test-element2') as any;
  newEl.value = 'new';
  newEl.id = 'te';

  const newContent = createElement('div', {}, [newEl]);
  morph(container, newContent);

  // Element should exist
  const el = container.querySelector('test-element2') as any;
  assertEquals(el.id, 'te');
  // Property should be synced
  assertEquals(el.value, 'new');
});

Deno.test('morph - updates refs to point to old element', () => {
  // Simulate the @html-props controller with a ref
  const ref = { current: null as any };

  const container = createElement('div');
  const oldEl = document.createElement('my-input2') as any;
  oldEl.id = 'my-inp';
  container.appendChild(oldEl);

  const newEl = document.createElement('my-input2') as any;
  newEl.id = 'my-inp';
  // Simulate the controller storing the ref
  (newEl as any)[PROPS_CONTROLLER] = { ref };
  ref.current = newEl; // Ref initially points to new element

  // Pass newEl directly as the new content
  morph(container, newEl);

  // Ref should now point to old (DOM-connected) element, not new element
  assertEquals(ref.current !== newEl, true);
  assertEquals(ref.current.id, 'my-inp');
});

// ============================================================================
// Mixed Content Tests
// ============================================================================

Deno.test('morph - handles mixed text and elements', () => {
  const container = createElement('p', {}, [
    'Hello ',
    createElement('strong', {}, ['World']),
    '!',
  ]);

  const newContent = createElement('p', {}, [
    'Hi ',
    createElement('strong', {}, ['Universe']),
    '?',
  ]);

  morph(container, newContent);

  assertEquals(container.textContent, 'Hi Universe?');
  assertEquals(container.querySelector('strong')!.textContent, 'Universe');
});

Deno.test('morph - handles deeply nested structures', () => {
  const container = createElement('div', {}, [
    createElement('div', { class: 'level1' }, [
      createElement('div', { class: 'level2' }, [
        createElement('span', { id: 'deep' }, ['Deep content']),
      ]),
    ]),
  ]);

  const newContent = createElement('div', {}, [
    createElement('div', { class: 'level1' }, [
      createElement('div', { class: 'level2' }, [
        createElement('span', { id: 'deep' }, ['Updated deep content']),
      ]),
    ]),
  ]);

  morph(container, newContent);

  // Deep element should have updated content
  const deepSpan = container.querySelector('span') as any;
  assertEquals(deepSpan.id, 'deep');
  assertEquals(deepSpan.textContent, 'Updated deep content');
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test('morph - handles comment nodes', () => {
  const container = createElement('div');
  const comment = document.createComment('old comment');
  container.appendChild(comment);

  // Create fragment with new comment
  const fragment = document.createDocumentFragment();
  const newComment = document.createComment('new comment');
  fragment.appendChild(newComment);

  morph(container, fragment);

  // First child should be a comment with updated text
  const firstChild = container.childNodes[0] as any;
  assertEquals(firstChild.nodeType, 8); // Node.COMMENT_NODE = 8
  assertEquals(firstChild.textContent, 'new comment');
});

Deno.test('morph - handles document fragment as new content', () => {
  const container = createElement('div', {}, [
    createElement('p', {}, ['Old']),
  ]);

  const fragment = document.createDocumentFragment();
  fragment.appendChild(createElement('p', {}, ['New 1']));
  fragment.appendChild(createElement('p', {}, ['New 2']));

  morph(container, fragment);

  assertEquals(container.querySelectorAll('p').length, 2);
  assertEquals(container.querySelectorAll('p')[0].textContent, 'New 1');
  assertEquals(container.querySelectorAll('p')[1].textContent, 'New 2');
});

Deno.test('morph - preserves element identity through multiple morphs', () => {
  const container = createElement('div', {}, [
    createElement('p', { id: 'test' }, ['Content 1']),
  ]);

  // First morph
  morph(container, createElement('p', { id: 'test' }, ['Content 2']));
  assertEquals(container.querySelector('p')!.id, 'test');
  assertEquals(container.querySelector('p')!.textContent, 'Content 2');

  // Second morph
  morph(container, createElement('p', { id: 'test' }, ['Content 3']));
  assertEquals(container.querySelector('p')!.id, 'test');
  assertEquals(container.querySelector('p')!.textContent, 'Content 3');

  // Third morph
  morph(container, createElement('p', { id: 'test' }, ['Content 4']));
  assertEquals(container.querySelector('p')!.id, 'test');
  assertEquals(container.querySelector('p')!.textContent, 'Content 4');
});
