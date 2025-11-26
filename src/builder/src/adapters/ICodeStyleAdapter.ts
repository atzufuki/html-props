/**
 * Code Style Adapter Interface
 * 
 * Defines the contract for code style adapters that enable visual editing
 * of different code styles and technologies (HTML, React, Lit, html-props, etc.)
 */

/**
 * Metadata for an element in the visual editor
 */
export interface ElementMetadata {
  /** Element tag name (e.g., 'div', 'button', 'MyComponent') */
  tag: string;
  
  /** Element ID attribute */
  id?: string;
  
  /** Element class name(s) */
  className?: string;
  
  /** All element attributes as key-value pairs */
  attributes: Record<string, string>;
  
  /** Text content of the element */
  textContent?: string;
  
  /** Child elements */
  children?: ElementMetadata[];
  
  /** Whether this is a custom element (tag contains hyphen) */
  isCustomElement?: boolean;
  
  /** 
   * Element selector in adapter-specific format
   * Different adapters use different selector formats:
   * - HTML/DOM adapters: CSS selectors (e.g., "div.container > button")
   * - AST adapters: AST selectors (e.g., "Button:0", "0.1.2")
   * - Component adapters: Component paths, etc.
   */
  selector?: string;
  
  /** 
   * Selector format used by this adapter
   * Helps UI understand how to work with selectors
   */
  selectorFormat?: 'css' | 'ast' | 'path' | 'custom';
  
  /** 
   * @deprecated Use 'selector' field instead
   * Kept for backward compatibility with HTML/DOM adapters
   */
  cssSelector?: string;
}

/**
 * Definition of an available element type
 */
export interface ElementDefinition {
  /** Element tag name */
  tag: string;
  
  /** Display name in UI */
  displayName: string;
  
  /** Description shown to user */
  description: string;
  
  /** Category for grouping in UI */
  category: string;
  
  /** Optional icon identifier */
  icon?: string;
  
  /** Default attributes when creating new element */
  defaultAttributes?: Record<string, string>;
  
  /** Available attributes for this element type */
  availableAttributes?: AttributeDefinition[];
}

/**
 * Definition of an element attribute
 */
export interface AttributeDefinition {
  /** Attribute name */
  name: string;
  
  /** Attribute value type */
  type: 'string' | 'number' | 'boolean' | 'enum' | 'color' | 'url';
  
  /** Enum values (if type is 'enum') */
  enumValues?: string[];
  
  /** Default value */
  defaultValue?: string;
  
  /** Whether attribute is required */
  required?: boolean;
  
  /** Description of the attribute */
  description?: string;
}

/**
 * Position for inserting elements
 */
export interface InsertPosition {
  /** CSS selector of target element (optional if targetTag and targetAttributes provided) */
  targetSelector?: string;
  
  /** Target element tag name (alternative to targetSelector) */
  targetTag?: string;
  
  /** Target element attributes (alternative to targetSelector) */
  targetAttributes?: Record<string, string>;
  
  /** Where to insert relative to target */
  position: 'before' | 'after' | 'inside' | 'replace';
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether code is valid */
  valid: boolean;
  
  /** Error messages if invalid */
  errors?: string[];
}

/**
 * Code Style Adapter Interface
 * 
 * Each adapter handles a specific code style (e.g., HTML, React Functional, React Class,
 * html-props Signals, html-props Vanilla, etc.)
 */
export interface ICodeStyleAdapter {
  /**
   * Unique adapter identifier
   * Examples: 'html', 'react-functional', 'react-class', 'html-props-signals'
   */
  readonly id: string;
  
  /**
   * Human-readable display name
   * Examples: 'HTML', 'React (Functional)', 'React (Class)', 'html-props (Signals)'
   */
  readonly displayName: string;
  
  /**
   * File extensions this adapter handles
   * Examples: ['.html'], ['.tsx', '.jsx'], ['.ts']
   * 
   * Note: Multiple adapters can handle the same extensions (e.g., both React adapters handle .tsx)
   */
  readonly fileExtensions: string[];
  
  /**
   * Optional priority for adapter selection when multiple adapters match
   * Higher priority adapters are preferred. Default: 0
   * User-defined adapters can have higher priority to override built-in ones
   */
  readonly priority?: number;

  // === Parsing & Serialization ===
  
