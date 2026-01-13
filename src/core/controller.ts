import { effect, type Signal, signal } from '@html-props/signals';
import type { HTMLElementLike, PropsConfig } from './types.ts';

// Unique symbols to avoid any property name conflicts
export const PROPS_CONTROLLER = Symbol.for('html-props:controller');
export const HTML_PROPS_MIXIN = Symbol.for('html-props:mixin');

/** Node that may have a PropsController attached */
interface ManagedNode {
  [PROPS_CONTROLLER]?: PropsController;
  nodeType: number;
  nodeValue: string | null;
  dataset?: DOMStringMap;
  id?: string;
  localName?: string;
  type?: string;
  attributes?: NamedNodeMap;
  querySelectorAll?(selectors: string): NodeListOf<Element>;
  hasChildNodes(): boolean;
  childNodes: NodeListOf<ChildNode>;
  parentNode: ParentNode | null;
  nextSibling: ChildNode | null;
  isEqualNode(otherNode: Node | null): boolean;
  remove?(): void;
}

/** Props passed to constructor or applyProps */
interface Props {
  ref?: ((el: HTMLElementLike | null) => void) | { current: HTMLElementLike | null };
  style?: Partial<CSSStyleDeclaration> | string;
  dataset?: Record<string, string | undefined>;
  innerHTML?: string;
  textContent?: string;
  children?: Node | Node[];
  content?: Node | Node[];
  [key: string]: unknown;
}

/**
 * Controller class that manages all html-props functionality.
 * This is stored on a single Symbol property to avoid conflicts.
 */
export class PropsController {
  private firstRenderDone = false;
  private lightDomApplied = false;
  private cleanup: (() => void) | null = null;
  private ref: Props['ref'] | null = null;
  private host: HTMLElementLike;
  private propsConfig: PropsConfig | null;
  private customProps: Record<string, Signal<unknown>> = {};
  private defaultProps: Record<string, unknown> = {};
  private updateScheduled = false;
  private connected = false;
  private eventListeners: Map<string, EventListener> = new Map();
  props: Props = {};

  constructor(host: HTMLElementLike, propsConfig: PropsConfig = {}, props: Props = {}) {
    this.host = host;
    this.propsConfig = propsConfig;
    this.props = props;

    for (const [key, value] of Object.entries(propsConfig)) {
      if (this.isCustomProp(key)) {
        // Use 'in' check to preserve null as valid default
        const defaultValue = 'default' in value ? value.default : undefined;
        this.customProps[key] = signal(defaultValue);
        Object.defineProperty(host, key, {
          get: () => this.customProps[key](),
          set: (v) => {
            const oldValue = this.customProps[key]();
            if (oldValue !== v) {
              this.customProps[key].set(v);
              // Dispatch event when non-function value changes
              if (value.event && typeof v !== 'function') {
                host.dispatchEvent(new CustomEvent(value.event, { detail: v }));
              }
            }
          },
          enumerable: true,
          configurable: true,
        });
      } else {
        this.defaultProps[key] = value;
      }
    }

    // Apply constructor props to custom props (safe without DOM manipulation)
    for (const [key, value] of Object.entries(props)) {
      if (this.isCustomProp(key) && this.customProps[key]) {
        this.customProps[key].set(value);
      }
    }

    // Merge defaultProps with constructor props and apply
    const mergedProps = this.merge(this.defaultProps, props) as Props;
    this.applyProps(host, mergedProps);
  }

  merge(...objects: (Record<string, unknown> | undefined | null)[]): Record<string, unknown> {
    const prepped = objects.filter((item): item is Record<string, unknown> => !!item);

    if (prepped.length === 0) {
      return {};
    }

    return prepped.reduce((result: Record<string, unknown>, current) => {
      Object.keys(current).forEach((key) => {
        const item = current[key];
        const existing = result[key];

        if (
          typeof item === 'object' && item !== null && !Array.isArray(item) &&
          typeof existing === 'object' && existing !== null && !Array.isArray(existing)
        ) {
          result[key] = this.merge(existing as Record<string, unknown>, item as Record<string, unknown>);
        } else {
          result[key] = item;
        }
      });
      return result;
    }, {});
  }

