/**
 * HTML Property Type System
 * Defines available properties for HTML elements with type information
 * (Properties are the DOM API names, not HTML attributes)
 */

export type PropertyType = 'string' | 'number' | 'boolean' | 'enum' | 'url' | 'color';

export interface PropertyDefinition {
  name: string;
  type: PropertyType;
  enumValues?: string[];
  description?: string;
  defaultValue?: string;
  htmlAttribute?: string; // The corresponding HTML attribute name if different
}

/**
 * Global properties available on all HTML elements
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes
 */
export const GLOBAL_PROPERTIES: PropertyDefinition[] = [
  { name: 'id', type: 'string', description: 'Unique identifier for the element' },
  { name: 'className', type: 'string', htmlAttribute: 'class', description: 'Space-separated list of CSS classes' },
  { name: 'style', type: 'string', description: 'Inline CSS styles' },
  { name: 'title', type: 'string', description: 'Advisory information (tooltip)' },
  { name: 'lang', type: 'string', description: 'Language of the element content' },
  { name: 'dir', type: 'enum', enumValues: ['ltr', 'rtl', 'auto'], description: 'Text direction' },
  { name: 'tabIndex', type: 'number', htmlAttribute: 'tabindex', description: 'Tab order for keyboard navigation' },
  { name: 'hidden', type: 'boolean', description: 'Whether element is hidden' },
  { name: 'contentEditable', type: 'enum', enumValues: ['true', 'false', 'plaintext-only'], htmlAttribute: 'contenteditable', description: 'Whether content is editable' },
  { name: 'spellCheck', type: 'enum', enumValues: ['true', 'false'], htmlAttribute: 'spellcheck', description: 'Whether to check spelling' },
  { name: 'translate', type: 'enum', enumValues: ['yes', 'no'], description: 'Whether to translate element' },
  { name: 'draggable', type: 'enum', enumValues: ['true', 'false'], description: 'Whether element is draggable' },
  
  // ARIA attributes (common ones)
  { name: 'role', type: 'string', description: 'ARIA role' },
  { name: 'ariaLabel', type: 'string', htmlAttribute: 'aria-label', description: 'Accessible label' },
  { name: 'ariaLabelledby', type: 'string', htmlAttribute: 'aria-labelledby', description: 'ID of element that labels this' },
  { name: 'ariaDescribedby', type: 'string', htmlAttribute: 'aria-describedby', description: 'ID of element that describes this' },
  { name: 'ariaHidden', type: 'enum', enumValues: ['true', 'false'], htmlAttribute: 'aria-hidden', description: 'Hide from accessibility tree' },
  { name: 'ariaDisabled', type: 'enum', enumValues: ['true', 'false'], htmlAttribute: 'aria-disabled', description: 'Indicate disabled state' },
  { name: 'ariaExpanded', type: 'enum', enumValues: ['true', 'false'], htmlAttribute: 'aria-expanded', description: 'Indicate expanded state' },
  { name: 'ariaSelected', type: 'enum', enumValues: ['true', 'false'], htmlAttribute: 'aria-selected', description: 'Indicate selected state' },
];

/**
 * Element-specific properties for common HTML elements
 */
