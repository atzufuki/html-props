type EventTargetMethods =
  | 'addEventListener'
  | 'dispatchEvent'
  | 'removeEventListener';

type NodeMethods =
  | EventTargetMethods
  | 'appendChild'
  | 'cloneNode'
  | 'compareDocumentPosition'
  | 'contains'
  | 'getRootNode'
  | 'hasChildNodes'
  | 'insertBefore'
  | 'isDefaultNamespace'
  | 'isEqualNode'
  | 'isSameNode'
  | 'lookupNamespaceURI'
  | 'lookupPrefix'
  | 'normalize'
  | 'removeChild'
  | 'replaceChild';

type AnimatableMethods = 'animate' | 'getAnimations';
type ChildNodeMethods = 'after' | 'before' | 'remove' | 'replaceWith';

type ParentNodeMethods =
  | 'append'
  | 'prepend'
  | 'querySelector'
  | 'querySelectorAll'
  | 'replaceChildren';

type ElementMethods =
  | NodeMethods
  | AnimatableMethods
  | ChildNodeMethods
  | ParentNodeMethods
  | 'attachShadow'
  | 'checkVisibility'
  | 'closest'
  | 'computedStyleMap'
  | 'getAttribute'
  | 'getAttributeNS'
  | 'getAttributeNames'
  | 'getAttributeNode'
  | 'getAttributeNodeNS'
  | 'getBoundingClientRect'
  | 'getClientRects'
  | 'getElementsByClassName'
  | 'getElementsByTagName'
  | 'getElementsByTagName'
  | 'getElementsByTagName'
  | 'getElementsByTagName'
  | 'getElementsByTagName'
  | 'getElementsByTagNameNS'
  | 'getElementsByTagNameNS'
  | 'getElementsByTagNameNS'
  | 'getElementsByTagNameNS'
  | 'hasAttribute'
  | 'hasAttributeNS'
  | 'hasAttributes'
  | 'hasPointerCapture'
  | 'insertAdjacentElement'
  | 'insertAdjacentHTML'
  | 'insertAdjacentText'
  | 'matches'
  | 'releasePointerCapture'
  | 'removeAttribute'
  | 'removeAttributeNS'
  | 'removeAttributeNode'
  | 'requestFullscreen'
  | 'requestPointerLock'
  | 'scroll'
  | 'scroll'
  | 'scrollBy'
  | 'scrollBy'
  | 'scrollIntoView'
  | 'scrollTo'
  | 'scrollTo'
  | 'setAttribute'
  | 'setAttributeNS'
  | 'setAttributeNode'
  | 'setAttributeNodeNS'
  | 'setPointerCapture'
  | 'toggleAttribute'
  | 'webkitMatchesSelector'
  | 'addEventListener'
  | 'addEventListener'
  | 'removeEventListener'
  | 'removeEventListener';

type NodeReadOnly =
  | 'baseURI'
  | 'childNodes'
  | 'firstChild'
  | 'isConnected'
  | 'lastChild'
  | 'nextSibling'
  | 'nodeName'
  | 'nodeType'
  | 'ownerDocument'
  | 'parentElement'
  | 'parentNode'
  | 'previousSibling'
  | 'ELEMENT_NODE'
  | 'ATTRIBUTE_NODE'
  | 'TEXT_NODE'
  | 'CDATA_SECTION_NODE'
  | 'ENTITY_REFERENCE_NODE'
  | 'ENTITY_NODE'
  | 'PROCESSING_INSTRUCTION_NODE'
  | 'COMMENT_NODE'
  | 'DOCUMENT_NODE'
  | 'DOCUMENT_TYPE_NODE'
  | 'DOCUMENT_FRAGMENT_NODE'
  | 'NOTATION_NODE'
  | 'DOCUMENT_POSITION_DISCONNECTED'
  | 'DOCUMENT_POSITION_PRECEDING'
  | 'DOCUMENT_POSITION_FOLLOWING'
  | 'DOCUMENT_POSITION_CONTAINS'
  | 'DOCUMENT_POSITION_CONTAINED_BY'
  | 'DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC';

type NonDocumentTypeChildNodeReadOnly =
  | 'nextElementSibling'
  | 'previousElementSibling';

type ParentNodeReadOnly =
  | 'childElementCount'
  | 'children'
  | 'firstElementChild'
  | 'lastElementChild';

type SlottableReadOnly = 'assignedSlot';