  isCustomProp(key: string): boolean {
    const cfg = this.propsConfig ? this.propsConfig[key] : null;
    return cfg && typeof cfg === 'object' && (
      typeof cfg.type === 'function' ||
      'default' in cfg ||
      'attribute' in cfg
    );
  }

  /**
   * Normalize children array: filter out null/undefined/boolean and convert strings/numbers to text nodes.
   */
  normalizeChildren(items: unknown[]): Node[] {
    const result: Node[] = [];
    for (const item of items) {
      if (item === null || item === undefined || item === true || item === false) {
        continue; // Skip
      }
      if (typeof item === 'string' || typeof item === 'number') {
        result.push(document.createTextNode(String(item)));
      } else if (item instanceof Node) {
        result.push(item);
      }
      // Arrays are not recursively flattened - caller should handle if needed
    }
    return result;
  }

  // ============================================
  // PUBLIC API: Two main methods
  // ============================================

  /**
   * Apply props to target element (style, dataset, event handlers, rest props).
   * Does NOT manipulate DOM children - safe to call in constructor.
   *
   * @param target - Element to apply props to
   * @param props - Props object (defaults to this.props)
   */
  applyProps(target: HTMLElementLike, props: Props = this.props) {
    this.applyStyle(target, props.style);
    this.applyDataset(target, props.dataset);
    this.applyEventHandlers(target, props);
    this.applyRestProps(target, props);
  }

  /**
   * Apply content to target element.
   *
   * Handles:
   * 1. Props-based content: innerHTML, textContent, content, children
   * 2. render() method output (if component has one)
   *
   * For wrappers (Lit/FAST): Call BEFORE super.connectedCallback() so slots see content.
   * For custom components: Called by requestUpdate/forceUpdate.
   *
   * @param target - Element to apply content to (defaults to this.host)
   */
  applyContent(target: HTMLElementLike = this.host) {
    const { content, children, innerHTML, textContent } = this.props;

    // 1. Check if component has render() method
    const hostWithRender = this.host as HTMLElementLike & { render?(): Node | Node[] | null };
    if (hostWithRender.render) {
      const renderResult = hostWithRender.render();

      // Only use render() result if it returns actual Node(s), not Lit/FAST template results
      const isTemplateResult = renderResult && typeof renderResult === 'object' && (
        '_$litType$' in renderResult || // Lit template result
        'create' in renderResult || // FAST template result
        'strings' in renderResult // Tagged template result
      );

      if (!isTemplateResult && renderResult != null) {
        this.currentRender = renderResult;
        const nodes = this.normalizeChildren(
          Array.isArray(renderResult) ? renderResult : [renderResult],
        );
        target.replaceChildren(...nodes);
        return;
      }
    }

    // 2. Props-based content (for wrappers without own render())
    // Skip if Light DOM content was already applied in connectedCallback
    if (this.lightDomApplied) return;

    // innerHTML takes priority
    if (innerHTML !== undefined) {
      target.innerHTML = innerHTML;
      return;
    }

    // textContent next
    if (textContent !== undefined) {
      target.textContent = textContent;
      return;
    }

    // content/children for Node-based content
    const nodeContent = content ?? children;
    if (nodeContent === undefined) return; // Preserve existing (HTML upgrade)

    const nodes = this.normalizeChildren(Array.isArray(nodeContent) ? nodeContent : [nodeContent]);
    target.replaceChildren(...nodes);
  }

  // ============================================
  // PRIVATE: Helper methods for applyProps
  // ============================================

  private isEventHandler(key: string): boolean {
    return key.startsWith('on') && key.length > 2;
  }

  private applyStyle(target: HTMLElementLike, style: Props['style']) {
    if (!style) return;
    if (!target.style) return;
    if (typeof style === 'object') {
      Object.assign(target.style, style);
    } else {
      target.setAttribute('style', String(style));
    }
  }

  private applyDataset(target: HTMLElementLike, dataset: Props['dataset']) {
    if (!dataset) return;
    if (!target.dataset) return;
    Object.assign(target.dataset, dataset);
  }

  applyRef(target: HTMLElementLike, ref: Props['ref']) {
    if (!ref) return;
    this.ref = ref;
    if (typeof ref === 'function') {
      ref(target);
    } else if (typeof ref === 'object' && 'current' in ref) {
      ref.current = target;
    }
  }

