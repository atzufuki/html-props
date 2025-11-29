import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AttributeDefinition } from '../schemas/htmlAttributes';
import { ICodeStyleAdapter } from '../adapters/ICodeStyleAdapter';

/**
 * Custom element definition found in a file
 */
export interface CustomElement {
  name: string;
  tag: string;
  filePath: string;
  className?: string;
  attributes?: AttributeDefinition[];
}

/**
 * Configuration for a custom element directory
 */
export interface CustomElementDirectory {
  name: string;
  path: string;
}

/**
 * Scans directories for custom web component definitions
 */
export class CustomElementScanner {
  private watchers: vscode.FileSystemWatcher[] = [];
  private elements: Map<string, CustomElement[]> = new Map();
  private directories: Map<string, string> = new Map(); // name -> path
  private adapter?: ICodeStyleAdapter;
  
  private _onDidChangeElements = new vscode.EventEmitter<void>();
  readonly onDidChangeElements = this._onDidChangeElements.event;

  /**
   * Set the code style adapter to use for pattern matching
   */
  setAdapter(adapter: ICodeStyleAdapter | undefined) {
    this.adapter = adapter;
  }

  /**
   * Initialize scanner with configured directories
   */
  async initialize(directories: CustomElementDirectory[]): Promise<void> {
    // Clear existing watchers
    this.dispose();
    this.elements.clear();
    this.directories.clear();

    for (const dir of directories) {
      this.directories.set(dir.name, dir.path);
      await this.scanDirectory(dir);
      this.watchDirectory(dir);
    }

    this._onDidChangeElements.fire();
  }

  /**
   * Get all custom elements for a specific directory
   */
  getElements(directoryName: string): CustomElement[] {
    return this.elements.get(directoryName) || [];
  }

  /**
   * Get all directory names that have elements
   */
  getDirectoryNames(): string[] {
    return Array.from(this.directories.keys());
  }

  /**
   * Get directory path by name
   */
  getDirectoryPath(directoryName: string): string | null {
    return this.directories.get(directoryName) || null;
  }

  /**
   * Get file path for a custom element by tag name
   * @param tagName - Custom element tag name (e.g., 'fluent-primary-button')
   * @returns File path or null if not found
   */
  getCustomElementFilePath(tagName: string): string | null {
    for (const elements of this.elements.values()) {
      const element = elements.find(el => el.tag === tagName);
      if (element) {
        return element.filePath;
      }
    }
    return null;
  }

  /**
   * Get custom element definition by tag name
   * @param tagName - Custom element tag name (e.g., 'fluent-primary-button')
   * @returns CustomElement or null if not found
   */
  getCustomElement(tagName: string): CustomElement | null {
    for (const elements of this.elements.values()) {
      const element = elements.find(el => el.tag === tagName);
      if (element) {
        return element;
      }
    }
    return null;
  }

  /**
   * Get all custom elements
   */
  getAllCustomElements(): CustomElement[] {
    const allElements: CustomElement[] = [];
    for (const elements of this.elements.values()) {
      allElements.push(...elements);
    }
    return allElements;
  }