type ElementReadOnly =
  | NodeReadOnly
  | NonDocumentTypeChildNodeReadOnly
  | ParentNodeReadOnly
  | SlottableReadOnly
  | 'attributes'
  | 'classList'
  | 'clientHeight'
  | 'clientLeft'
  | 'clientTop'
  | 'clientWidth'
  | 'localName'
  | 'namespaceURI'
  | 'ownerDocument'
  | 'part'
  | 'prefix'
  | 'scrollHeight'
  | 'scrollWidth'
  | 'shadowRoot'
  | 'tagName';

type ElementCSSInlineStyleReadOnly = 'attributeStyleMap' | 'style';

type ElementContentEditableReadOnly = 'isContentEditable';

type HTMLOrSVGElementMethods = 'blur' | 'focus';
type HTMLOrSVGElementReadOnly = 'dataset';

export type HTMLElementMethods =
  | ElementMethods
  | HTMLOrSVGElementMethods
  | 'attachInternals'
  | 'click'
  | 'addEventListener'
  | 'removeEventListener';

export type HTMLElementReadOnly =
  | ElementReadOnly
  | ElementCSSInlineStyleReadOnly
  | ElementContentEditableReadOnly
  | HTMLOrSVGElementReadOnly
  | 'accessKeyLabel'
  | 'offsetHeight'
  | 'offsetLeft'
  | 'offsetParent'
  | 'offsetTop'
  | 'offsetWidth';

type FormMethods =
  | HTMLElementMethods
  | 'checkValidity'
  | 'reportValidity'
  | 'requestSubmit'
  | 'reset'
  | 'submit'
  | 'append'
  | 'addEventListener'
  | 'removeEventListener';

type FormReadOnly =
  | HTMLElementReadOnly
  | 'elements'
  | 'length'
  | 'relList'
  | 'length';

type OmittableKeys =
  | HTMLElementMethods
  | HTMLElementReadOnly
  | FormMethods
  | FormReadOnly;

export type Content =
  | Node
  | string
  | null
  | undefined
  | false
  | Array<Content>;

export interface HTMLElementLifecycles extends HTMLElement {
  /**
   * Called when the element is inserted into a document.
   * This can be useful for initializing the element's state or setting up event listeners.
   */
  connectedCallback?(): void;
  /**
   * Called when the element is removed from a document.
   * This can be useful for cleaning up any resources or event listeners that were set up in connectedCallback.
   */
  disconnectedCallback?(): void;
  /**
   * Called when the element is moved to a new document.
   * This can be useful for reinitializing the element's state or setting up event listeners in the new document.
   */
  adoptedCallback?(): void;
  /**
   * Called when one of the element's attributes is added, removed, or changed.
   * @param name - The name of the attribute that was changed.
   * @param oldValue - The previous value of the attribute.
   * @param newValue - The new value of the attribute.
   */
  attributeChangedCallback?(
    name: string,
    oldValue: string,
    newValue: string,
  ): void;

  /**
   * Called when a property is added, removed, or changed.
   * @param name - The name of the property that was changed.
   * @param oldValue - The previous value of the property.
   * @param newValue - The new value of the property.
   */
  propertyChangedCallback?(name: string, oldValue: any, newValue: any): void;
}

/**
 * A RefObject is an object with a single property `current` that can hold a value or be null.
 */
export type RefObject<T> = { current: T | null };

type ParseableProps<P> = {
  content?: Content;
  style?: Partial<CSSStyleDeclaration>;
  dataset?: Partial<DOMStringMap>;
  ref?: RefObject<P>;
};

type Override<T1, T2> = Omit<T1, keyof T2> & T2;

type NoStringIndex<T> = {
  [K in keyof T as string extends K ? never : K]: T[K];
};

type NoReadOnlyNorMethods<P = unknown> = Omit<
  NoStringIndex<Partial<P>>,
  OmittableKeys
>;

export type IncomingProps<P = unknown> = Override<
  NoReadOnlyNorMethods<P>,
  ParseableProps<P>
>;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type HTMLProps<T = unknown> = DeepPartial<IncomingProps<T>>;

export type Constructor<T = any, P = T> = new (...args: HTMLProps<P>[]) => T;

export interface HTMLUtilityConstructor<T = any, P = T> extends Constructor<T, P> {
  /**
   * The observed attributes for the custom element.
   */
  observedAttributes?: string[];

  /**
   * The observed properties for the custom element.
   */
  observedProperties?: string[];

  define(name: string, options?: ElementDefinitionOptions): Constructor<T, P>;
  getName(): string | null;
  getSelectors(selectors?: string): string;
}
