/**
 * Shared type definitions for HTML Props Builder Extension
 *
 * This file contains common interfaces used across multiple components
 * to ensure type safety and prevent 'any' type usage.
 */

/**
 * Element data used for element selection and manipulation
 */
export interface ElementData {
  /** Element tag name (e.g., 'div', 'button', 'my-component') */
  tag: string;

  /** Element attributes as key-value pairs */
  attributes: Record<string, string>;

  /** Element DOM properties (e.g., value, checked, disabled) */
  properties?: Record<string, unknown>;

  /** Element text content (if any) */
  textContent?: string;

  /**
   * Element selector in adapter-specific format
   * - HTML/DOM adapters: CSS selectors (e.g., "div.container > button")
   * - AST adapters: AST selectors (e.g., "Button:0", "0.1.2")
   */
  selector?: string;

  /**
   * Selector format used by the adapter
   * Helps UI understand how to work with selectors
   */
  selectorFormat?: "css" | "ast" | "path" | "custom";
}

/**
 * Property value with type information
 */
export interface PropertyData {
  /** Property value (as string for serialization) */
  value: unknown;

  /** Property type for correct parsing and code generation */
  type:
    | "string"
    | "number"
    | "boolean"
    | "function"
    | "signal"
    | "object"
    | "array";
}

/**
 * Element properties data for Properties Panel
 */
export interface PropertiesData {
  /** Element tag name */
  tag: string;

  /** Element properties with values and types */
  props: Record<string, PropertyData>;
}

/**
 * Layer item data (from Layers panel)
 */
export interface LayerData {
  /** Element metadata */
  element: {
    tag: string;
    attributes?: Record<string, string>;
    selector?: string;
    selectorFormat?: "css" | "ast" | "path" | "custom";
  };

  /** Display label */
  label?: string;

  /** Description */
  description?: string;
}

/**
 * Webview messages (discriminated union for type-safe message handling)
 *
 * Each message type has specific required fields, enabling TypeScript
 * to narrow types in switch statements.
 */
export type WebviewMessage =
  | { type: "webviewReady" }
  | { type: "ready" }
  | {
    type: "selectElement";
    tag: string;
    attributes: Record<string, string>;
    selector?: string;
    textContent?: string;
  }
  | {
    type: "hoverElement";
    tag: string;
    attributes: Record<string, string>;
    selector?: string;
  }
  | { type: "clearHover" }
  | {
    type: "updateProperty";
    name: string;
    value: string;
    propertyType: string;
    selector?: string;
  }
  | {
    type: "deleteElement";
    tag: string;
    attributes: Record<string, string>;
    selector?: string;
  }
  | {
    type: "duplicateElement";
    tag: string;
    attributes: Record<string, string>;
    selector?: string;
  }
  | {
    type: "copyElement";
    tag: string;
    attributes: Record<string, string>;
    selector?: string;
  }
  | {
    type: "moveElement";
    sourceTag: string;
    sourceAttributes: Record<string, string>;
    sourceSelector?: string;
    targetTag: string;
    targetAttributes: Record<string, string>;
    targetSelector?: string;
    position: "before" | "after" | "inside";
  }
  | {
    type: "insertElement";
    element: unknown;
    html?: string;
    tag?: string;
  }
  | {
    type: "dragStarted";
    html: string;
    tag: string;
  }
  | {
    type: "updateTree";
    layers: unknown[];
  }
  | {
    type: "createComponent";
  }
  | {
    type: "createComponentInCategory";
    categoryPath: string;
  }
  | {
    type: "deleteDirectory";
    directoryPath: string;
  };

/**
 * Command data for element insertion
 */
export interface InsertElementData {
  tag: string;
  attributes?: Record<string, string>;
  textContent?: string;
  html?: string;
}
