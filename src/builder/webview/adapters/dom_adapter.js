/**
 * Frontend DOM Adapter
 *
 * Handles DOM mutations in visual editor and preview.
 * Mirrors the backend ICodeStyleAdapter interface but works with actual DOM.
 *
 * This allows us to:
 * 1. Update both Editor DOM and Preview DOM with same code
 * 2. Later reuse same logic when backend applies changes to source
 * 3. Keep DOM mutation logic separate and testable
 */

/**
 * DOM Adapter - Handles DOM mutations
 */
class DOMAdapter {
  /**
   * Create adapter instance for a specific DOM
   * @param {Document} doc - Target document (window.document or iframe.contentDocument)
   */
  constructor(doc) {
    this.doc = doc;
  }

  /**
   * Get element by selector
   * @param {string} selector - CSS selector
   * @returns {Element | null} Element or null if not found
   */
  getElement(selector) {
    return this.doc.querySelector(selector);
  }

  /**
   * Add element from HTML
   * @param {string} html - HTML string to insert
   * @param {string} targetSelector - CSS selector of target element
   * @param {('before' | 'after' | 'inside')} [position='after'] - Insert position relative to target
   * @returns {boolean} True if added, false if target not found
   */
  addElement(html, targetSelector, position = 'after') {
    const target = this.doc.querySelector(targetSelector);
    if (!target) return false;

    const temp = this.doc.createElement('div');
    temp.innerHTML = html;
    const element = temp.firstElementChild;

    if (!element) return false;

    if (position === 'after') {
      target.parentNode?.insertBefore(element, target.nextSibling);
    } else if (position === 'before') {
      target.parentNode?.insertBefore(element, target);
    } else if (position === 'inside') {
      target.appendChild(element);
    } else {
      return false;
    }

    return true;
  }

  /**
   * Delete element
   * @param {string} selector - CSS selector
   * @returns {boolean} True if deleted, false if element not found
   */
  deleteElement(selector) {
    const element = this.doc.querySelector(selector);
    if (!element) return false;
    element.remove();
    return true;
  }

  /**
   * Duplicate element
   * @param {string} selector - CSS selector
   * @param {('before' | 'after')} [position='after'] - Insert position relative to original
   * @returns {boolean} True if duplicated, false if element not found
   */
  duplicateElement(selector, position = 'after') {
    const element = this.doc.querySelector(selector);
    if (!element) return false;

    const clone = element.cloneNode(true);
    
    // Remove editor-specific classes and attributes from clone
    clone.classList.forEach(cls => {
      if (cls.startsWith('wb-')) {
        clone.classList.remove(cls);
      }
    });
    // Remove editor-specific attributes
    Array.from(clone.attributes).forEach(attr => {
      if (attr.name.startsWith('wb-') || attr.name.startsWith('data-editor-inject')) {
        clone.removeAttribute(attr.name);
      }
    });

    if (position === 'after') {
      element.parentNode?.insertBefore(clone, element.nextSibling);
    } else {
      element.parentNode?.insertBefore(clone, element);
    }

    return true;
  }

  /**
   * Copy element HTML
   * @param {string} selector - CSS selector
   * @returns {string} Element HTML or empty string if not found
   */
  copyElement(selector) {
    const element = this.doc.querySelector(selector);
    if (!element) return '';
    return element.outerHTML;
  }

  /**
   * Paste element HTML
   * @param {string} html - HTML string to paste
   * @param {string} targetSelector - CSS selector of target element
   * @param {('before' | 'after')} [position='after'] - Insert position relative to target
   * @returns {boolean} True if pasted, false if target not found
   */
  pasteElement(html, targetSelector, position = 'after') {
    return this.addElement(html, targetSelector, position);
  }

  /**
   * Move element to new location
   * @param {string} selector - CSS selector of element to move
   * @param {string} targetSelector - CSS selector of target element
   * @param {('before' | 'after' | 'inside')} [position='after'] - Position relative to target
   * @returns {boolean} True if moved, false if element or target not found
   */
  moveElement(selector, targetSelector, position = 'after') {
    const element = this.doc.querySelector(selector);
    const target = this.doc.querySelector(targetSelector);

    if (!element || !target) return false;
    if (element === target) return false;

    // Don't move if target is a descendant of element
    if (element.contains(target)) return false;

    const elementToMove = element.cloneNode(true);
    
    // Remove editor-specific classes and attributes from clone
    elementToMove.classList.forEach(cls => {
      if (cls.startsWith('wb-')) {
        elementToMove.classList.remove(cls);
      }
    });
    // Remove editor-specific attributes
    Array.from(elementToMove.attributes).forEach(attr => {
      if (attr.name.startsWith('wb-') || attr.name.startsWith('data-editor-inject')) {
        elementToMove.removeAttribute(attr.name);
      }
    });

    if (position === 'inside') {
      target.appendChild(elementToMove);
    } else if (position === 'before') {
      target.parentNode?.insertBefore(elementToMove, target);
    } else {
      target.parentNode?.insertBefore(elementToMove, target.nextSibling);
    }

    element.remove();
    return true;
  }