  private applyEventHandlers(target: HTMLElementLike, props: Props) {
    for (const [key, value] of Object.entries(props)) {
      if (this.isEventHandler(key)) {
        (target as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  private applyRestProps(target: HTMLElementLike, props: Props) {
    const reserved = new Set(['ref', 'style', 'dataset', 'innerHTML', 'textContent', 'children', 'content']);
    for (const [key, value] of Object.entries(props)) {
      if (reserved.has(key)) continue;
      if (this.isEventHandler(key)) continue;
      if (this.isCustomProp(key)) continue;
      (target as unknown as Record<string, unknown>)[key] = value;
    }
  }

  /**
   * Apply custom props from new props object.
   * Used during morphing to update signal-backed props.
   */
  applyCustomProps(props: Props) {
    for (const [key, value] of Object.entries(props)) {
      if (this.isCustomProp(key) && this.customProps[key]) {
        this.customProps[key].set(value);
      }
    }
  }

  // ============================================
  // RENDER & UPDATE: Lifecycle methods
  // ============================================

  requestUpdate() {
    // Prevent recursive updates
    if (this.updateScheduled) return;
    this.updateScheduled = true;

    try {
      const hostWithMethods = this.host as HTMLElementLike & {
        update?(): void;
        render?(): Node | Node[] | null;
      };

      if (this.firstRenderDone) {
        if (hostWithMethods.update) {
          hostWithMethods.update();
        } else {
          this.defaultUpdate();
        }
      } else {
        this.forceUpdate();
        this.firstRenderDone = true;
      }
    } finally {
      this.updateScheduled = false;
    }
  }

  currentRender: Node | Node[] | null = null;

  defaultUpdate() {
    const hostWithRender = this.host as HTMLElementLike & { render?(): Node | Node[] | null };
    if (hostWithRender.render) {
      // Use shadowRoot if available, otherwise host element
      const target = (this.host.shadowRoot ?? this.host) as HTMLElementLike;

      if (this.currentRender === null) {
        // First render
        this.applyContent(target);
        this.currentRender = Array.from(target.childNodes);
      } else {
        const nextRender = hostWithRender.render();
        if (nextRender) {
          const prevChildren = Array.from(target.childNodes);
          const nextChildren = this.normalizeChildren(Array.isArray(nextRender) ? nextRender : [nextRender]);
          this.reconcile(prevChildren, nextChildren, target);
          this.currentRender = Array.from(target.childNodes);
        }
      }
    }
  }

  // ============================================
  // Morphlex-inspired reconciliation algorithm
  // ============================================

  private static readonly ELEMENT_NODE = 1;
  private static readonly TEXT_NODE = 3;

  /**
   * Get the matching key for a node.
   * Priority: id attribute > dataset.key > props.dataset.key
   */
  private getNodeKey(node: ManagedNode | null): string | null {
    if (!node) return null;
    // id attribute (standard DOM)
    if (node.id) return `id:${node.id}`;
    // dataset.key
    if (node.dataset?.key) return `key:${node.dataset.key}`;
    // Props-based key
    const propsKey = node[PROPS_CONTROLLER]?.props?.dataset?.key;
    if (propsKey) {
      return `key:${propsKey}`;
    }
    return null;
  }

  /**
   * Get all descendant IDs as a Set (for matching by child IDs)
   */
  private getIdSet(node: ManagedNode): Set<string> {
    const ids = new Set<string>();
    if (node.querySelectorAll) {
      for (const el of node.querySelectorAll('[id]')) {
        if (el.id) ids.add(el.id);
      }
    }
    return ids;
  }

  /**
   * Get all descendant IDs as an Array
   */
  private getIdArray(node: ManagedNode): string[] {
    const ids: string[] = [];
    if (node.querySelectorAll) {
      for (const el of node.querySelectorAll('[id]')) {
        if (el.id) ids.push(el.id);
      }
    }
    return ids;
  }

  /**
   * Check if two nodes match for morphing purposes.
   * Returns: 'equal' | 'same' | 'none'
   */
  private matchNodes(from: ManagedNode | null, to: ManagedNode | null): 'equal' | 'same' | 'none' {
    if (!from || !to) return 'none';

    // Same object reference
    if (from === to) return 'equal';

    // Must be same node type
    if (from.nodeType !== to.nodeType) return 'none';

    // Text nodes - can morph by updating nodeValue
    if (from.nodeType === PropsController.TEXT_NODE) {
      // If content is same, it's equal
      if (from.nodeValue === to.nodeValue) return 'equal';
      return 'same';
    }

    // Element nodes - check tag name
    if (from.nodeType === PropsController.ELEMENT_NODE) {
      if (from.localName !== to.localName) return 'none';

      // For inputs, also check type attribute
      if (from.localName === 'input' && from.type !== to.type) {
        return 'none';
      }

      // If either has PROPS_CONTROLLER, always return 'same' to trigger morphNode
      // This ensures props-based content updates work correctly
      if (from[PROPS_CONTROLLER] || to[PROPS_CONTROLLER]) {
        return 'same';
      }

      // For standard DOM elements, use isEqualNode
      if (from.isEqualNode(to as unknown as Node)) return 'equal';

      return 'same';
    }

    return 'none';
  }

  /**
   * Find the longest increasing subsequence indices.
   * Used to minimize DOM move operations.
   */
  private longestIncreasingSubsequence(sequence: (number | undefined)[]): number[] {
    const n = sequence.length;
    if (n === 0) return [];

    const smallestEnding: number[] = [];
    const indices: number[] = [];
    const prev: number[] = new Array(n);

    for (let i = 0; i < n; i++) {
      const val = sequence[i];
      if (val === undefined) continue;

      // Binary search
      let left = 0;
      let right = smallestEnding.length;
      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (smallestEnding[mid]! < val) left = mid + 1;
        else right = mid;
      }

      prev[i] = left > 0 ? indices[left - 1]! : -1;
      smallestEnding[left] = val;
      indices[left] = i;
    }

    // Reconstruct LIS
    const result: number[] = [];
    let idx = indices[smallestEnding.length - 1];
    while (idx !== undefined && idx >= 0) {
      result.push(idx);
      idx = prev[idx];
    }
    return result.reverse();
  }

  /**
   * Main reconciliation method - Morphlex-inspired algorithm
   */
  reconcile(fromNodes: Node[], toNodes: Node[], parent: HTMLElementLike = this.host) {
    const fromChildren = fromNodes as unknown as ManagedNode[];
    const toChildren = toNodes as unknown as ManagedNode[];

    // Build ID sets for from nodes (for matching by descendant IDs)
    const fromIdSets = new Map<any, Set<string>>();
    for (const node of fromChildren) {
      if (node?.nodeType === PropsController.ELEMENT_NODE) {
        fromIdSets.set(node, this.getIdSet(node));
      }
    }

    // Track matches: toIndex -> fromIndex
    const matches: (number | undefined)[] = new Array(toChildren.length);
    const operations: ('equal' | 'same' | 'new')[] = new Array(toChildren.length);

    // Track which from nodes have been matched
    const unmatchedFrom = new Set<number>(fromChildren.map((_, i) => i));

    // ===== PHASE 1: Match by exact key/id =====
    for (let toIdx = 0; toIdx < toChildren.length; toIdx++) {
      const toNode = toChildren[toIdx];
      const toKey = this.getNodeKey(toNode);

      if (!toKey) continue;

      for (const fromIdx of unmatchedFrom) {
        const fromNode = fromChildren[fromIdx];
        const fromKey = this.getNodeKey(fromNode);

        if (toKey === fromKey) {
          const match = this.matchNodes(fromNode, toNode);
          if (match !== 'none') {
            matches[toIdx] = fromIdx;
            operations[toIdx] = match;
            unmatchedFrom.delete(fromIdx);
            break;
          }
        }
      }
    }

    // ===== PHASE 2: Match by descendant IDs (Idiomorph-inspired) =====
    for (let toIdx = 0; toIdx < toChildren.length; toIdx++) {
      if (matches[toIdx] !== undefined) continue;

      const toNode = toChildren[toIdx];
      if (!toNode || toNode.nodeType !== PropsController.ELEMENT_NODE) continue;

      const toIdArray = this.getIdArray(toNode);
      if (toIdArray.length === 0) continue;

      for (const fromIdx of unmatchedFrom) {
        const fromNode = fromChildren[fromIdx];
        const fromIdSet = fromIdSets.get(fromNode);

        if (fromIdSet && fromIdSet.size > 0) {
          // Check if any of toNode's descendant IDs exist in fromNode
          const hasMatchingId = toIdArray.some((id) => fromIdSet.has(id));
          if (hasMatchingId) {
            const match = this.matchNodes(fromNode, toNode);
            if (match !== 'none') {
              matches[toIdx] = fromIdx;
              operations[toIdx] = match;
              unmatchedFrom.delete(fromIdx);
              break;
            }
          }
        }
      }
    }

    // ===== PHASE 3: Match by isEqualNode =====
    // Skip this phase for nodes with PROPS_CONTROLLER - they need morphing even if DOM looks equal
    for (let toIdx = 0; toIdx < toChildren.length; toIdx++) {
      if (matches[toIdx] !== undefined) continue;

      const toNode = toChildren[toIdx];

      // Guard: skip null/undefined nodes
      if (!toNode) continue;

      // Skip isEqualNode check for props-controlled nodes - their content is in props, not DOM
      if (toNode[PROPS_CONTROLLER]) continue;

      for (const fromIdx of unmatchedFrom) {
        const fromNode = fromChildren[fromIdx];

        // Guard: skip null/undefined nodes
        if (!fromNode) continue;

        // Skip if from node has props controller
        if (fromNode[PROPS_CONTROLLER]) continue;

        if (fromNode.isEqualNode?.(toNode as unknown as Node)) {
          matches[toIdx] = fromIdx;
          operations[toIdx] = 'equal';
          unmatchedFrom.delete(fromIdx);
          break;
        }
      }
    }

    // ===== PHASE 4: Match by tag name / node type =====
    for (let toIdx = 0; toIdx < toChildren.length; toIdx++) {
      if (matches[toIdx] !== undefined) continue;

      const toNode = toChildren[toIdx];

      for (const fromIdx of unmatchedFrom) {
        const fromNode = fromChildren[fromIdx];
        const match = this.matchNodes(fromNode, toNode);

        if (match !== 'none') {
          matches[toIdx] = fromIdx;
          operations[toIdx] = match;
          unmatchedFrom.delete(fromIdx);
          break;
        }
      }
    }

    // Mark unmatched to nodes as 'new'
    for (let toIdx = 0; toIdx < toChildren.length; toIdx++) {
      if (matches[toIdx] === undefined) {
        operations[toIdx] = 'new';
      }
    }

    // ===== Remove unmatched from nodes =====
    for (const fromIdx of unmatchedFrom) {
      const node = fromChildren[fromIdx];
      if (node?.parentNode) {
        node.remove?.();
      }
    }

    // ===== Find LIS to minimize moves =====
    const lisIndices = this.longestIncreasingSubsequence(matches);
    const shouldNotMove = new Set<number>();
    for (const lisIdx of lisIndices) {
      const fromIdx = matches[lisIdx];
      if (fromIdx !== undefined) {
        shouldNotMove.add(fromIdx);
      }
    }

    // ===== Apply changes in order =====
    let insertionPoint: Node | null = parent.firstChild;

    for (let toIdx = 0; toIdx < toChildren.length; toIdx++) {
      const toNode = toChildren[toIdx];
      const fromIdx = matches[toIdx];
      const operation = operations[toIdx];

      if (operation === 'new') {
        // Insert new node
        parent.insertBefore(toNode as unknown as Node, insertionPoint);
        insertionPoint = toNode.nextSibling;
      } else if (fromIdx !== undefined) {
        const fromNode = fromChildren[fromIdx];

        // Move if not in LIS
        if (!shouldNotMove.has(fromIdx)) {
          if ((fromNode as unknown as Node) !== insertionPoint) {
            parent.insertBefore(fromNode as unknown as Node, insertionPoint);
          }
        }

        // Morph the node if not equal
        if (operation === 'same') {
          this.morphNode(fromNode, toNode);
        }

        insertionPoint = fromNode.nextSibling;
      }
    }
  }

  /**
   * Morph a single node (update attributes, props, and recurse children)
   */
  private morphNode(from: ManagedNode, to: ManagedNode) {
    // Text nodes - just update value
    if (from.nodeType === PropsController.TEXT_NODE) {
      if (from.nodeValue !== to.nodeValue) {
        from.nodeValue = to.nodeValue;
      }
      return;
    }

    // Element nodes
    if (from.nodeType === PropsController.ELEMENT_NODE) {
      // If both have PROPS_CONTROLLER, use props-based update
      const fromController = from[PROPS_CONTROLLER];
      const toController = to[PROPS_CONTROLLER];
      if (fromController && toController) {
        const props = toController.props;
        const target = from as unknown as HTMLElementLike;

        // Use the target's controller to apply props (correct propsConfig context)
        fromController.applyProps(target, props);
        // Apply custom props (signal-backed) to trigger reactive updates
        fromController.applyCustomProps(props);
        // Apply ref using target controller's context
        fromController.applyRef(target, props.ref);

        // Handle direct content props (innerHTML, textContent) - these replace all children
        if (this.applyDirectContent(target, props)) {
          return; // Direct content applied, no need to recurse
        }

        // Recurse children - normalize to ensure all are Node objects
        const nextContent = props.content || props.children;
        if (nextContent) {
          const prevChildren = Array.from(from.childNodes);
          const nextChildren = fromController.normalizeChildren(
            Array.isArray(nextContent) ? nextContent : [nextContent],
          );
          fromController.reconcile(
            prevChildren,
            nextChildren,
            from as unknown as HTMLElementLike,
          );
        }
      } else {
        // Standard DOM morphing - sync attributes
        this.morphAttributes(from as unknown as Element, to as unknown as Element);

        // Recurse children
        if (from.hasChildNodes() || to.hasChildNodes()) {
          const prevChildren = Array.from(from.childNodes);
          const nextChildren = Array.from(to.childNodes);
          this.reconcile(prevChildren, nextChildren, from as unknown as HTMLElementLike);
        }
      }
    }
  }

  /**
   * Apply direct content props (innerHTML, textContent) to target element.
   * These props replace all children, so no recursion is needed after applying.
   * @returns true if direct content was applied, false otherwise
   */
  private applyDirectContent(target: HTMLElementLike, props: Props): boolean {
    // innerHTML takes priority (same as applyLightDomContentDirect)
    if ('innerHTML' in props && props.innerHTML !== undefined) {
      target.innerHTML = String(props.innerHTML);
      return true;
    }

    // textContent next
    if ('textContent' in props && props.textContent !== undefined) {
      target.textContent = String(props.textContent);
      return true;
    }

    return false;
  }

  /**
   * Sync attributes from one element to another
   */
  private morphAttributes(from: Element, to: Element) {
    // Add/update attributes from 'to'
    for (let i = 0; i < to.attributes.length; i++) {
      const { name, value } = to.attributes[i]!;
      if (from.getAttribute(name) !== value) {
        from.setAttribute(name, value);
      }
    }

    // Remove attributes not in 'to'
    const toRemove: string[] = [];
    for (let i = 0; i < from.attributes.length; i++) {
      const { name } = from.attributes[i]!;
      if (!to.hasAttribute(name)) {
        toRemove.push(name);
      }
    }
    for (const name of toRemove) {
      from.removeAttribute(name);
    }
  }

  forceUpdate() {
    const target = (this.host.shadowRoot ?? this.host) as HTMLElementLike;
    this.applyContent(target);
  }

  reflectAttributes() {
    const host = this.host;
    const props = this.propsConfig;
    if (!props) return;

    Object.entries(props).forEach(([key, config]) => {
      const isPropConfig = config && typeof config === 'object' && (
        typeof config.type === 'function' ||
        'default' in config ||
        'attribute' in config
      );
      if (!isPropConfig) return;

      if (config.attribute) {
        const s = this.customProps[key];
        if (!s) return;
        const val = s();
        const attrName = typeof config.attribute === 'string' ? config.attribute : key.toLowerCase();

        const isBoolean = config.type === Boolean || (typeof config.default === 'boolean');

        if (isBoolean) {
          if (val) {
            if (!host.hasAttribute(attrName)) {
              host.setAttribute(attrName, '');
            }
          } else {
            if (host.hasAttribute(attrName)) {
              host.removeAttribute(attrName);
            }
          }
        } else {
          if (val != null) {
            const strVal = String(val);
            if (host.getAttribute(attrName) !== strVal) {
              host.setAttribute(attrName, strVal);
            }
          } else {
            host.removeAttribute(attrName);
          }
        }
      }
    });
  }

  /**
   * Setup event listeners for props with 'event' config.
   * Creates wrapper handlers that call the current prop value.
   */
  private setupEventListeners() {
    const props = this.propsConfig;
    if (!props) return;

    for (const [key, config] of Object.entries(props)) {
      if (config && typeof config === 'object' && config.event) {
        const eventName = config.event;
        // Create wrapper handler that calls current prop value
        const handler: EventListener = (e: Event) => {
          const fn = this.customProps[key]?.();
          if (typeof fn === 'function') {
            fn.call(this.host, e);
          }
        };
        this.eventListeners.set(eventName, handler);
        this.host.addEventListener(eventName, handler);
      }
    }
  }

  /**
   * Remove all event listeners created by setupEventListeners.
   */
  private cleanupEventListeners() {
    const host = this.host as HTMLElement;
    for (const [eventName, handler] of this.eventListeners) {
      host.removeEventListener(eventName, handler);
    }
    this.eventListeners.clear();
  }

  /**
   * Called AFTER super.connectedCallback().
   * Sets up effects for reactive updates.
   */
  onConnected() {
    // Prevent duplicate connections
    if (this.connected) return;
    this.connected = true;

    // Setup event listeners for props with 'event' config
    this.setupEventListeners();

    const renderDispose = effect(() => this.requestUpdate());
    const reflectDispose = effect(() => this.reflectAttributes());

    this.cleanup = () => {
      if (this.ref) {
        if (typeof this.ref === 'function') {
          this.ref(null);
        } else if (typeof this.ref === 'object' && 'current' in this.ref) {
          this.ref.current = null;
        }
      }
      renderDispose();
      reflectDispose();
      this.cleanupEventListeners();
    };
  }

  /**
   * Update content dynamically (called by content setter).
   * This applies content directly to Light DOM, bypassing the guard.
   */
  updateContent(target: HTMLElementLike) {
    this.applyLightDomContentDirect(target);
  }

  /**
   * Apply Light DOM content from props (innerHTML, textContent, content, children).
   * Does NOT call render() - this is for wrapper components that don't have render().
   * Has a guard to prevent duplicate application during initial connection.
   */
  applyLightDomContent(target: HTMLElementLike) {
    // Only apply once per connection (prevents duplicate from forceUpdate)
    if (this.lightDomApplied) return;
    this.lightDomApplied = true;

    this.applyLightDomContentDirect(target);
  }

  /**
   * Direct Light DOM content application (no guard).
   * Called by both applyLightDomContent and updateContent.
   */
  private applyLightDomContentDirect(target: HTMLElementLike) {
    const { content, children, innerHTML, textContent } = this.props;

    // innerHTML takes priority
    if (innerHTML !== undefined) {
      target.innerHTML = innerHTML;
      return;
    }

    // textContent next
    if (textContent !== undefined) {
      target.textContent = textContent;
      return;
    }

    // content/children for Node-based content
    const nodeContent = content ?? children;
    if (nodeContent === undefined) return; // Preserve existing (HTML upgrade)

    const nodes = this.normalizeChildren(Array.isArray(nodeContent) ? nodeContent : [nodeContent]);
    target.replaceChildren(...nodes);
  }

  onDisconnected() {
    this.connected = false;
    this.lightDomApplied = false; // Reset for reconnection
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;

    const props = this.propsConfig;
    if (!props) return;

    // Find prop for attribute
    const entry = Object.entries(props).find(([key, config]) => {
      const attr = typeof config.attribute === 'string' ? config.attribute : key.toLowerCase();
      return attr === name;
    });

    if (entry) {
      const [key, config] = entry;
      let val: string | number | boolean | null = newVal;

      if (config.type === Boolean || (typeof config.default === 'boolean')) {
        val = newVal !== null;
      } else if (config.type === Number || (typeof config.default === 'number')) {
        val = newVal === null ? null : Number(newVal);
      }

      (this.host as unknown as Record<string, unknown>)[key] = val;
    }
  }
}