  /**
   * Parse source code into internal representation
   * 
   * Different adapters use different internal representations:
   * - HTML adapters: DOM tree (ParsedHTMLElement)
   * - TypeScript adapters: Abstract Syntax Tree (ts.SourceFile)
   * - React adapters: JSX AST
   * 
   * @param code Source code string
   * @returns Parsed representation (type varies by adapter)
   */
  parse(code: string): Promise<unknown>;
  
  /**
   * Parse preview HTML into HTML representation
   * 
   * Used for analyzing rendered preview HTML (not source code).
   * Returns HTML AST that can be queried with CSS selectors.
   * 
   * Only called by PropertiesWebviewViewProvider for element metadata extraction.
   * Optional - only needed if adapter supports properties panel.
   * 
   * @param html Preview HTML string
   * @returns HTML AST (ParsedHTMLElement from node-html-parser)
   */
  parsePreview?(html: string): Promise<unknown>;
  
  /**
   * Serialize internal representation back to source code
   * @param tree Parsed representation (DOM, AST, or other)
   * @returns Source code string
   */
  serialize(tree: unknown): Promise<string>;
  
  /**
   * Validate if code is parseable by this adapter
   * @param code Source code to validate
   * @returns Validation result
   */
  validate(code: string): Promise<ValidationResult>;

  // === Main Method - HTML Diff Application ===

  /**
   * Apply HTML diff to source code
   * 
   * **THIS IS THE MAIN METHOD FOR SOURCE CODE UPDATES**
   * 
   * Backend sends HTML diff (old vs new), adapter determines what changed
   * and applies equivalent change to AST.
   * 
   * Flow:
   * 1. Adapter receives oldHTML and newHTML
   * 2. Determines what changed (insert? delete? move? attribute change?)
   * 3. Parses source code → AST
   * 4. Applies equivalent change to AST
   * 5. Serializes AST → new source code
   * 6. Returns updated source code
   * 
   * Examples:
   * - Insert: oldHTML = '<div></div>', newHTML = '<div><button>Click</button></div>'
   * - Delete: oldHTML = '<div><button>Click</button></div>', newHTML = '<div></div>'
   * - Attribute: oldHTML = '<h1 class="title">Hello</h1>', newHTML = '<h1 class="heading">Hello</h1>'
   * - Move: oldHTML = '<div><a/><b/></div>', newHTML = '<div><b/><a/></div>'
   * 
   * @param oldHTML HTML before change (from Preview DOM)
   * @param newHTML HTML after change (from Preview DOM)
   * @param sourceCode Current source code of the file
   * @returns Updated source code with changes applied
   */
  applyHTMLDiff(oldHTML: string, newHTML: string, sourceCode: string, domJson?: any): Promise<string>;

  // === Code Generation ===
  
  /**
   * Generate code snippet for an element
   * 
   * Examples based on adapter style:
   * - HTML: <div class="container"></div>
   * - React Functional: <div className="container"></div>
   * - React Class: <div className="container"></div>
   * - Lit: html`<div class="container"></div>`
   * - HtmlProps Signals: new html.Div({ class: 'container' })
   * - HtmlProps Vanilla: new html.Div({ class: 'container' })
   * 
   * @param elementType Element tag/type
   * @param attributes Element attributes
   * @param textContent Element text content
   * @returns Generated code snippet
   */
  generateSnippet(
    elementType: string,
    attributes?: Record<string, string>,
    textContent?: string
  ): Promise<string>;

  // === Services (Optional) ===
  
  /**
   * Set DevServer instance for rendering components
   * Optional - some adapters may not need DevServer
   * 
   * @param devServer DevServer instance for bundling/serving components
   */
  setDevServer?(devServer: any): void;

  /**
   * Set CustomElementScanner instance
   * Allows adapter to look up custom element definitions and attributes
   * 
   * @param scanner CustomElementScanner instance for discovering custom elements
   */
  setCustomElementScanner?(scanner: any): void;
  
  /**
   * Get DevServer URL for this file
   * Optional - used by backend to fetch HTML directly from DevServer
   * instead of using renderPreview() output
   * 
   * @returns DevServer URL or null if not applicable
   */
  getDevServerUrl?(): string | null;
  
  // === Rendering (Required) ===
  
