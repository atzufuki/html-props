// deno-lint-ignore-file no-explicit-any
/**
 * Simplified DOM morphing function for @html-props components.
 *
 * Architecture:
 * - In-order child matching: lapset sovitetaan järjestyksessä, ei myöhemmillä indekseillä
 * - Unified syncNodeContent(): attribuutit, tyylit, propertyit yhdessä paikassa
 * - Custom elements: skip child morphing if render() exists; effects handle updates
 * - Property sync: vain instanssitaso, ei prototyyppiketju
 */

// Properties to never sync (readonly/internal DOM properties)
const SKIP_PROPS = new Set([
  // Readonly DOM properties
  'tagName',
  'nodeName',
  'nodeType',
  'parentNode',
  'childNodes',
  'firstChild',
  'lastChild',
  'previousSibling',
  'nextSibling',
  'attributes',
  'ownerDocument',
  'namespaceURI',
  'children',
  'firstElementChild',
  'lastElementChild',
  'previousElementSibling',
  'nextElementSibling',
  'childElementCount',
  'assignedSlot',
  'shadowRoot',
  'isConnected',
  // HTML/CSS-related (handled separately)
  'style',
  'innerHTML',
  'outerHTML',
  'className',
  'classList',
  'id',
  'textContent',
  // Framework internals
  'isUpdatePending',
  'hasUpdated',
  'renderOptions',
  'updateComplete',
  'renderRoot',
  'buttonElement',
  'inputOrTextarea',
  'field',
  'assignedIcons',
  'leadingIcons',
  'trailingIcons',
  'fieldTag',
  'validity',
  'labels',
  'valueAsNumber',
]);

// Symbol used by @html-props/core for the controller
const PROPS_CONTROLLER = Symbol.for('html-props:controller');

// Event handler properties
const EVENT_PROPS = [
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onfocus',
  'onblur',
  'onchange',
  'oninput',
  'onsubmit',
  'onreset',
  'onscroll',
  'onwheel',
  'ondrag',
  'ondragstart',
  'ondragend',
  'ondragover',
  'ondragenter',
  'ondragleave',
  'ondrop',
];

/**
 * Check if a value is a ref object
 */
function isRef(value: unknown): value is { current: unknown } {
  return value !== null && typeof value === 'object' && 'current' in value;
}

/**
 * Check if two nodes can be morphed (same type and tag)
 */
function canMorph(oldNode: Node, newNode: Node): boolean {
  if (oldNode.nodeType !== newNode.nodeType) return false;
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    return (oldNode as Element).tagName === (newNode as Element).tagName;
  }
  return true;
}

/**
 * Sync attributes from newEl to oldEl (except style)
 */
function syncAttributesFast(oldEl: Element, newEl: Element): void {
  // Remove old attributes not in new (except style)
  for (const attr of Array.from(oldEl.attributes)) {
    if (attr.name === 'style') continue;
    if (!newEl.hasAttribute(attr.name)) {
      oldEl.removeAttribute(attr.name);
    }
  }

  // Add/update attributes from new (except style)
  for (const attr of Array.from(newEl.attributes)) {
    if (attr.name === 'style') continue;
    if (oldEl.getAttribute(attr.name) !== attr.value) {
      oldEl.setAttribute(attr.name, attr.value);
    }
  }
}

/**
 * Sync inline styles property by property
 */
function syncStylesFast(oldEl: HTMLElement, newEl: HTMLElement): void {
  const oldStyle = oldEl.style;
  const newStyle = newEl.style;

  // Collect new style property names
  const newProps = new Set<string>();
  for (let i = 0; i < newStyle.length; i++) {
    newProps.add(newStyle[i]);
  }

  // Update/add properties from new element
  for (let i = 0; i < newStyle.length; i++) {
    const prop = newStyle[i];
    const newValue = newStyle.getPropertyValue(prop);
    const oldValue = oldStyle.getPropertyValue(prop);

    if (newValue !== oldValue) {
      const priority = newStyle.getPropertyPriority ? newStyle.getPropertyPriority(prop) : '';
      oldStyle.setProperty(prop, newValue, priority);
    }
  }

  // Preserve old styles not explicitly overridden by new
  // (allows effect-injected styles to persist)
  // Note: we don't remove old props here; they should be removed by explicit render-time props
}

/**
 * Sync properties from newEl to oldEl
 * Uses only instance-level properties (not prototype chain)
 */
function syncPropertiesFast(oldEl: Element, newEl: Element, refUpdates: Map<object, Element>): void {
  const isCustomEl = oldEl.tagName.includes('-');

  // Get properties only from newEl instance
  const newProps = Object.getOwnPropertyNames(newEl);

  for (const key of newProps) {
    if (SKIP_PROPS.has(key) || key.startsWith('_')) continue;

    try {
      const newValue = (newEl as any)[key];
      if (newValue === undefined || typeof newValue === 'function') continue;

      // Track refs that need updating to point to old element
      if (isRef(newValue)) {
        refUpdates.set(newValue, oldEl);
        continue;
      }

      const oldValue = (oldEl as any)[key];
      if (newValue !== oldValue) {
        (oldEl as any)[key] = newValue;
      }
    } catch {
      // Readonly property - skip
    }
  }

  // For custom elements, check controller refs
  if (isCustomEl) {
    const newController = (newEl as any)[PROPS_CONTROLLER];
    if (newController?.ref && isRef(newController.ref)) {
      refUpdates.set(newController.ref, oldEl);
    }
  }

  // Sync event handlers for all elements
  for (const prop of EVENT_PROPS) {
    const newHandler = (newEl as any)[prop];
    if (newHandler !== undefined && newHandler !== (oldEl as any)[prop]) {
      (oldEl as any)[prop] = newHandler;
    }
  }

  // Form element special handling
  if (oldEl instanceof HTMLInputElement && newEl instanceof HTMLInputElement) {
    if (document.activeElement !== oldEl) {
      if (oldEl.value !== newEl.value) oldEl.value = newEl.value;
      if (oldEl.checked !== newEl.checked) oldEl.checked = newEl.checked;
    }
    if (oldEl.disabled !== newEl.disabled) oldEl.disabled = newEl.disabled;
  }

  if (oldEl instanceof HTMLTextAreaElement && newEl instanceof HTMLTextAreaElement) {
    if (document.activeElement !== oldEl) {
      if (oldEl.value !== newEl.value) oldEl.value = newEl.value;
    }
  }

  if (oldEl instanceof HTMLSelectElement && newEl instanceof HTMLSelectElement) {
    if (oldEl.value !== newEl.value) oldEl.value = newEl.value;
  }
}

