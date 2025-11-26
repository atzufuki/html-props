import * as ts from 'typescript';
import * as vscode from 'vscode';
import * as path from 'path';
import { ElementDefinition, ElementMetadata, ICodeStyleAdapter, ValidationResult } from './ICodeStyleAdapter';
import { HTMLElement as ParsedHTMLElement, parse } from 'node-html-parser';
import { GLOBAL_PROPERTIES, HTML_ELEMENT_PROPERTIES } from '../schemas/htmlProperties';
import { CustomElementScanner } from '../services/CustomElementScanner';

/**
 * HTML Props Adapter
 *
 * Code style adapter for html-props TypeScript components.
 * Uses TypeScript compiler API and JSON-based code generation.
 *
 * Features:
 * - JSON-based rendering (receives DOM structure from frontend)
 * - Intelligent import separation (built-in vs custom elements)
 * - Component self-reference prevention
 * - Proper textContent vs content array handling
 */
export class HtmlPropsAdapter implements ICodeStyleAdapter {
  readonly id = 'html-props';
  readonly displayName = 'html-props (Signals)';
  readonly fileExtensions = ['.ts'];
  readonly priority = 10;

  private currentFilePath?: string;
  private currentWorkspaceFolder?: vscode.WorkspaceFolder;
  private customElementScanner?: CustomElementScanner;
  private devServer?: any; // DevServer instance for component rendering