  /**
   * Update element property
   * @param {string} selector - CSS selector
   * @param {string} propertyName - Property name (class, id, text, or attribute)
   * @param {string} propertyValue - New property value
   * @returns {boolean} True if updated, false if element not found
   */
  updateProperty(selector, propertyName, propertyValue) {
    const element = this.doc.querySelector(selector);
    if (!element) return false;

    if (propertyName === 'text' || propertyName === 'textContent') {
      element.textContent = propertyValue;
    } else if (propertyName === 'class') {
      element.className = propertyValue;
    } else if (propertyName === 'id') {
      element.id = propertyValue;
    } else {
      element.setAttribute(propertyName, propertyValue);
    }

    return true;
  }

  /**
   * Get CSS selector for element
   * @param {Element} element - DOM element
   * @returns {string} CSS selector path
   */
  getElementSelector(element) {
    if (!element) return '';
    if (element.id) return `#${element.id}`;

    const path = [];
    let el = element;
    while (el && el !== this.doc.documentElement) {
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector = `#${el.id}`;
        path.unshift(selector);
        break;
      } else {
        const siblings = el.parentNode
          ? [...el.parentNode.children].filter((e) => e.tagName === el.tagName)
          : [];
        if (siblings.length > 1) {
          const index = siblings.indexOf(el) + 1;
          selector += `:nth-of-type(${index})`;
        }
        path.unshift(selector);
      }
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  /**
   * Get element data (tag, selector, attributes)
   * @param {Element} element - DOM element
   * @returns {Object} Element data {tag, selector, attributes}
   */
  getElementData(element) {
    if (!element) return { tag: '', selector: '', attributes: {} };

    const selector = this.getElementSelector(element);
    const tag = element.tagName.toLowerCase();
    const attributes = {};

    for (const attr of element.attributes) {
      if (!attr.name.startsWith('wb-') && attr.name !== 'data-editor-inject') {
        // For class attribute, filter out wb-* classes
        if (attr.name === 'class') {
          const cleanClasses = Array.from(element.classList)
            .filter(c => !c.startsWith('wb-'))
            .join(' ');
          if (cleanClasses) {
            attributes['class'] = cleanClasses;
          }
        } else {
          attributes[attr.name] = attr.value;
        }
      }
    }

    return { tag, selector, attributes };
  }

    /**
   * Mark elements in cloned document for layer/properties panels
   * @param {Element} clonedRoot - Cloned document root element
   * @param {string} selectedSelector - CSS selector for selected element
   * @param {string} hoveredSelector - CSS selector for hovered element
   * @returns {string} Marked HTML string
   */
  markElementsInClone(clonedRoot, selectedSelector, hoveredSelector) {
    // Mark selected element
    if (selectedSelector) {
      const clonedElement = clonedRoot.querySelector(selectedSelector);
      if (clonedElement) {
        clonedElement.setAttribute('data-layers-selected', 'true');
      }
    }

    // Mark hovered element if different from selected
    if (hoveredSelector && hoveredSelector !== selectedSelector) {
      const clonedElement = clonedRoot.querySelector(hoveredSelector);
      if (clonedElement) {
        clonedElement.setAttribute('data-layers-hovered', 'true');
      }
    }

    return clonedRoot.outerHTML;
  }

  /**
   * Parse DOM tree to JSON structure
   * Recursively converts DOM elements to JSON with:
   * - tag name
   * - attributes (HTML attributes)
   * - props (element.props or observed attributes)
   * - text content (for text nodes)
   * - children array
   * 
   * This is what gets sent to backend for code generation
   * @param {Element} element - Root element to parse
   * @returns {Object} JSON representation of DOM tree
   */
  parseDomToJson(element = null) {
    let root = element || this.doc.documentElement;
    
    // If it's a Document object, get the documentElement (html)
    if (root.nodeType === 9) {
      root = root.documentElement;
    }
    
    // If we're parsing an HTML element, extract only Body content
    if (root.tagName && root.tagName.toLowerCase() === 'html') {
      const bodyElement = root.querySelector('body');
      if (bodyElement) {
        // Return only body's children as array
        const bodyChildren = [];
        for (const child of bodyElement.childNodes) {
          const childJson = this._parseElement(child);
          if (childJson) {
            bodyChildren.push(childJson);
          }
        }
        console.log("[parseDomToJson] Extracted", bodyChildren.length, "children from body");
        return bodyChildren;
      }
    }
    
    // If it's a body element, return its children
    if (root.tagName && root.tagName.toLowerCase() === 'body') {
      const bodyChildren = [];
      for (const child of root.childNodes) {
        const childJson = this._parseElement(child);
        if (childJson) {
          bodyChildren.push(childJson);
        }
      }
      console.log("[parseDomToJson] Extracted", bodyChildren.length, "children from body element");
      return bodyChildren;
    }
    
    // Otherwise parse as normal element and wrap in array
    const parsed = this._parseElement(root);
    console.log("[parseDomToJson] Parsed single element, result:", parsed ? "has content" : "null");
    return parsed ? [parsed] : [];
  }

  /**
   * Recursively parse element to JSON
   * @private
   */
  _parseElement(element) {
    if (!element) return null;

    // Handle text nodes
    if (element.nodeType === 3) {
      let text = element.textContent;
      // Normalize whitespace: collapse multiple spaces/newlines into single space
      text = text.replace(/\s+/g, ' ').trim();
      if (text) {
        return { type: 'text', content: text };
      }
      return null;
    }

    // Handle element nodes
    if (element.nodeType === 1) {
      const tag = element.tagName.toLowerCase();
      
      // Skip editor-specific elements and script/style tags
      if (element.hasAttribute('data-editor-inject') || tag === 'script' || tag === 'style') {
        console.log(`[_parseElement] Skipping ${tag} element`);
        return null;
      }

      // Don't skip custom elements - they're content!
      console.log(`[_parseElement] Parsing <${tag}> element with ${element.childNodes.length} children`);

      const json = {
        type: 'element',
        tag: tag,
        attributes: {},
        props: {},
        children: []
      };

      // Extract HTML attributes (skip editor-specific ones)
      for (const attr of element.attributes) {
        if (!attr.name.startsWith('wb-') && !attr.name.startsWith('data-editor-inject')) {
          json.attributes[attr.name] = attr.value;
        }
      }

      // Extract props from element.props if available (for custom elements)
      // IMPORTANT: Only serialize primitive values, not DOM references!
      if (element.props && typeof element.props === 'object') {
        const propsKeys = Object.keys(element.props);
        console.log(`[_parseElement] <${tag}> has props:`, propsKeys);
        
        // Serialize props - only include primitives and arrays of primitives
        for (const key of propsKeys) {
          const value = element.props[key];
          
          // Skip DOM elements and functions
          if (value === null || value === undefined) {
            json.props[key] = value;
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            json.props[key] = value;
          } else if (Array.isArray(value)) {
            // For arrays, only include primitives
            json.props[key] = value.filter(v => 
              typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
            );
          } else if (typeof value === 'object' && value.constructor === Object) {
            // For plain objects, recursively serialize primitives only
            const serialized = {};
            for (const [k, v] of Object.entries(value)) {
              if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
                serialized[k] = v;
              }
            }
            if (Object.keys(serialized).length > 0) {
              json.props[key] = serialized;
            }
          }
          // Skip functions, DOM elements, symbols, etc.
        }
      }

      // Parse children
      for (const child of element.childNodes) {
        const childJson = this._parseElement(child);
        if (childJson) {
          json.children.push(childJson);
        }
      }

      // Consolidate consecutive text nodes into single text nodes
      // This prevents fragmented text like: 'hello', ' ', 'world' becoming separate entries
      const consolidatedChildren = [];
      let currentTextContent = '';
      
      for (const child of json.children) {
        if (child.type === 'text') {
          // Accumulate text content without trimming (preserve whitespace within text)
          currentTextContent += child.content;
        } else {
          // Not a text node - flush accumulated text if any (trim whitespace-only content)
          if (currentTextContent) {
            const trimmed = currentTextContent.trim();
            if (trimmed) {
              consolidatedChildren.push({ type: 'text', content: trimmed });
            }
          }
          currentTextContent = '';
          // Add the non-text child
          consolidatedChildren.push(child);
        }
      }
      
      // Don't forget final text content
      if (currentTextContent) {
        const trimmed = currentTextContent.trim();
        if (trimmed) {
          consolidatedChildren.push({ type: 'text', content: trimmed });
        }
      }
      
      json.children = consolidatedChildren;

      console.log(`[_parseElement] <${tag}> parsed with ${json.children.length} children`);
      return json;
    }

    return null;
  }

  /**
   * Show drop indicator on element
   * @param {Element} element - Element to mark as drop target
   * @param {('before' | 'after' | 'inside')} position - Drop position
   * @returns {Object} Drop target info {element, position}
   */
  showDropIndicator(element, position) {
    // Remove previous drop target using data attribute
    const prevTarget = this.doc.querySelector('[data-drop-target="true"]');
    if (prevTarget) {
      prevTarget.removeAttribute('data-drop-target');
      prevTarget.classList.remove('wb-drop-target');
    }

    // Mark new drop target (for future use if needed)
    element.setAttribute('data-drop-target', 'true');

    return { element, position };
  }

  /**
   * Hide drop indicator - completely clean all styling
   * @returns {null}
   */
  hideDropIndicator() {
    const target = this.doc.querySelector('[data-drop-target="true"]');
    if (target) {
      target.removeAttribute('data-drop-target');
      target.classList.remove('wb-drop-target');
      target.offsetHeight;
    }
    return null;
  }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMAdapter;
}