/**
 * Sync all content of an element (attributes, styles, properties)
 * Does not handle children - that's done separately
 */
function syncNodeContent(oldNode: Node, newNode: Node, refUpdates: Map<object, Element>): void {
  // Text and comment nodes
  if (oldNode.nodeType === Node.TEXT_NODE || oldNode.nodeType === Node.COMMENT_NODE) {
    if (oldNode.textContent !== newNode.textContent) {
      oldNode.textContent = newNode.textContent;
    }
    return;
  }

  // Element nodes
  if (oldNode.nodeType === Node.ELEMENT_NODE && newNode.nodeType === Node.ELEMENT_NODE) {
    const oldEl = oldNode as Element;
    const newEl = newNode as Element;

    // Sync all element content
    syncAttributesFast(oldEl, newEl);
    if (oldEl instanceof HTMLElement && newEl instanceof HTMLElement) {
      syncStylesFast(oldEl, newEl);
    }
    syncPropertiesFast(oldEl, newEl, refUpdates);

    // Sync textContent only if both are completely empty (no child nodes at all)
    // Text nodes will be morphed by morphChildrenInOrder, so don't override them here
    if (oldEl.childNodes.length === 0 && (newEl as Element).childNodes.length === 0) {
      if (oldEl.textContent !== newEl.textContent) {
        oldEl.textContent = newEl.textContent;
      }
    }
  }
}

/**
 * Morph children in order: insert, update, remove
 * No complex matching - just in-order replacement
 */
function morphChildrenInOrder(oldParent: Element, newChildren: Node[], refUpdates: Map<object, Element>): void {
  const oldChildren = Array.from(oldParent.childNodes);

  let oldIdx = 0;
  let newIdx = 0;

  // Update/morph existing children in order
  while (oldIdx < oldChildren.length && newIdx < newChildren.length) {
    const oldChild = oldChildren[oldIdx];
    const newChild = newChildren[newIdx];

    if (canMorph(oldChild, newChild)) {
      // Can morph - sync content and recurse on children
      morphNode(oldChild, newChild, refUpdates);
      oldIdx++;
      newIdx++;
    } else {
      // Can't morph - replace old with new
      oldParent.replaceChild(newChild, oldChild);
      oldIdx++;
      newIdx++;
    }
  }

  // Insert remaining new children
  while (newIdx < newChildren.length) {
    oldParent.appendChild(newChildren[newIdx]);
    newIdx++;
  }

  // Remove remaining old children (except STYLE, SCRIPT, LINK, and TEXT nodes)
  const PRESERVE_TAGS = new Set(['STYLE', 'SCRIPT', 'LINK']);
  while (oldIdx < oldChildren.length) {
    const oldChild = oldChildren[oldIdx];

    // Preserve text and comment nodes - they may be intentional content
    if (oldChild.nodeType === Node.TEXT_NODE || oldChild.nodeType === Node.COMMENT_NODE) {
      oldIdx++;
      continue;
    }

    if (oldChild.nodeType === Node.ELEMENT_NODE) {
      const tagName = (oldChild as Element).tagName;
      if (PRESERVE_TAGS.has(tagName)) {
        oldIdx++;
        continue;
      }
    }

    oldChild.remove();
    oldIdx++;
  }
}

/**
 * Morph a single node: sync content and recurse on children
 */
function morphNode(oldNode: Node, newNode: Node, refUpdates: Map<object, Element>): void {
  // Sync all node content (attributes, styles, properties, textContent)
  syncNodeContent(oldNode, newNode, refUpdates);

  // For non-custom elements, morph children
  // Custom elements with render() skip child morphing - effects handle it
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldEl = oldNode as Element;
    const hasRenderMethod = typeof (oldEl as any).render === 'function';
    if (!hasRenderMethod) {
      const newChildren = Array.from((newNode as Element).childNodes);
      morphChildrenInOrder(oldEl, newChildren, refUpdates);
    }
  }
}

/**
 * Morph a container's content to match new content.
 * Updates elements in place, never replacing the container itself.
 */
export function morph(container: Element, newContent: Node): void {
  // Track refs that need updating to point to old (DOM-connected) elements
  const refUpdates = new Map<object, Element>();

  // Extract new children
  const newChildren: Node[] = newContent.nodeType === Node.DOCUMENT_FRAGMENT_NODE
    ? Array.from(newContent.childNodes)
    : [newContent];

  // Prevent recursive morph operations
  if ((container as any).__morphing) {
    return;
  }

  try {
    (container as any).__morphing = true;
    morphChildrenInOrder(container, newChildren, refUpdates);
  } finally {
    (container as any).__morphing = false;
  }

  // Apply ref updates - point refs to old (DOM-connected) elements
  for (const [ref, element] of refUpdates) {
    (ref as { current: Element }).current = element;
  }
}

export default morph;