  private compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.React,
    declaration: true,
    strict: true,
  };

  // === Parsing & Serialization ===

  async parsePreview(code: string): Promise<ParsedHTMLElement> {
    try {
      return parse(code, {
        comment: true,
        blockTextElements: {
          script: true,
          style: true,
          pre: true,
        },
      });
    } catch (error) {
      console.error('[HtmlAdapter.parse]', error);
      throw error;
    }
  }

  async parse(code: string): Promise<ts.SourceFile> {
    return ts.createSourceFile(
      'component.ts',
      code,
      ts.ScriptTarget.ES2020,
      true,
      ts.ScriptKind.TS,
    );
  }

  async serialize(ast: ts.SourceFile): Promise<string> {
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false,
    });

    return printer.printFile(ast);
  }

  async validate(code: string): Promise<ValidationResult> {
    try {
      const sourceFile = await this.parse(code);
      const hasHtmlPropsClass = this.findHtmlPropsClass(sourceFile) !== null;

      if (!hasHtmlPropsClass) {
        return {
          valid: false,
          errors: [
            'Not a valid html-props component (no class extending HTMLProps found)',
          ],
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message],
      };
    }
  }

  // === Main Method - HTML Diff Application ===

  /**
   * Apply HTML diff to source code
   *
   * For html-props components:
   * 1. Receive JSON DOM structure from frontend (domJson parameter)
   * 2. Generate html-props render() code from JSON
   * 3. Extract imports and return statement
   * 4. Replace render() method in source code with proper import insertion
   */
  async applyHTMLDiff(
    oldHTML: string,
    newHTML: string,
    sourceCode: string,
    domJson?: any,
  ): Promise<string> {
    try {
      // Extract component name from source code
      const sourceAst = ts.createSourceFile(
        'component.ts',
        sourceCode,
        ts.ScriptTarget.ES2020,
        true,
        ts.ScriptKind.TS,
      );
      const htmlPropsClass = this.findHtmlPropsClass(sourceAst);
      const componentName = htmlPropsClass?.name?.text || null;
      console.log('[applyHTMLDiff] Component name:', componentName);

      // Use domJson from frontend (contains props and element structure)
      console.log('[applyHTMLDiff] Generating code from JSON');
      const htmlPropsCode = this.generateHtmlPropsCodeFromJson(domJson, componentName);

      // Extract imports and return array from generated code using AST
      const codeAst = ts.createSourceFile(
        'generated.ts',
        htmlPropsCode,
        ts.ScriptTarget.ES2020,
        true,
      );

      const importStatements: string[] = [];
      let returnArrayBody = '';

      // Extract all imports and return statement from AST
      const extractCodeParts = (node: ts.Node): void => {
        // Collect all import statements
        if (ts.isImportDeclaration(node)) {
          importStatements.push(node.getText(codeAst));
        }
        // Find return statement with array
        if (ts.isReturnStatement(node) && node.expression && ts.isArrayLiteralExpression(node.expression)) {
          let arrayText = node.expression.getText(codeAst);
          console.log('[applyHTMLDiff] Raw arrayText first 50:', arrayText.substring(0, 50));

          // Remove outer [ and ]
          while (arrayText.startsWith('[')) {
            arrayText = arrayText.slice(1);
          }
          while (arrayText.endsWith(']')) {
            arrayText = arrayText.slice(0, -1);
          }
          returnArrayBody = arrayText.trim();

          console.log('[applyHTMLDiff] Extracted returnArrayBody length:', returnArrayBody.length);
          console.log('[applyHTMLDiff] First 100 chars:', returnArrayBody.substring(0, 100));
        }
        ts.forEachChild(node, extractCodeParts);
      };

      extractCodeParts(codeAst);

      console.log('[applyHTMLDiff] importStatements count:', importStatements.length);
      console.log('[applyHTMLDiff] returnArrayBody starts with:', returnArrayBody.substring(0, 50));

      // Replace render() method
      const newSourceCode = this.replaceRenderMethodAst(
        sourceCode,
        sourceAst,
        importStatements,
        returnArrayBody,
      );

      console.log('[applyHTMLDiff] Updated source:\n', newSourceCode);

      return newSourceCode;
    } catch (error) {
      console.error('[HtmlPropsAdapter.applyHTMLDiff] Error:', error);
      // On error, return original code to prevent breaking component
      return sourceCode;
    }
  }

  // === Code Generation ===

  async generateSnippet(
    elementType: string,
    attributes?: Record<string, string>,
    textContent?: string,
  ): Promise<string> {
    // Generate html-props syntax
    let snippet = `new ${elementType}({`;

    if (attributes) {
      const attrs = Object.entries(attributes).map(([key, value]) => {
        return `${key}: '${value}'`;
      }).join(', ');
      snippet += attrs;
    }

    snippet += '}';

    if (textContent) {
      snippet += `, '${textContent}'`;
    }

    snippet += ')';

    return snippet;
  }

  async generateComponent(
    name: string,
    structure: ElementMetadata[],
  ): Promise<string> {
    // TODO: Implement component generation
    return '';
  }

  /**
   * Generate code for a new component
   */
  generateNewComponentCode(
    className: string,
    tagName: string,
    baseElement: string,
    baseTag: string | undefined,
    properties: Array<{ name: string; type: string; defaultValue?: string }>,
  ): string {
    // Generate interface properties
    const interfaceProps = properties
      .map((p) => {
        const type = p.type === 'function' ? '() => void' : p.type;
        return `  ${p.name}?: ${type};`;
      })
      .join('\n');

    // Generate static props config
    const propsConfig = properties
      .filter((p) => p.type !== 'function')
      .map((p) => {
        const typeConstructor = p.type === 'string'
          ? 'String'
          : p.type === 'number'
          ? 'Number'
          : p.type === 'boolean'
          ? 'Boolean'
          : p.type === 'array'
          ? 'Array'
          : 'Object';

        const defaultVal = p.defaultValue !== undefined ? p.defaultValue : 'undefined';

        return `    ${p.name}: { type: ${typeConstructor}, default: ${defaultVal} },`;
      })
      .join('\n');

    // Generate property declarations
    const propDeclarations = properties
      .map((p) => {
        const type = p.type === 'function' ? '() => void' : p.type;
        return `  declare ${p.name}: ${type};`;
      })
      .join('\n');

    // Generate define call with extends support
    const defineCall = baseTag
      ? `${className}.define('${tagName}', { extends: '${baseTag}' });`
      : `${className}.define('${tagName}');`;

    return `import { HTMLPropsMixin } from '@html-props/core';
import { Div } from '@html-props/built-ins';

/**
 * Props interface for ${className}
 */
interface ${className}Props {
${interfaceProps}
}

/**
 * ${className} component
 * Generated by HTML Props Builder
 */
class ${className} extends HTMLPropsMixin(${baseElement})<${className}Props> {
  static props = {
${propsConfig}
  };

${propDeclarations}

  render() {
    return [
      new Div({
        content: [
          // Build your component structure here
          new Div({ textContent: '${className} works!' })
        ]
      })
    ];
  }
}

${defineCall}

export default ${className};
`;
  }

  // === Services ===

  setDevServer(devServer: any): void {
    this.devServer = devServer;
  }

  setCustomElementScanner(scanner: CustomElementScanner): void {
    this.customElementScanner = scanner;
  }

  /**
   * Get DevServer URL for this component
   * Returns preview HTML URL that loads and renders the component
   */
  getDevServerUrl(): string | null {
    if (!this.devServer || !this.currentFilePath) {
      return null;
    }

    const devServerUrl = this.devServer.getUrl?.();
    if (!devServerUrl) {
      return null;
    }

    // Return the preview endpoint URL that returns HTML
    // This endpoint generates HTML that loads the bundled component
    const previewUrl = `${devServerUrl}/preview?file=${encodeURIComponent(this.currentFilePath)}`;
    return previewUrl;
  }

  /**
   * Render AST to HTML for Preview DOM
   *
   * For html-props components, we create a wrapper HTML that:
   * 1. Loads the bundled component module
   * 2. Renders the component by tag name
   *
   * Supports two modes:
   * - With bundlePath: Load pre-bundled component from user-provided path
   * - Without bundlePath: Use DevServer to bundle on-the-fly
   */
  async renderPreview(ast: ts.SourceFile): Promise<string> {
    if (!this.currentFilePath) {
      return this.generateErrorHtml('File path not available');
    }

    try {
      // Extract component tag name from define() call
      const tagName = this.extractTagName(ast);
      if (!tagName) {
        return this.generateErrorHtml('No component.define() call found');
      }

      // Check if user provided a bundle path
      const bundlePath = this.getBundlePath();
      let scriptUrl: string | null = null;

      if (bundlePath) {
        // Use DevServer to serve the bundle
        if (this.devServer) {
          const devServerUrl = this.devServer.getUrl?.();
          if (devServerUrl) {
            scriptUrl = `${devServerUrl}/bundle?file=${encodeURIComponent(bundlePath)}`;
          } else {
            console.warn(
              '[HtmlPropsAdapter.renderPreview] DevServer URL not available',
            );
          }
        } else {
          console.warn(
            '[HtmlPropsAdapter.renderPreview] DevServer not available',
          );
        }
      }

      // If no bundlePath or DevServer not available, use DevServer bundling
      if (!scriptUrl && this.devServer) {
        const devServerUrl = this.devServer.getUrl?.();
        if (devServerUrl) {
          scriptUrl = this.devServer.getComponentUrl(this.currentFilePath);
        }
      }

      if (!scriptUrl) {
        const errorMsg = `Cannot determine script URL (DevServer: ${
          this.devServer ? 'available' : 'missing'
        }, bundlePath: ${bundlePath || 'not set'})`;
        return this.generateErrorHtml(errorMsg);
      }

      // Add cache buster (use & if URL already has query params, ? otherwise)
      const separator = scriptUrl.includes('?') ? '&' : '?';
      const cacheBuster = Date.now();
      const finalScriptUrl = `${scriptUrl}${separator}t=${cacheBuster}`;

      // Generate wrapper HTML that loads and renders the component
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    /* Hide component until it's defined and rendered */
    ${tagName}:not(:defined) {
      display: none;
    }
  </style>
</head>
<body>
  <!-- Component tag - will be defined by the bundle script below -->
  <${tagName}></${tagName}>
  
  <!-- Load the bundled component script -->
  <script type="module">
    try {
      const module = await import('${finalScriptUrl}');
    } catch (error) {
      console.error('[Bundle] Error importing bundle:', error);
    }
  <\/script>
</body>
</html>`;
    } catch (error) {
      console.error('[HtmlPropsAdapter.renderPreview] Error:', error);
      return this.generateErrorHtml((error as Error).message);
    }
  }

  async getElementMetadata(
    ast: ParsedHTMLElement,
    selector: string,
  ): Promise<ElementMetadata | null> {
    const element = await this.findElement(ast, selector);
    if (!element) return null;

    const attributes: Record<string, string> = {};
    if (element.rawAttrs) {
      // Parse attributes manually without regex
      let i = 0;
      const attrs = element.rawAttrs;
      while (i < attrs.length) {
        // Skip whitespace
        while (i < attrs.length && /\s/.test(attrs[i])) i++;
        if (i >= attrs.length) break;

        // Read attribute name
        let name = '';
        while (i < attrs.length && /[\w-]/.test(attrs[i])) name += attrs[i++];
        if (!name) break;

        // Skip to =
        while (i < attrs.length && /\s/.test(attrs[i])) i++;
        if (i >= attrs.length || attrs[i] !== '=') continue;
        i++; // skip =

        // Skip to "
        while (i < attrs.length && /\s/.test(attrs[i])) i++;
        if (i >= attrs.length || attrs[i] !== '"') continue;
        i++; // skip opening "

        // Read value
        let value = '';
        while (i < attrs.length && attrs[i] !== '"') value += attrs[i++];

        attributes[name] = value;
        i++; // skip closing "
      }
    }

    return {
      tag: element.tagName?.toLowerCase() || '',
      id: element.getAttribute('id'),
      className: element.getAttribute('class'),
      attributes,
      textContent: element.textContent,
      selector,
      selectorFormat: 'css',
    };
  }

  /**
   * Build property categories for the Properties Panel
   * HTML-props adapter extracts properties from TypeScript source code
   */
  async buildPropertyCategories(
    tag: string,
    attributes: Record<string, string>,
    properties?: Record<string, unknown>,
    textContent?: string,
    sourceCode?: string,
    currentFilePath?: string,
  ): Promise<
    Array<{
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
        enumValues?: string[];
      }>;
    }>
  > {
    const categories: Array<{
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
        enumValues?: string[];
      }>;
    }> = [];

    // Category 1: Basic properties
    categories.push({
      id: 'basic',
      label: 'Basic',
      properties: [
        {
          name: 'tag',
          value: tag,
          type: 'tag',
          editable: false,
        },
        {
          name: 'id',
          value: attributes['id'] || '',
          type: 'id',
          editable: true,
          attrType: 'string',
          isSet: 'id' in attributes,
        },
        {
          name: 'className',
          value: attributes['class'] || '',
          type: 'class',
          editable: true,
          attrType: 'string',
          isSet: 'class' in attributes,
          source: 'property',
        },
        {
          name: 'text',
          value: textContent || '',
          type: 'text',
          editable: true,
          attrType: 'string',
          isSet: !!textContent,
        },
      ],
    });

    // Category 2: Custom Properties (extracted from CustomElementScanner)
    // If this is a custom element, use the scanner's parsed attributes as properties
    if (tag.includes('-') && this.customElementScanner) {
      const customElementDef = this.customElementScanner.getCustomElement(tag);
      if (customElementDef && customElementDef.attributes && customElementDef.attributes.length > 0) {
        const customProps = customElementDef.attributes.map((attr: any) => {
          const propValue = properties?.[attr.name];
          return {
            name: attr.name,
            value: String(propValue ?? ''),
            type: 'property' as const,
            editable: true,
            attrType: attr.type,
            isSet: attr.name in (properties || {}),
            source: 'property' as const,
            description: attr.description,
            enumValues: attr.enumValues,
          };
        });
        if (customProps.length > 0) {
          categories.push({
            id: 'custom',
            label: 'Custom Properties',
            properties: customProps,
          });
        }
      }
    }

    // Category 3: Global Properties
    const globalPropsToShow = GLOBAL_PROPERTIES.filter((p: any) =>
      ['title', 'role', 'ariaLabel', 'ariaDescribedby'].includes(p.name)
    );
    if (globalPropsToShow.length > 0) {
      categories.push({
        id: 'common',
        label: 'Common',
        properties: globalPropsToShow.map((prop: any) => ({
          name: prop.name,
          value: String(properties?.[prop.name] ?? attributes[prop.htmlAttribute || prop.name] ?? ''),
          type: 'property',
          editable: true,
          attrType: prop.type,
          isSet: (prop.name in (properties || {})) || (prop.htmlAttribute in attributes),
          source: 'property',
          description: prop.description,
        })),
      });
    }

    return categories;
  }

  async getAllElements(ast: ts.SourceFile): Promise<ElementMetadata[]> {
    // TODO: Implement element listing
    return [];
  }

  // === Element Discovery ===

  async getBuiltinElements(): Promise<ElementDefinition[]> {
    return [
      {
        tag: 'div',
        displayName: 'Div',
        description: 'Generic container',
        category: 'Layout',
      },
      {
        tag: 'span',
        displayName: 'Span',
        description: 'Inline container',
        category: 'Layout',
      },
      {
        tag: 'p',
        displayName: 'Paragraph',
        description: 'Paragraph text',
        category: 'Text',
      },
      {
        tag: 'h1',
        displayName: 'Heading 1',
        description: 'Main heading',
        category: 'Text',
      },
      {
        tag: 'h2',
        displayName: 'Heading 2',
        description: 'Subheading',
        category: 'Text',
      },
      {
        tag: 'button',
        displayName: 'Button',
        description: 'Click button',
        category: 'Interactive',
      },
      {
        tag: 'input',
        displayName: 'Input',
        description: 'Text input',
        category: 'Interactive',
      },
      {
        tag: 'a',
        displayName: 'Link',
        description: 'Hyperlink',
        category: 'Interactive',
      },
    ];
  }

  setCurrentFilePath(filePath: string): void {
    this.currentFilePath = filePath;
  }

  setCurrentWorkspaceFolder(folder: vscode.WorkspaceFolder): void {
    this.currentWorkspaceFolder = folder;
  }

  // === Helper Methods ===

  private async findElement(
    ast: ParsedHTMLElement,
    selector: string,
  ): Promise<ParsedHTMLElement | null> {
    try {
      const element = ast.querySelector(selector);
      return element as ParsedHTMLElement || null;
    } catch {
      return null;
    }
  }

  private generateErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div style="padding: 20px; color: #d00; font-family: sans-serif;">
    <p>${message}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Generate html-props code from JSON structure (preserves element props)
   * JSON has tag, attributes, props, and children
   */
  private generateHtmlPropsCodeFromJson(json: any, componentName: string | null = null): string {
    const lines: string[] = [];
    const builtInElements = new Set<string>();
    const customElements = new Map<string, string>(); // className -> import path

    console.log('[generateHtmlPropsCodeFromJson] Starting JSON conversion, componentName:', componentName);
    console.log('[generateHtmlPropsCodeFromJson] Input JSON:', JSON.stringify(json).substring(0, 200));

    // Collect used elements from JSON
    if (json && Array.isArray(json)) {
      for (const item of json) {
        this.collectElementsFromJson(item, builtInElements, customElements, componentName);
      }
    } else if (json) {
      this.collectElementsFromJson(json, builtInElements, customElements, componentName);
    }

    console.log('[generateHtmlPropsCodeFromJson] Built-in elements:', Array.from(builtInElements));
    console.log('[generateHtmlPropsCodeFromJson] Custom elements:', Array.from(customElements.entries()));

    // Generate imports for built-in elements
    if (builtInElements.size > 0) {
      const builtInImports = Array.from(builtInElements).sort().join(', ');
      lines.push(`import { ${builtInImports} } from '@html-props/built-ins';`);
    }

    // Generate imports for custom elements (each from their own path)
    if (customElements.size > 0) {
      for (const [className, importPath] of customElements) {
        lines.push(`import { ${className} } from '${importPath}';`);
      }
    }

    if (builtInElements.size > 0 || customElements.size > 0) {
      lines.push('');
    }

    lines.push('    return [');

    // Convert JSON to html-props code
    if (Array.isArray(json)) {
      console.log('[generateHtmlPropsCodeFromJson] Processing array with', json.length, 'items');
      json.forEach((item, index) => {
        const isLast = index === json.length - 1;
        const elementLines = this.jsonNodeToHtmlProps(item, 2, componentName, isLast);
        console.log('[generateHtmlPropsCodeFromJson] Item', index, 'generated', elementLines.length, 'lines');
        lines.push(...elementLines);
      });
    } else if (json) {
      console.log('[generateHtmlPropsCodeFromJson] Processing single object');
      const elementLines = this.jsonNodeToHtmlProps(json, 2, componentName, true);
      console.log('[generateHtmlPropsCodeFromJson] Generated', elementLines.length, 'lines');
      lines.push(...elementLines);
    }

    lines.push('    ];');
    const result = lines.join('\n');
    console.log('[generateHtmlPropsCodeFromJson] Final result length:', result.length);
    console.log('[generateHtmlPropsCodeFromJson] First 500 chars:', result.substring(0, 500));
    return result;
  }

  /**
   * Get relative import path from current file to target file
   * Example: from /src/views/home.ts to /src/md3/outlined_button.ts
   * Returns: ../md3/outlined_button.ts (keeps .ts extension for TypeScript imports)
   */
  private getRelativeImportPath(targetFilePath: string): string {
    if (!this.currentFilePath) {
      console.warn('[getRelativeImportPath] currentFilePath not set, using raw path:', targetFilePath);
      return targetFilePath;
    }

    const currentDir = path.dirname(this.currentFilePath);
    const relativePath = path.relative(currentDir, targetFilePath);

    // Normalize path separators to forward slashes for imports
    let importPath = relativePath.replace(/\\/g, '/');

    // Ensure it starts with ./ or ../
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }

    // Keep .ts extension for custom element imports (TypeScript/Deno requires it)
    if (!importPath.endsWith('.ts')) {
      importPath += '.ts';
    }

    console.log('[getRelativeImportPath] from:', this.currentFilePath, 'to:', targetFilePath, 'result:', importPath);
    return importPath;
  }

  /**
   * Collect elements from JSON structure
   * Separates built-in elements from custom elements
   * Excludes the component itself (componentName) from imports
   */
  private collectElementsFromJson(
    node: any,
    builtInElements: Set<string>,
    customElements: Map<string, string>,
    componentName: string | null = null,
  ): void {
    if (node.type === 'element' && node.tag) {
      const tag = node.tag.toLowerCase();
      const className = this.getHtmlPropsClassName(tag);

      // Skip if this is the component itself (don't import yourself!)
      if (componentName && className === componentName) {
        console.log('[collectElementsFromJson] Skipping self-reference:', className);
        // Still process children
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            this.collectElementsFromJson(child, builtInElements, customElements, componentName);
          }
        }
        return;
      }

      // Check if it's a built-in element (doesn't contain hyphen)
      if (!tag.includes('-')) {
        // Built-in element
        builtInElements.add(className);
        console.log('[collectElementsFromJson] Added built-in element:', className, 'from tag:', tag);

        // Process children of built-in elements
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            this.collectElementsFromJson(child, builtInElements, customElements, componentName);
          }
        }
      } else {
        // Custom element (has hyphen) - look up its import path
        // NOTE: Do NOT process children of custom elements - they're encapsulated
        if (this.customElementScanner) {
          const customElem = this.customElementScanner.getCustomElement(tag);
          if (customElem && customElem.filePath) {
            const importPath = this.getRelativeImportPath(customElem.filePath);
            customElements.set(className, importPath);
            console.log(
              '[collectElementsFromJson] Added custom element:',
              className,
              'from tag:',
              tag,
              'path:',
              importPath,
            );
          } else {
            console.warn('[collectElementsFromJson] Custom element not found or no filePath:', tag);
          }
        } else {
          console.warn('[collectElementsFromJson] CustomElementScanner not available');
        }
      }
    } else if (node.type === 'text') {
      // Text nodes don't need imports, skip them
    }
  }

  /**
   * Convert JSON element node to html-props code
   * Handles both regular elements and custom elements with props
   */
  private jsonNodeToHtmlProps(
    node: any,
    indent: number,
    componentName: string | null = null,
    isLast: boolean = true,
  ): string[] {
    const lines: string[] = [];
    const indentStr = ' '.repeat(indent);
    const comma = isLast ? '' : ',';

    if (node.type === 'text') {
      // Text node - return as string literal with proper indentation
      const text = (node.content || '').trim();
      if (text) {
        lines.push(`${indentStr}'${text.replace(/'/g, "\\'")}'${comma}`);
      }
      return lines;
    }

    if (node.type !== 'element' || !node.tag) {
      return lines;
    }

    const tag = node.tag.toLowerCase();
    const className = this.getHtmlPropsClassName(tag);

    // Skip if this is the component itself (don't render yourself!)
    if (componentName && className === componentName) {
      console.log('[jsonNodeToHtmlProps] Skipping self-reference:', className, 'componentName:', componentName);
      // Render only children instead
      if (node.children && Array.isArray(node.children)) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const isLastChild = i === node.children.length - 1 && isLast;
          lines.push(...this.jsonNodeToHtmlProps(child, indent, componentName, isLastChild));
        }
      }
      return lines;
    }

    // Determine if this is a third-party web component (has hyphen in name)
    const isThirdPartyWebComponent = tag.includes('-');

    // Build attributes object from HTML attributes + props
    const attrs: string[] = [];

    if (node.attributes && typeof node.attributes === 'object') {
      for (const [key, value] of Object.entries(node.attributes)) {
        // Skip the 'is' attribute (internal DOM marker) and 'title' (browser default tooltip)
        if (key === 'is' || key === 'title') continue;

        // Map HTML attribute names to html-props names
        const propKey = key === 'class' ? 'className' : key;

        // Escape value for JavaScript
        const escaped = (value as string).replace(/'/g, "\\'");
        attrs.push(`${propKey}: '${escaped}'`);
      }
    }

    // Add custom element props directly (only for third-party web components with hyphens)
    if (isThirdPartyWebComponent && node.props && typeof node.props === 'object') {
      for (const [key, value] of Object.entries(node.props)) {
        if (typeof value === 'string') {
          const escaped = (value as string).replace(/'/g, "\\'");
          attrs.push(`${key}: '${escaped}'`);
        } else if (typeof value === 'boolean') {
          attrs.push(`${key}: ${value}`);
        } else if (typeof value === 'number') {
          attrs.push(`${key}: ${value}`);
        } else {
          attrs.push(`${key}: ${JSON.stringify(value)}`);
        }
      }
    }

    // Handle children
    let children: any[] = node.children || [];

    // For third-party web components (with hyphen), don't render their children
    if (isThirdPartyWebComponent) {
      children = [];
    }

    // Build the element code
    const attrStr = attrs.length > 0 ? `{ ${attrs.join(', ')} }` : '{}';

    // No children - simple form
    if (children.length === 0) {
      lines.push(`${indentStr}new ${className}(${attrStr})${comma}`);
      return lines;
    }

    // Has children - build with content property
    const childLines: string[] = [];

    // Process each child
    children.forEach((child, idx) => {
      const isLastChild = idx === children.length - 1;
      const childOutput = this.jsonNodeToHtmlProps(child, indent + 2, componentName, isLastChild);
      childLines.push(...childOutput);
    });

    // Build final attributes with content
    // Check if we only have text children
    const hasOnlyText = childLines.every((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith("'") && trimmed.endsWith("'");
    });

    let finalAttrs: string;
    if (hasOnlyText && childLines.length === 1) {
      // Single text child - use textContent instead of content
      const trimmedLine = childLines[0].trim();
      // Remove trailing comma only (keep quotes)
      const textContent = trimmedLine.endsWith(',') ? trimmedLine.slice(0, -1) : trimmedLine;
      finalAttrs = attrs.length > 0
        ? `{ ${attrs.join(', ')}, textContent: ${textContent} }`
        : `{ textContent: ${textContent} }`;
    } else {
      // Multiple children or mixed content - use content array
      finalAttrs = attrs.length > 0
        ? `{ ${attrs.join(', ')}, content: [\n${childLines.join('\n')}\n${indentStr}] }`
        : `{ content: [\n${childLines.join('\n')}\n${indentStr}] }`;
    }

    lines.push(`${indentStr}new ${className}(${finalAttrs})${comma}`);

    return lines;
  }

  /**
   * Get html-props class name for HTML tag
   * Maps HTML tag names to their class names in @html-props/built-ins package
   */
  private getHtmlPropsClassName(tag: string): string {
    // Explicit mapping for HTML elements to their @html-props/built-ins class names
    // Some elements have special names that don't follow simple capitalization
    const htmlPropsMapping: Record<string, string> = {
      // Special mappings
      'a': 'Anchor',
      'em': 'Emphasis',
      'i': 'Italic',
      'b': 'Bold',
      's': 'Strikethrough',
      'u': 'Underline',
      'kbd': 'Keyboard',
      'samp': 'Sample',
      'mark': 'Mark',
      'q': 'Quote',
      'abbr': 'Abbreviation',
      'cite': 'Citation',
      'code': 'Code',
      'strong': 'Strong',
      'small': 'Small',
      'sub': 'Subscript',
      'sup': 'Superscript',
      'del': 'Deleted',
      'ins': 'Inserted',
      'dfn': 'Definition',
      'time': 'Time',
      'var': 'Variable',
      'wbr': 'WordBreak',
      'br': 'LineBreak',
      'hr': 'HorizontalRule',
      'nav': 'Navigation',
      'main': 'Main',
      'article': 'Article',
      'aside': 'Aside',
      'header': 'Header',
      'footer': 'Footer',
      'hgroup': 'HeadingGroup',
      'section': 'Section',
      'address': 'Address',
      'pre': 'Preformatted',
    };

    // Check explicit mapping first
    if (htmlPropsMapping[tag]) {
      return htmlPropsMapping[tag];
    }

    // For unmapped HTML tags, use simple capitalization
    const builtins = [
      'a',
      'abbr',
      'address',
      'area',
      'article',
      'aside',
      'audio',
      'b',
      'base',
      'bdi',
      'bdo',
      'blockquote',
      'body',
      'br',
      'button',
      'canvas',
      'caption',
      'cite',
      'code',
      'col',
      'colgroup',
      'data',
      'datalist',
      'dd',
      'del',
      'details',
      'dfn',
      'dialog',
      'div',
      'dl',
      'dt',
      'em',
      'embed',
      'fieldset',
      'figcaption',
      'figure',
      'footer',
      'form',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'head',
      'header',
      'hgroup',
      'hr',
      'html',
      'i',
      'iframe',
      'img',
      'input',
      'ins',
      'kbd',
      'keygen',
      'label',
      'legend',
      'li',
      'link',
      'main',
      'map',
      'mark',
      'menu',
      'menuitem',
      'meta',
      'meter',
      'nav',
      'noscript',
      'object',
      'ol',
      'optgroup',
      'option',
      'output',
      'p',
      'param',
      'picture',
      'pre',
      'progress',
      'q',
      'rp',
      'rt',
      'ruby',
      's',
      'samp',
      'script',
      'section',
      'select',
      'small',
      'source',
      'span',
      'strong',
      'style',
      'sub',
      'summary',
      'sup',
      'svg',
      'table',
      'tbody',
      'td',
      'textarea',
      'tfoot',
      'th',
      'thead',
      'time',
      'title',
      'tr',
      'track',
      'u',
      'ul',
      'var',
      'video',
      'wbr',
    ];

    if (builtins.includes(tag)) {
      // Simple capitalization for unmapped tags
      return tag.charAt(0).toUpperCase() + tag.slice(1);
    }

    // Custom elements: look up className from tag using CustomElementScanner
    if (this.customElementScanner) {
      const customElem = this.customElementScanner.getCustomElement(tag);
      if (customElem && customElem.className) {
        return customElem.className;
      }
    }

    // Fallback: muunna hyphenated-name to PascalCaseName
    // Esim: "md3-outlined-button" → "Md3OutlinedButton"
    const parts = tag.split('-');
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }

  /**
   * Recursively convert DOM node to html-props code
   * @param componentName Class name of current component (to avoid self-wrapping in render)
   * @param isLastChild Whether this node is the last child in its parent
   */
  /**
   * Replace render() method in source code with new implementation
   * Uses TypeScript AST for reliable method replacement
   */
  private replaceRenderMethodAst(
    sourceCode: string,
    sourceFile: ts.SourceFile,
    importStatements: string[],
    returnArrayBody: string,
  ): string {
    let updated = sourceCode;

    // Step 1: Remove only the generated import statements (those with named imports)
    // Keep imports like: import HTMLProps from "@html-props/core"
    // Remove imports like: import { Div, H1 } from '@html-props/built-ins'
    // Remove imports like: import { OutlinedButton } from '../md3/outlined_button'

    // This regex matches lines with named imports: "import { ... } from '...'"
    // The /gm flags mean global and multiline, allowing ^ and $ to match line boundaries
    // We exclude @html-props/core to preserve the mixin import
    updated = updated.replace(/^import\s+\{[^}]*\}\s+from\s+['"](?!@html-props\/core)[^'"]*['"];?(\s*\n)?/gm, '');

    // Clean up extra blank lines left by import removal (2+ consecutive newlines -> 1)
    updated = updated.replace(/\n{3,}/g, '\n\n');

    // Step 2: Add new import statements after HTMLProps and comments
    if (importStatements.length > 0) {
      const lines = updated.split('\n');
      let insertLineIdx = 0;

      // Find the insertion point: after HTMLProps imports, comments, and blank lines
      // But before any other code (interfaces, classes, functions)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Continue scanning while we see comments, blank lines, or default imports
        if (
          line === '' || // empty line
          line.startsWith('//') || // single-line comment
          line.startsWith('/*') || line.startsWith('*') || // multi-line comment
          (line.startsWith('import ') && !line.includes('{'))
        ) { // default import like "import HTMLProps"
          insertLineIdx = i + 1;
        } else {
          // We've found actual code, stop here
          break;
        }
      }

      // Build the updated code with new imports inserted
      const beforeLines = lines.slice(0, insertLineIdx);
      const afterLines = lines.slice(insertLineIdx);

      // Add imports + blank line for separation
      const importsWithSeparator = [...importStatements, ''];

      const allLines = [...beforeLines, ...importsWithSeparator, ...afterLines];
      updated = allLines.join('\n');

      console.log(
        '[replaceRenderMethod] Inserted',
        importStatements.length,
        'new import statements at line',
        insertLineIdx,
      );
    }

    // Step 3: Replace return statement content
    const returnMatch = updated.indexOf('return [');
    if (returnMatch === -1) {
      console.warn('[replaceRenderMethod] return [ not found');
      return updated;
    }

    const returnEnd = updated.indexOf('];', returnMatch);
    if (returnEnd === -1) {
      console.warn('[replaceRenderMethod] ]; not found');
      return updated;
    }

    console.log('[replaceRenderMethod] Found return [ at', returnMatch);

    // Replace content between "return [" and "];"
    const before = updated.substring(0, returnMatch + 8); // "return ["
    const after = updated.substring(returnEnd); // "];"

    // returnArrayBody is already properly indented, just trim and use it
    const newReturn = '\n' + returnArrayBody.trim() + '\n    ';

    updated = before + newReturn + after;

    console.log('[replaceRenderMethod] Transformation complete, new length:', updated.length);
    return updated;
  }

  private extractTagName(ast: ts.SourceFile): string | null {
    let tagName: string | null = null;

    const visit = (node: ts.Node): void => {
      // Look for: ComponentName.define('tag-name')
      if (ts.isCallExpression(node)) {
        const expr = node.expression;
        if (
          ts.isPropertyAccessExpression(expr) &&
          expr.name.text === 'define' &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            tagName = arg.text;
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(ast);
    return tagName;
  }

  /**
   * Find render() method in html-props component
   */
  private findRenderMethod(
    sourceFile: ts.SourceFile,
  ): ts.MethodDeclaration | null {
    const htmlPropsClass = this.findHtmlPropsClass(sourceFile);
    if (!htmlPropsClass) {
      return null;
    }

    let renderMethod: ts.MethodDeclaration | null = null;

    const visit = (node: ts.Node): void => {
      if (ts.isMethodDeclaration(node) && node.name.getText() === 'render') {
        renderMethod = node;
        return;
      }
      ts.forEachChild(node, visit);
    };

    visit(htmlPropsClass);
    return renderMethod;
  }

  private findHtmlPropsClass(
    sourceFile: ts.SourceFile,
  ): ts.ClassDeclaration | null {
    let htmlPropsClass: ts.ClassDeclaration | null = null;

    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node) && node.heritageClauses) {
        for (const heritage of node.heritageClauses) {
          if (heritage.token === ts.SyntaxKind.ExtendsKeyword) {
            for (const type of heritage.types) {
              const typeName = type.expression.getText(sourceFile);
              if (typeName.startsWith('HTMLProps')) {
                htmlPropsClass = node;
                return;
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return htmlPropsClass;
  }

  /**
   * Get custom bundle path from workspace settings
   * Returns the path configured in webBuilder.bundlePath
   * Resolves it relative to the workspace folder containing the file
   */
  private getBundlePath(): string | null {
    const config = vscode.workspace.getConfiguration('webBuilder');
    const bundlePathSetting = config.get<string>('bundlePath');

    if (!bundlePathSetting || !bundlePathSetting.trim()) {
      return null;
    }

    // Normalize the path
    let normalizedPath = bundlePathSetting;
    // Remove leading ./
    if (normalizedPath.startsWith('./')) {
      normalizedPath = normalizedPath.slice(2);
    }
    // Remove leading /
    while (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.slice(1);
    }

    // If we have a workspace folder, resolve relative to it
    if (this.currentWorkspaceFolder) {
      const absolutePath = vscode.Uri.joinPath(this.currentWorkspaceFolder.uri, normalizedPath)
        .fsPath;
      return absolutePath;
    }

    // If no workspace folder but we have currentFilePath, resolve relative to its directory
    if (this.currentFilePath) {
      const fileDir = path.dirname(this.currentFilePath);
      const absolutePath = path.join(fileDir, normalizedPath);
      return absolutePath;
    }

    // Last resort: return the path as-is (will likely fail, but better than nothing)
    return normalizedPath;
  }
}