  /**
   * Scan a directory for custom element definitions
   */
  private async scanDirectory(dir: CustomElementDirectory): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      console.error('[CustomElementScanner] No workspace folder found');
      return;
    }

    const absolutePath = path.isAbsolute(dir.path) 
      ? dir.path 
      : path.join(workspaceFolder.uri.fsPath, dir.path);

    console.log(`[CustomElementScanner] Scanning ${dir.name} at ${absolutePath}`);

    try {
      const files = await this.findJavaScriptFiles(absolutePath);
      console.log(`[CustomElementScanner] Found ${files.length} files in ${dir.name}`);
      
      const elements: CustomElement[] = [];

      for (const file of files) {
        const fileElements = await this.parseFile(file);
        console.log(`[CustomElementScanner] Found ${fileElements.length} elements in ${file}`);
        elements.push(...fileElements);
      }

      console.log(`[CustomElementScanner] Total ${elements.length} elements in ${dir.name}`);
      this.elements.set(dir.name, elements);
    } catch (error) {
      console.error(`[CustomElementScanner] Failed to scan directory ${dir.path}:`, error);
    }
  }

  /**
   * Find all JavaScript/TypeScript/HTML files in a directory
   */
  private async findJavaScriptFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.findJavaScriptFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && /\.(js|ts|jsx|tsx|html)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  /**
   * Parse a file for custom element definitions
   */
  private async parseFile(filePath: string): Promise<CustomElement[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // For HTML files, treat them as static resources that can be inserted
      if (filePath.endsWith('.html')) {
        return this.extractHtmlAsElement(content, filePath);
      }
      
      return this.extractCustomElements(content, filePath);
    } catch (error) {
      return [];
    }
  }

  /**
   * Treat HTML file as an insertable element
   */
  private extractHtmlAsElement(content: string, filePath: string): CustomElement[] {
    // Get file name without extension as tag name
    const fileName = path.parse(filePath).name;
    
    // Convert file name to tag format (kebab-case)
    const tag = fileName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    
    return [{
      name: fileName,
      tag,
      filePath,
      className: undefined,
      attributes: []
    }];
  }

  /**
   * Extract custom element definitions from file content
   * Uses adapter-specific patterns if available, otherwise falls back to standard patterns
   */
  private extractCustomElements(content: string, filePath: string): CustomElement[] {
    const elements: CustomElement[] = [];
    
    // Get patterns from adapter (if available)
    let patterns = this.adapter?.getCustomElementPatterns?.();
    
    // If no adapter patterns, use default patterns for both standard and html-props
    if (!patterns || patterns.length === 0) {
      patterns = [
        {
          // Standard: customElements.define('element-name', ClassName)
          pattern: /customElements\.define\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\w+)/g,
          tagIndex: 1,
          classIndex: 2
        },
        {
          // html-props: ClassName.define('element-name')
          pattern: /(\w+)\.define\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
          tagIndex: 2,
          classIndex: 1
        }
      ];
    }
    
    // Try each pattern
    for (const { pattern, tagIndex, classIndex } of patterns) {
      // Reset regex lastIndex for each file
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const tag = match[tagIndex];
        const className = match[classIndex];
        
        // Skip if already found (from another pattern)
        if (elements.find(e => e.tag === tag)) {
          continue;
        }
        
        // Parse attributes from observedAttributes
        const attributes = this.parseObservedAttributes(content, className);
        
        elements.push({
          name: this.tagToName(tag),
          tag,
          filePath,
          className,
          attributes
        });
      }
    }
    
    return elements;
  }

  /**
   * Parse observedAttributes from a custom element class
   * Extracts attribute names and infers types from JSDoc and TypeScript
   */
  private parseObservedAttributes(content: string, className: string): AttributeDefinition[] {
    const attributes: AttributeDefinition[] = [];
    
    // Find observedAttributes getter with preceding JSDoc
    // Match pattern: /** ... */ static get observedAttributes() { return [...] }
    const fullRegex = new RegExp(
      `(/\\*\\*[^*]*(?:\\*(?!/))*?\\*/)?\\s*static\\s+(?:override\\s+)?get\\s+observedAttributes\\s*\\(\\)\\s*{\\s*return\\s*\\[([^\\]]+)\\]`,
      's'
    );
    
    const match = fullRegex.exec(content);
    if (!match) {
      return attributes;
    }
    
    const jsdocComment = match[1] || '';
    const attrsString = match[2];
    
    // Extract attribute names from the array
    const attrNames = attrsString
      .split(',')
      .map(s => s.trim().replace(/['"`]/g, ''))
      .filter(s => s.length > 0);
    
    // Parse @property annotations from JSDoc comment
    const propertyDefs = new Map<string, { type: string; description?: string }>();
    
    if (jsdocComment) {
      // Look for @property {type} name - description patterns
      const propertyRegex = /@property\s+{([^}]+)}\s+(\w+)\s*-?\s*([^\n]*)/g;
      let propMatch;
      while ((propMatch = propertyRegex.exec(jsdocComment)) !== null) {
        const type = propMatch[1].trim();
        const name = propMatch[2].trim();
        const description = propMatch[3].trim();
        propertyDefs.set(name, { type, description });
      }
    }
    
    // For each attribute, try to infer type from property definitions
    for (const attrName of attrNames) {
      const propDef = propertyDefs.get(attrName);
      let attrDef: AttributeDefinition;
      
      if (propDef) {
        // Use JSDoc @property type information
        attrDef = this.parseAttributeTypeFromJSDoc(attrName, propDef.type, propDef.description);
      } else {
        // Fall back to inferring from property definitions
        attrDef = this.inferAttributeType(content, attrName);
      }
      
      attributes.push(attrDef);
    }
    
    return attributes;
  }

  /**
   * Parse attribute type from JSDoc @property annotation
   */
  private parseAttributeTypeFromJSDoc(name: string, typeStr: string, description?: string): AttributeDefinition {
    const attrDef: AttributeDefinition = {
      name,
      type: 'string',
      description
    };
    
    // Handle union types for enums (e.g., "small"|"medium"|"large")
    if (typeStr.includes('|')) {
      const enumValues = typeStr
        .split('|')
        .map(v => v.trim().replace(/['"]/g, ''))
        .filter(v => v.length > 0 && v !== 'string' && v !== 'number' && v !== 'boolean');
      
      if (enumValues.length > 0) {
        attrDef.type = 'enum';
        attrDef.enumValues = enumValues;
        return attrDef;
      }
    }
    
    // Handle basic types
    const type = typeStr.trim().toLowerCase();
    if (type === 'boolean' || type === 'bool') {
      attrDef.type = 'boolean';
    } else if (type === 'number' || type === 'int' || type === 'float') {
      attrDef.type = 'number';
    } else if (type === 'color') {
      attrDef.type = 'color';
    } else if (type === 'url') {
      attrDef.type = 'url';
    }
    
    return attrDef;
  }

  /**
   * Infer attribute type from property getters/setters and JSDoc
   */
  private inferAttributeType(content: string, attrName: string): AttributeDefinition {
    // Default to string type
    const attrDef: AttributeDefinition = {
      name: attrName,
      type: 'string'
    };
    
    // Look for property getter with type annotation
    const getterRegex = new RegExp(
      `get\\s+${attrName}\\s*\\(\\)\\s*:\\s*([^{]+)\\s*{`,
      's'
    );
    
    const getterMatch = getterRegex.exec(content);
    if (getterMatch) {
      const typeAnnotation = getterMatch[1].trim();
      
      // Parse TypeScript union types for enums
      if (typeAnnotation.includes('|')) {
        const enumValues = typeAnnotation
          .split('|')
          .map(v => v.trim().replace(/['"]/g, ''))
          .filter(v => v.length > 0 && v !== 'string' && v !== 'number' && v !== 'boolean');
        
        if (enumValues.length > 0) {
          attrDef.type = 'enum';
          attrDef.enumValues = enumValues;
          return attrDef;
        }
      }
      
      // Detect boolean type
      if (typeAnnotation === 'boolean') {
        attrDef.type = 'boolean';
        return attrDef;
      }
      
      // Detect number type
      if (typeAnnotation === 'number') {
        attrDef.type = 'number';
        return attrDef;
      }
    }
    
    // Look for JSDoc @type annotation
    const jsdocRegex = new RegExp(
      `/\\*\\*[^*]*\\*\\s+@type\\s+{([^}]+)}[^*]*\\*/\\s*get\\s+${attrName}`,
      's'
    );
    
    const jsdocMatch = jsdocRegex.exec(content);
    if (jsdocMatch) {
      const jsdocType = jsdocMatch[1].trim();
      
      // Parse JSDoc union types
      if (jsdocType.includes('|')) {
        const enumValues = jsdocType
          .split('|')
          .map(v => v.trim().replace(/['"]/g, ''))
          .filter(v => v.length > 0 && v !== 'string' && v !== 'number' && v !== 'boolean');
        
        if (enumValues.length > 0) {
          attrDef.type = 'enum';
          attrDef.enumValues = enumValues;
          return attrDef;
        }
      }
      
      if (jsdocType === 'boolean') {
        attrDef.type = 'boolean';
      } else if (jsdocType === 'number') {
        attrDef.type = 'number';
      }
    }
    
    // Special handling for common boolean attributes
    if (attrName === 'disabled' || attrName === 'hidden' || attrName === 'readonly') {
      attrDef.type = 'boolean';
    }
    
    return attrDef;
  }

  /**
   * Convert tag name to display name
   * e.g., 'my-button' -> 'My Button'
   */
  private tagToName(tag: string): string {
    return tag
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Watch a directory for changes
   */
  private watchDirectory(dir: CustomElementDirectory): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const absolutePath = path.isAbsolute(dir.path) 
      ? dir.path 
      : path.join(workspaceFolder.uri.fsPath, dir.path);

    const pattern = new vscode.RelativePattern(absolutePath, '**/*.{js,ts,jsx,tsx}');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(() => this.rescanDirectory(dir));
    watcher.onDidChange(() => this.rescanDirectory(dir));
    watcher.onDidDelete(() => this.rescanDirectory(dir));

    this.watchers.push(watcher);
  }

  /**
   * Rescan a directory when files change
   */
  private async rescanDirectory(dir: CustomElementDirectory): Promise<void> {
    await this.scanDirectory(dir);
    this._onDidChangeElements.fire();
  }

  /**
   * Dispose all watchers
   */
  dispose(): void {
    this.watchers.forEach(w => w.dispose());
    this.watchers = [];
  }
}