export const HTML_ELEMENT_PROPERTIES: Record<string, PropertyDefinition[]> = {
  // Link element
  a: [
    { name: 'href', type: 'url', description: 'URL of the linked resource' },
    { name: 'target', type: 'enum', enumValues: ['_self', '_blank', '_parent', '_top'], description: 'Where to open the link' },
    { name: 'rel', type: 'string', description: 'Relationship between documents' },
    { name: 'download', type: 'string', description: 'Download filename' },
    { name: 'hrefLang', type: 'string', htmlAttribute: 'hreflang', description: 'Language of linked resource' },
    { name: 'type', type: 'string', description: 'MIME type of linked resource' },
    { name: 'referrerPolicy', type: 'enum', enumValues: ['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'], htmlAttribute: 'referrerpolicy', description: 'Referrer policy' },
  ],

  // Button element
  button: [
    { name: 'type', type: 'enum', enumValues: ['button', 'submit', 'reset'], description: 'Button behavior', defaultValue: 'button' },
    { name: 'name', type: 'string', description: 'Form field name' },
    { name: 'value', type: 'string', description: 'Value submitted with form' },
    { name: 'disabled', type: 'boolean', description: 'Whether button is disabled' },
    { name: 'form', type: 'string', description: 'ID of associated form' },
    { name: 'formAction', type: 'url', htmlAttribute: 'formaction', description: 'URL for form submission (overrides form action)' },
    { name: 'formEncType', type: 'enum', enumValues: ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'], htmlAttribute: 'formenctype', description: 'Form encoding type' },
    { name: 'formMethod', type: 'enum', enumValues: ['get', 'post'], htmlAttribute: 'formmethod', description: 'HTTP method for form submission' },
    { name: 'formNoValidate', type: 'boolean', htmlAttribute: 'formnovalidate', description: 'Skip form validation' },
    { name: 'formTarget', type: 'enum', enumValues: ['_self', '_blank', '_parent', '_top'], htmlAttribute: 'formtarget', description: 'Where to display response' },
  ],

  // Input element
  input: [
    { name: 'type', type: 'enum', enumValues: ['text', 'password', 'email', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'file', 'checkbox', 'radio', 'submit', 'reset', 'button', 'hidden', 'range'], description: 'Input type', defaultValue: 'text' },
    { name: 'name', type: 'string', description: 'Form field name' },
    { name: 'value', type: 'string', description: 'Input value' },
    { name: 'placeholder', type: 'string', description: 'Placeholder text' },
    { name: 'disabled', type: 'boolean', description: 'Whether input is disabled' },
    { name: 'readOnly', type: 'boolean', htmlAttribute: 'readonly', description: 'Whether input is read-only' },
    { name: 'required', type: 'boolean', description: 'Whether input is required' },
    { name: 'autoFocus', type: 'boolean', htmlAttribute: 'autofocus', description: 'Auto-focus on page load' },
    { name: 'autoComplete', type: 'enum', enumValues: ['on', 'off', 'name', 'email', 'username', 'current-password', 'new-password', 'tel', 'url'], htmlAttribute: 'autocomplete', description: 'Autocomplete behavior' },
    { name: 'min', type: 'string', description: 'Minimum value (for number/date inputs)' },
    { name: 'max', type: 'string', description: 'Maximum value (for number/date inputs)' },
    { name: 'step', type: 'string', description: 'Step increment (for number/range inputs)' },
    { name: 'minLength', type: 'number', htmlAttribute: 'minlength', description: 'Minimum text length' },
    { name: 'maxLength', type: 'number', htmlAttribute: 'maxlength', description: 'Maximum text length' },
    { name: 'pattern', type: 'string', description: 'Regex validation pattern' },
    { name: 'accept', type: 'string', description: 'Accepted file types (for file input)' },
    { name: 'multiple', type: 'boolean', description: 'Allow multiple values' },
    { name: 'checked', type: 'boolean', description: 'Whether checkbox/radio is checked' },
    { name: 'form', type: 'string', description: 'ID of associated form' },
  ],

  // Image element
  img: [
    { name: 'src', type: 'url', description: 'Image URL' },
    { name: 'alt', type: 'string', description: 'Alternative text' },
    { name: 'width', type: 'number', description: 'Image width in pixels' },
    { name: 'height', type: 'number', description: 'Image height in pixels' },
    { name: 'loading', type: 'enum', enumValues: ['eager', 'lazy'], description: 'Loading behavior' },
    { name: 'decoding', type: 'enum', enumValues: ['sync', 'async', 'auto'], description: 'Decoding hint' },
    { name: 'crossOrigin', type: 'enum', enumValues: ['anonymous', 'use-credentials'], htmlAttribute: 'crossorigin', description: 'CORS settings' },
    { name: 'srcSet', type: 'string', htmlAttribute: 'srcset', description: 'Responsive image sources' },
    { name: 'sizes', type: 'string', description: 'Image sizes for different viewports' },
    { name: 'referrerPolicy', type: 'enum', enumValues: ['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'], htmlAttribute: 'referrerpolicy', description: 'Referrer policy' },
  ],

  // Form element
  form: [
    { name: 'action', type: 'url', description: 'Form submission URL' },
    { name: 'method', type: 'enum', enumValues: ['get', 'post', 'dialog'], description: 'HTTP method' },
    { name: 'encType', type: 'enum', enumValues: ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'], htmlAttribute: 'enctype', description: 'Encoding type' },
    { name: 'target', type: 'enum', enumValues: ['_self', '_blank', '_parent', '_top'], description: 'Where to display response' },
    { name: 'name', type: 'string', description: 'Form name' },
    { name: 'autoComplete', type: 'enum', enumValues: ['on', 'off'], htmlAttribute: 'autocomplete', description: 'Autocomplete behavior' },
    { name: 'noValidate', type: 'boolean', htmlAttribute: 'novalidate', description: 'Skip validation on submit' },
    { name: 'acceptCharset', type: 'string', htmlAttribute: 'accept-charset', description: 'Character encodings' },
  ],

  // Label element
  label: [
    { name: 'htmlFor', type: 'string', htmlAttribute: 'for', description: 'ID of associated form control' },
  ],

  // Textarea element
  textarea: [
    { name: 'name', type: 'string', description: 'Form field name' },
    { name: 'rows', type: 'number', description: 'Number of visible text rows' },
    { name: 'cols', type: 'number', description: 'Number of visible text columns' },
    { name: 'placeholder', type: 'string', description: 'Placeholder text' },
    { name: 'disabled', type: 'boolean', description: 'Whether textarea is disabled' },
    { name: 'readOnly', type: 'boolean', htmlAttribute: 'readonly', description: 'Whether textarea is read-only' },
    { name: 'required', type: 'boolean', description: 'Whether textarea is required' },
    { name: 'autoFocus', type: 'boolean', htmlAttribute: 'autofocus', description: 'Auto-focus on page load' },
    { name: 'minLength', type: 'number', htmlAttribute: 'minlength', description: 'Minimum text length' },
    { name: 'maxLength', type: 'number', htmlAttribute: 'maxlength', description: 'Maximum text length' },
    { name: 'wrap', type: 'enum', enumValues: ['soft', 'hard'], description: 'Text wrapping behavior' },
    { name: 'autoComplete', type: 'enum', enumValues: ['on', 'off'], htmlAttribute: 'autocomplete', description: 'Autocomplete behavior' },
    { name: 'form', type: 'string', description: 'ID of associated form' },
  ],

  // Select element
  select: [
    { name: 'name', type: 'string', description: 'Form field name' },
    { name: 'disabled', type: 'boolean', description: 'Whether select is disabled' },
    { name: 'required', type: 'boolean', description: 'Whether select is required' },
    { name: 'autoFocus', type: 'boolean', htmlAttribute: 'autofocus', description: 'Auto-focus on page load' },
    { name: 'multiple', type: 'boolean', description: 'Allow multiple selections' },
    { name: 'size', type: 'number', description: 'Number of visible options' },
    { name: 'autoComplete', type: 'enum', enumValues: ['on', 'off'], htmlAttribute: 'autocomplete', description: 'Autocomplete behavior' },
    { name: 'form', type: 'string', description: 'ID of associated form' },
  ],

  // Option element
  option: [
    { name: 'value', type: 'string', description: 'Option value' },
    { name: 'selected', type: 'boolean', description: 'Whether option is selected' },
    { name: 'disabled', type: 'boolean', description: 'Whether option is disabled' },
    { name: 'label', type: 'string', description: 'Option label (alternative text)' },
  ],

  // Script element
  script: [
    { name: 'src', type: 'url', description: 'External script URL' },
    { name: 'type', type: 'string', description: 'MIME type (default: text/javascript)' },
    { name: 'async', type: 'boolean', description: 'Load asynchronously' },
    { name: 'defer', type: 'boolean', description: 'Defer execution until DOM ready' },
    { name: 'crossOrigin', type: 'enum', enumValues: ['anonymous', 'use-credentials'], htmlAttribute: 'crossorigin', description: 'CORS settings' },
    { name: 'integrity', type: 'string', description: 'Subresource integrity hash' },
    { name: 'noModule', type: 'boolean', htmlAttribute: 'nomodule', description: 'Skip in ES6 module-aware browsers' },
    { name: 'referrerPolicy', type: 'enum', enumValues: ['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'], htmlAttribute: 'referrerpolicy', description: 'Referrer policy' },
  ],

  // Link element (stylesheet)
  link: [
    { name: 'href', type: 'url', description: 'Resource URL' },
    { name: 'rel', type: 'string', description: 'Relationship type (e.g., stylesheet, icon)' },
    { name: 'type', type: 'string', description: 'MIME type' },
    { name: 'media', type: 'string', description: 'Media query' },
    { name: 'crossOrigin', type: 'enum', enumValues: ['anonymous', 'use-credentials'], htmlAttribute: 'crossorigin', description: 'CORS settings' },
    { name: 'integrity', type: 'string', description: 'Subresource integrity hash' },
    { name: 'referrerPolicy', type: 'enum', enumValues: ['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'], htmlAttribute: 'referrerpolicy', description: 'Referrer policy' },
  ],

  // Table elements
  table: [
    { name: 'border', type: 'number', description: 'Table border width (deprecated, use CSS)' },
  ],

  td: [
    { name: 'colSpan', type: 'number', htmlAttribute: 'colspan', description: 'Number of columns to span' },
    { name: 'rowSpan', type: 'number', htmlAttribute: 'rowspan', description: 'Number of rows to span' },
    { name: 'headers', type: 'string', description: 'IDs of related header cells' },
  ],

  th: [
    { name: 'colSpan', type: 'number', htmlAttribute: 'colspan', description: 'Number of columns to span' },
    { name: 'rowSpan', type: 'number', htmlAttribute: 'rowspan', description: 'Number of rows to span' },
    { name: 'scope', type: 'enum', enumValues: ['row', 'col', 'rowgroup', 'colgroup'], description: 'Scope of header cell' },
    { name: 'abbr', type: 'string', description: 'Abbreviated description' },
  ],

  // Video element
  video: [
    { name: 'src', type: 'url', description: 'Video URL' },
    { name: 'width', type: 'number', description: 'Video width in pixels' },
    { name: 'height', type: 'number', description: 'Video height in pixels' },
    { name: 'controls', type: 'boolean', description: 'Show playback controls' },
    { name: 'autoplay', type: 'boolean', description: 'Auto-play on load' },
    { name: 'loop', type: 'boolean', description: 'Loop playback' },
    { name: 'muted', type: 'boolean', description: 'Muted by default' },
    { name: 'poster', type: 'url', description: 'Poster image URL' },
    { name: 'preload', type: 'enum', enumValues: ['none', 'metadata', 'auto'], description: 'Preload behavior' },
    { name: 'crossOrigin', type: 'enum', enumValues: ['anonymous', 'use-credentials'], htmlAttribute: 'crossorigin', description: 'CORS settings' },
  ],

  // Audio element
  audio: [
    { name: 'src', type: 'url', description: 'Audio URL' },
    { name: 'controls', type: 'boolean', description: 'Show playback controls' },
    { name: 'autoplay', type: 'boolean', description: 'Auto-play on load' },
    { name: 'loop', type: 'boolean', description: 'Loop playback' },
    { name: 'muted', type: 'boolean', description: 'Muted by default' },
    { name: 'preload', type: 'enum', enumValues: ['none', 'metadata', 'auto'], description: 'Preload behavior' },
    { name: 'crossOrigin', type: 'enum', enumValues: ['anonymous', 'use-credentials'], htmlAttribute: 'crossorigin', description: 'CORS settings' },
  ],

  // Canvas element
  canvas: [
    { name: 'width', type: 'number', description: 'Canvas width in pixels' },
    { name: 'height', type: 'number', description: 'Canvas height in pixels' },
  ],

  // IFrame element
  iframe: [
    { name: 'src', type: 'url', description: 'Embedded content URL' },
    { name: 'width', type: 'number', description: 'Frame width in pixels' },
    { name: 'height', type: 'number', description: 'Frame height in pixels' },
    { name: 'name', type: 'string', description: 'Frame name' },
    { name: 'sandbox', type: 'string', description: 'Security restrictions' },
    { name: 'allow', type: 'string', description: 'Feature policy' },
    { name: 'loading', type: 'enum', enumValues: ['eager', 'lazy'], description: 'Loading behavior' },
    { name: 'referrerPolicy', type: 'enum', enumValues: ['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'], htmlAttribute: 'referrerpolicy', description: 'Referrer policy' },
  ],

  // Meta element
  meta: [
    { name: 'name', type: 'string', description: 'Metadata name' },
    { name: 'content', type: 'string', description: 'Metadata value' },
    { name: 'charSet', type: 'string', htmlAttribute: 'charset', description: 'Character encoding' },
    { name: 'httpEquiv', type: 'string', htmlAttribute: 'http-equiv', description: 'HTTP header name' },
  ],

  // Progress element
  progress: [
    { name: 'value', type: 'number', description: 'Current value' },
    { name: 'max', type: 'number', description: 'Maximum value' },
  ],

  // Meter element
  meter: [
    { name: 'value', type: 'number', description: 'Current value' },
    { name: 'min', type: 'number', description: 'Minimum value' },
    { name: 'max', type: 'number', description: 'Maximum value' },
    { name: 'low', type: 'number', description: 'Low threshold' },
    { name: 'high', type: 'number', description: 'High threshold' },
    { name: 'optimum', type: 'number', description: 'Optimal value' },
  ],

  // Dialog element
  dialog: [
    { name: 'open', type: 'boolean', description: 'Whether dialog is open' },
  ],

  // Details element
  details: [
    { name: 'open', type: 'boolean', description: 'Whether details are visible' },
  ],

  // Ordered list
  ol: [
    { name: 'reversed', type: 'boolean', description: 'Reverse numbering' },
    { name: 'start', type: 'number', description: 'Starting number' },
    { name: 'type', type: 'enum', enumValues: ['1', 'a', 'A', 'i', 'I'], description: 'Numbering type' },
  ],

  // List item
  li: [
    { name: 'value', type: 'number', description: 'Item number (in ol)' },
  ],

  // Blockquote element
  blockquote: [
    { name: 'cite', type: 'url', description: 'Source URL' },
  ],

  // Quote element
  q: [
    { name: 'cite', type: 'url', description: 'Source URL' },
  ],

  // Time element
  time: [
    { name: 'dateTime', type: 'string', htmlAttribute: 'datetime', description: 'Machine-readable datetime' },
  ],

  // Data element
  data: [
    { name: 'value', type: 'string', description: 'Machine-readable value' },
  ],

  // Output element
  output: [
    { name: 'htmlFor', type: 'string', htmlAttribute: 'for', description: 'IDs of related elements' },
    { name: 'form', type: 'string', description: 'ID of associated form' },
    { name: 'name', type: 'string', description: 'Form field name' },
  ],
};

/**
 * Get property definitions for an HTML element tag
 * Combines global properties with element-specific properties
 * @param tag HTML tag name
 * @returns Array of property definitions
 */
export function getPropertyDefinitions(tag: string): PropertyDefinition[] {
  const normalized = tag.toLowerCase();
  const elementSpecific = HTML_ELEMENT_PROPERTIES[normalized] || [];
  // Combine global properties with element-specific ones
  return [...GLOBAL_PROPERTIES, ...elementSpecific];
}
