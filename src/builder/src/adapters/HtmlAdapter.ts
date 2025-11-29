import * as path from "path";
import * as vscode from "vscode";
import {
  HTMLElement as ParsedHTMLElement,
  NodeType,
  parse,
} from "node-html-parser";
import {
  ElementDefinition,
  ElementMetadata,
  ICodeStyleAdapter,
  ValidationResult,
} from "./ICodeStyleAdapter";
import { GLOBAL_ATTRIBUTES, HTML_ATTRIBUTES } from "../schemas/htmlAttributes";
import { CustomElementScanner } from "../services/CustomElementScanner";

/**
 * HTML Adapter
 *
 * Code style adapter for standard HTML files.
 * Uses node-html-parser for DOM manipulation.
 *
 * Main method: applyHTMLDiff() - receives HTML diff from backend,
 * determines what changed, and applies to source code AST.
 */
export class HtmlAdapter implements ICodeStyleAdapter {
  readonly id = "html";
  readonly displayName = "HTML";
  readonly fileExtensions = [".html", ".htm"];
  readonly priority = 0;

  private devServer?: any; // DevServer instance for custom elements
  private customElementScanner?: CustomElementScanner; // Scanner for custom elements
  private currentFilePath?: string; // Current file being edited
  private currentWorkspaceFolder?: vscode.WorkspaceFolder; // Workspace folder for relative path resolution

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
      console.error("[HtmlAdapter.parse]", error);
      throw error;
    }
  }
  
  async parse(code: string): Promise<ParsedHTMLElement> {
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
      console.error("[HtmlAdapter.parse]", error);
      throw error;
    }
  }


  async serialize(ast: ParsedHTMLElement): Promise<string> {
    return ast.toString();
  }

  async validate(code: string): Promise<ValidationResult> {
    try {
      parse(code);
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
   * This is the MAIN method called by backend.
   *
   * Algorithm:
   * 1. Parse oldHTML and newHTML to get DOMs
   * 2. Compare DOMs to determine what changed
   * 3. Parse source code to AST
   * 4. Apply same change to AST
   * 5. Serialize and return
   *
   * For HTML files, this is straightforward - we can just replace
   * the body content directly since Preview DOM = source code structure.
   */
  async applyHTMLDiff(
    oldHTML: string,
    newHTML: string,
    sourceCode: string,
    domJson?: any,
  ): Promise<string> {

    // For HTML files, we can use a simple approach:
    // Replace the body content in source code with new HTML

    // Parse source code
    const sourceAst = await this.parse(sourceCode);

    // Find body element in source
    const bodyElement = this.findBodyElement(sourceAst);
    if (!bodyElement) {
      throw new Error("No <body> element found in source HTML");
    }

    // Parse new HTML to get new body content
    const newHtmlAst = await this.parse(`<body>${newHTML}</body>`);
    const newBodyElement = this.findBodyElement(newHtmlAst);
    if (!newBodyElement) {
      throw new Error("Failed to parse new HTML");
    }

    // Replace body's children with new children
    bodyElement.childNodes = newBodyElement.childNodes;
    for (const child of bodyElement.childNodes) {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        (child as ParsedHTMLElement).parentNode = bodyElement;
      }
    }

    // Serialize back to source code
    const newSourceCode = await this.serialize(sourceAst);

    return newSourceCode;
  }

  async generateSnippet(
    elementType: string,
    attributes?: Record<string, string>,
    textContent?: string,
  ): Promise<string> {
    let html = `<${elementType}`;

    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        html += ` ${key}="${value}"`;
      }
    }

    html += ">";

    if (textContent) {
      html += textContent;
    }

    html += `</${elementType}>`;

    return html;
  }

  // === Services ===

  setDevServer(devServer: any): void {
    this.devServer = devServer;
  }

  setCustomElementScanner(scanner: CustomElementScanner): void {
    this.customElementScanner = scanner;
  }

  /**
   * Get DevServer URL for this HTML file
   * Returns the file path relative to workspace for DevServer to serve
   */
  getDevServerUrl(): string | null {
    if (!this.devServer || !this.currentFilePath) {
      return null;
    }

    const devServerUrl = this.devServer.getUrl?.();
    if (!devServerUrl) {
      return null;
    }

    const workspaceRoot = (this.devServer as any).workspaceRoot || "";
    if (!workspaceRoot) {
      return null;
    }

    const relativePath = this.currentFilePath
      .replace(workspaceRoot, "")
      .replace(/\\/g, "/");

    const finalUrl = `${devServerUrl}${relativePath}`;
    return finalUrl;
  }
  
  // === Rendering ===

  /**
   * Render AST to HTML for Preview DOM
   *
   * For HTML files, returns the HTML with injected <base> tag
   * to resolve relative URLs from DevServer
   */
  async renderPreview(ast: ParsedHTMLElement): Promise<string> {
    if (!this.currentFilePath) {
      return this.generateErrorHtml("File path not available");
    }

    try {
      const devServerUrl = this.getDevServerUrl();
      if (!devServerUrl) {
        return this.generateErrorHtml(
          `Could not get DevServer URL for file: ${this.currentFilePath}`,
        );
      }

      const response = await fetch(devServerUrl);
      if (!response.ok) {
        return this.generateErrorHtml(
          `Failed to fetch from DevServer: ${response.status} ${response.statusText}`,
        );
      }

      let previewHtml = ast.toString();

      // Inject <base> tag to resolve relative URLs from DevServer
      const baseUrl = devServerUrl.substring(
        0,
        devServerUrl.lastIndexOf("/") + 1,
      );

      // Insert <base> tag after <head> opening tag
      previewHtml = previewHtml.replace(
        /<head[^>]*>/i,
        (match) => `${match}\n    <base href="${baseUrl}">`,
      );

      return previewHtml;
    } catch (error) {
      console.error("[HtmlAdapter.renderPreview] Error:", error);
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
      const attrMatches = element.rawAttrs.matchAll(/([\w-]+)="([^"]*)"/g);
      for (const match of attrMatches) {
        attributes[match[1]] = match[2];
      }
    }

    return {
      tag: element.tagName?.toLowerCase() || "",
      id: element.getAttribute("id"),
      className: element.getAttribute("class"),
      attributes,
      textContent: element.textContent,
      selector,
      selectorFormat: "css",
    };
  }

  async getAllElements(ast: ParsedHTMLElement): Promise<ElementMetadata[]> {
    const elements: ElementMetadata[] = [];

    const traverse = (node: ParsedHTMLElement, path: string[] = []) => {
      if (node.nodeType === NodeType.ELEMENT_NODE && node.tagName) {
        const tag = node.tagName.toLowerCase();
        const newPath = [...path, tag];
        const selector = newPath.join(" > ");

        const attributes: Record<string, string> = {};
        if (node.rawAttrs) {
          const attrMatches = node.rawAttrs.matchAll(/([\w-]+)="([^"]*)"/g);
          for (const match of attrMatches) {
            attributes[match[1]] = match[2];
          }
        }

        elements.push({
          tag,
          id: node.getAttribute("id"),
          className: node.getAttribute("class"),
          attributes,
          textContent: node.textContent,
          selector,
          selectorFormat: "css",
        });

        if (node.childNodes) {
          for (const child of node.childNodes) {
            if (child.nodeType === NodeType.ELEMENT_NODE) {
              traverse(child as ParsedHTMLElement, newPath);
            }
          }
        }
      }
    };

    traverse(ast);
    return elements;
  }

  /**
   * Build property categories for the Properties Panel
   * HTML adapter shows HTML attributes and properties
   */
  async buildPropertyCategories(
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
      enumValues?: string[];
    }>;
  }>> {
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

    // Category 1: Basic attributes
    categories.push({
      id: 'basic',
      label: 'Basic',
      properties: [
        {
          name: 'tag',
          value: tag,
          type: 'tag',
          editable: false
        },
        {
          name: 'id',
          value: attributes['id'] || '',
          type: 'id',
          editable: true,
          attrType: 'string',
          isSet: 'id' in attributes
        },
        {
          name: 'class',
          value: attributes['class'] || '',
          type: 'class',
          editable: true,
          attrType: 'string',
          isSet: 'class' in attributes
        },
        {
          name: 'text',
          value: textContent || '',
          type: 'text',
          editable: true,
          attrType: 'string',
          isSet: !!textContent
        }
      ]
    });

    // Category 2: Element-Specific attributes
    const elementAttrs = HTML_ATTRIBUTES[tag.toLowerCase()] || [];
    if (elementAttrs.length > 0) {
      categories.push({
        id: 'element-specific',
        label: `${tag} Attributes`,
        properties: elementAttrs.map((attr: any) => ({
          name: attr.name,
          value: attributes[attr.name] || '',
          type: 'attribute',
          editable: true,
          attrType: attr.type,
          isSet: attr.name in attributes,
          source: 'attribute',
          description: attr.description
        }))
      });
    }

    // Category 2.5: Custom element attributes (if tag includes dash and has custom element definitions)
    if (tag.includes('-') && this.customElementScanner) {
      const customElementDef = this.customElementScanner.getCustomElement(tag);
      if (customElementDef && customElementDef.attributes && customElementDef.attributes.length > 0) {
        categories.push({
          id: 'custom',
          label: 'Custom Attributes',
          properties: customElementDef.attributes.map((attr: any) => ({
            name: attr.name,
            value: attributes[attr.name] || '',
            type: 'attribute',
            editable: true,
            attrType: attr.type,
            isSet: attr.name in attributes,
            source: 'attribute',
            description: attr.description,
            enumValues: attr.enumValues
          }))
        });
      }
    }

    // Category 3: Common Global Attributes
    const commonGlobalNames = ['title', 'role', 'aria-label', 'aria-describedby'];
    const globalAttrs = GLOBAL_ATTRIBUTES;
    const commonAttrs = globalAttrs.filter((attr: any) => commonGlobalNames.includes(attr.name));
    if (commonAttrs.length > 0) {
      categories.push({
        id: 'common',
        label: 'Common',
        properties: commonAttrs.map((attr: any) => ({
          name: attr.name,
          value: attributes[attr.name] || '',
          type: 'attribute',
          editable: true,
          attrType: attr.type,
          isSet: attr.name in attributes,
          source: 'attribute',
          description: attr.description
        }))
      });
    }

    return categories;
  }

  // === Element Discovery  ===

  async getBuiltinElements(): Promise<ElementDefinition[]> {
    return [
      {
        tag: "div",
        displayName: "Div",
        description: "Generic container",
        category: "Layout",
      },
      {
        tag: "span",
        displayName: "Span",
        description: "Inline container",
        category: "Layout",
      },
      {
        tag: "p",
        displayName: "Paragraph",
        description: "Paragraph text",
        category: "Text",
      },
      {
        tag: "h1",
        displayName: "Heading 1",
        description: "Main heading",
        category: "Text",
      },
      {
        tag: "h2",
        displayName: "Heading 2",
        description: "Subheading",
        category: "Text",
      },
      {
        tag: "button",
        displayName: "Button",
        description: "Click button",
        category: "Interactive",
      },
      {
        tag: "input",
        displayName: "Input",
        description: "Text input",
        category: "Interactive",
      },
      {
        tag: "a",
        displayName: "Link",
        description: "Hyperlink",
        category: "Interactive",
      },
    ];
  }

  // === Adapter-Specific Methods ===

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

  private findBodyElement(ast: ParsedHTMLElement): ParsedHTMLElement | null {
    // Try direct querySelector first
    const body = ast.querySelector("body");
    if (body) {
      return body as ParsedHTMLElement;
    }

    // Fallback: recursive search
    const find = (node: ParsedHTMLElement): ParsedHTMLElement | null => {
      if (node.tagName?.toLowerCase() === "body") {
        return node;
      }

      if (node.childNodes) {
        for (const child of node.childNodes) {
          if (child.nodeType === NodeType.ELEMENT_NODE) {
            const found = find(child as ParsedHTMLElement);
            if (found) return found;
          }
        }
      }

      return null;
    };

    return find(ast);
  }
}