  /**
   * Render parsed representation to HTML for webview preview
   * All adapters must produce HTML for the visual editor to display
   * 
   * IMPORTANT: Should return complete HTML document structure:
   * - For HTML files: Full document with <head> (styles, scripts) and <body>
   * - For components: Generated HTML with necessary imports/styles
   * 
   * The returned HTML will be used in Preview DOM webview, so it should include
   * all necessary resources (CSS links, script tags, custom element imports).
   * 
   * For HTML files with custom elements, use DevServer to bundle element definitions.
   * For TypeScript components, use DevServer to execute and render the component.
   * 
   * @param tree Parsed representation (DOM, AST, or other)
   * @returns Complete HTML document string (not just body innerHTML)
   */
  renderPreview(tree: unknown): Promise<string>;
  
  /**
   * Extract element metadata (for Properties Panel)
   * 
   * Called by PropertiesWebviewViewProvider to get element information
   * for the properties panel. Works with preview HTML (not source code).
   * 
   * Optional - only needed if properties panel support is desired.
   * 
   * @param previewHtml Preview HTML string (rendered component output)
   * @param selector CSS selector to find element
   * @returns Element metadata or null if not found
   */
  getElementMetadata?(previewHtml: unknown, selector: string): Promise<ElementMetadata | null>;
  
  /**
   * Build property categories for the Properties Panel
   * 
   * Defines how element properties should be organized and displayed
   * for this specific code style. Called by PropertiesWebviewViewProvider.
   * 
   * Returns categorized properties/attributes with descriptions and type information.
   * Categories typically include:
   * - Basic: tag, id, class/className, text
   * - Element-Specific: tag-specific attributes/properties
   * - Custom: custom element attributes (via CustomElementScanner)
   * - Common: common global attributes/properties
   * 
   * @param tag Element tag name
   * @param attributes Element attributes as key-value pairs
   * @param properties Element properties (for TypeScript/compiled components)
   * @param textContent Element text content
   * @param sourceCode Unused (kept for backward compatibility)
   * @param currentFilePath Unused (kept for backward compatibility)
   * @returns Array of property categories
   */
  buildPropertyCategories?(
    tag: string,
    attributes: Record<string, string>,
    properties?: Record<string, unknown>,
    textContent?: string,
    sourceCode?: string,
    currentFilePath?: string
  ): Promise<Array<{
    id: string;
    label: string;
    description?: string;
    properties: Array<{
      name: string;
      value: string;
      type: 'tag' | 'id' | 'class' | 'attribute' | 'property' | 'text';
      editable: boolean;
      attrType?: string;
      category?: string;
      isSet?: boolean;
      source?: 'attribute' | 'property';
      description?: string;
    }>;
  }>>;
  
  /**
   * Get all elements as flat list (for Layers Panel)
   * Optional - only needed if layers panel support is desired
   * @param tree Parsed representation (DOM, AST, or other)
   * @returns Array of element metadata
   */
  getAllElements?(tree: unknown): Promise<ElementMetadata[]>;

  // === Element Discovery ===
  
  /**
   * Get custom element registration patterns for this code style
   * 
   * Returns regex patterns that match how custom elements are registered.
   * Used by CustomElementScanner to detect custom elements in files.
   * 
   * Examples:
   * - HTML/Vanilla: customElements.define('my-element', MyElement)
   * - html-props: MyElement.define('my-element')
   * - Lit: @customElement('my-element')
   * 
   * @returns Array of { pattern: RegExp, tagIndex: number, classIndex: number }
   */
  getCustomElementPatterns?(): Array<{
    pattern: RegExp;
    tagIndex: number;      // Capture group index for tag name
    classIndex: number;    // Capture group index for class name
  }>;

  /**
   * Get built-in elements available in this code style
   * 
   * Examples:
   * - HTML: div, span, button, etc.
   * - React (both styles): div, span, button, Fragment, etc.
   * - Lit: div, span, button, etc.
   * - HtmlProps (both styles): html.Div, html.Span, html.Button, etc.
   * 
   * @returns Array of built-in element definitions
   */
  getBuiltinElements(): Promise<ElementDefinition[]>;

  // === Adapter-Specific Methods (Optional) ===
  
  /**
   * Set current file path for adapters that need context
   * 
   * Some adapters (e.g., HtmlPropsAdapter) need to know which file they're editing
   * to properly resolve imports, custom elements, and component properties.
   * 
   * @param filePath Absolute path to the file being edited
   */
  setCurrentFilePath?(filePath: string): void;

  /**
   * Set current workspace folder for adapters that need context
   * 
   * Used by adapters to resolve relative bundle paths or other workspace-relative resources.
   * 
   * @param folder VSCode workspace folder containing the file
   */
  setCurrentWorkspaceFolder?(folder: any): void;
}
