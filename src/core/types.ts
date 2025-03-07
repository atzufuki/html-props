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

type ParseableProps = {
  children?: (string | Node)[];
  child?: Node | string;
  style?: Partial<CSSStyleDeclaration>;
  dataset?: Partial<DOMStringMap>;
};

type Override<T1, T2> = Omit<T1, keyof T2> & T2;

type NoStringIndex<T> = {
  [K in keyof T as string extends K ? never : K]: T[K];
};

type NoReadOnlyNorMethods<E = unknown> = Omit<
  NoStringIndex<Partial<E>>,
  OmittableKeys
>;

export type IncomingProps<E = unknown, P = unknown> =
  & Override<
    NoReadOnlyNorMethods<E>,
    ParseableProps
  >
  & P;

export type RenderObject =
  | Array<Node | string | null | undefined>
  | Node
  | string
  | null
  | undefined;
