import * as vscode from 'vscode';
import * as path from 'path';
import { AdapterManager } from '../adapters/AdapterManager';
import { HtmlPropsAdapter } from '../adapters/HtmlPropsAdapter';
import { CustomElementScanner } from '../services/CustomElementScanner';
import { AttributeRegistry } from '../services/AttributeRegistry';

/**
 * Property definition for component
 */
interface ComponentProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'function' | 'object' | 'array';
  defaultValue?: string;
}

/**
 * Resource wizard result
 */
interface ResourceWizardResult {
  resourceType: 'component' | 'html';
  // Component specific fields
  tagName?: string;
  className?: string;
  componentType?: 'html-props' | 'vanilla';
  baseElement?: string;
  baseTag?: string;
  properties?: ComponentProperty[];
  // Common fields
  filePath: string;
}

/**
 * Create Resource Command
 *
 * Wizard for creating new resources (components or HTML pages).
 * Guides user through creation with multi-step QuickPick UI.
 */
export class CreateResourceCommand {
  constructor(
    private scanner?: CustomElementScanner,
  ) {}

  /**
   * Execute create resource wizard
   * @param defaultDirectory Optional directory path to use as default location.
   *                         If undefined, user selects a directory via file explorer
   *                         and it's added to resourceDirectories in settings
   */
  async execute(defaultDirectory?: string): Promise<void> {
    try {
      // If no default directory provided, open file explorer to select/create one
      if (!defaultDirectory) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error('No workspace folder open');
        }

        const selectedUri = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          title: 'Select or create a resource directory',
          openLabel: 'Use as Resource Directory',
          defaultUri: workspaceFolder.uri,
        });

        if (!selectedUri || selectedUri.length === 0) {
          // User cancelled
          return;
        }

        // Add selected directory to resourceDirectories in settings
        const selectedPath = selectedUri[0].fsPath;
        await this.addResourceDirectory(selectedPath);

        vscode.window.showInformationMessage(
          'Resource directory added to settings. You can now create resources here.',
        );
        return;
      }

      // If defaultDirectory is provided, run the full resource creation wizard
      const result = await this.runWizard(defaultDirectory);

      if (!result) {
        // User cancelled
        return;
      }

      // Generate code
      const code = await this.generateCode(result);

      // Create file
      const fileUri = await this.createFile(result.filePath, code);

      // Open in visual editor
      await this.openInVisualEditor(fileUri);

      // Show success message
      const name = result.resourceType === 'component' ? result.className : path.basename(result.filePath);
      vscode.window.showInformationMessage(
        `${result.resourceType === 'component' ? 'Component' : 'Page'} created: ${name}`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create resource: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Add resource directory to resourceDirectories in settings.json
   */
  private async addResourceDirectory(directoryPath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }

    // Get the relative path from workspace root
    let relativePath = path.relative(workspaceFolder.uri.fsPath, directoryPath);
    // Normalize to forward slashes and ensure it starts with ./
    relativePath = './' + relativePath.replace(/\\/g, '/');

    // Get current configuration
    const config = vscode.workspace.getConfiguration('webBuilder');
    const resourceDirectories = config.get<
      Array<{ name: string; path: string }>
    >('resourceDirectories', []);

    // Check if already exists
    if (resourceDirectories.find((d) => d.path === relativePath)) {
      vscode.window.showWarningMessage(
        'This directory is already in resourceDirectories',
      );
      return;
    }

    // Extract directory name for display
    const dirName = path.basename(directoryPath);

    // Add to configuration
    resourceDirectories.push({
      name: dirName,
      path: relativePath,
    });

    await config.update(
      'resourceDirectories',
      resourceDirectories,
      vscode.ConfigurationTarget.Workspace,
    );

    // Reinitialize scanner with updated directories to show new elements immediately
    if (this.scanner) {
      await this.scanner.initialize(resourceDirectories);

      // Register all custom elements with AttributeRegistry
      const allCustomElements: any[] = [];
      for (const dirName of this.scanner.getDirectoryNames()) {
        const elements = this.scanner.getElements(dirName);
        allCustomElements.push(...elements);
      }

      AttributeRegistry.registerCustomElements(allCustomElements);
    }
  }

  /**
   * Run wizard steps
   * @param defaultDirectory Optional directory path to use as default location
   */
  private async runWizard(
    defaultDirectory?: string,
  ): Promise<ResourceWizardResult | undefined> {
    // Step 1: Resource Type
    const resourceType = await this.promptResourceType();
    if (!resourceType) {
      return undefined;
    }

    if (resourceType === 'html') {
      return this.runHtmlWizard(defaultDirectory);
    } else {
      return this.runComponentWizard(defaultDirectory);
    }
  }

  /**
   * Run HTML page wizard
   */
  private async runHtmlWizard(
    defaultDirectory?: string,
  ): Promise<ResourceWizardResult | undefined> {
    const fileName = await vscode.window.showInputBox({
      prompt: 'Enter HTML file name',
      placeHolder: 'index.html',
      validateInput: (value) => {
        if (!value) {
          return 'File name is required';
        }
        if (!value.endsWith('.html')) {
          return 'File must have .html extension';
        }
        return undefined;
      },
    });

    if (!fileName) {
      return undefined;
    }

    const filePath = defaultDirectory ? `${defaultDirectory}/${fileName}` : `./${fileName}`;

    return {
      resourceType: 'html',
      filePath,
    };
  }

  /**
   * Run Component wizard
   */
  private async runComponentWizard(
    defaultDirectory?: string,
  ): Promise<ResourceWizardResult | undefined> {
    // Step 1: Tag name
    const tagName = await this.promptTagName();
    if (!tagName) {
      return undefined;
    }

    // Step 2: Class name (auto-suggest from tag name)
    const suggestedClassName = this.toPascalCase(tagName);
    const className = await this.promptClassName(suggestedClassName);
    if (!className) {
      return undefined;
    }

    // Step 3: Component type
    const componentType = await this.promptComponentType();
    if (!componentType) {
      return undefined;
    }

    // Step 3.5: Base element
    const baseElement = await this.promptBaseElement();
    if (!baseElement) {
      return undefined;
    }

    // Parse base element
    let baseClass = 'HTMLElement';
    let baseTag: string | undefined;

    if (baseElement !== 'HTMLElement') {
      const parts = baseElement.split(':');
      baseClass = parts[0];
      baseTag = parts[1];
    }

    // Step 4: Properties
    const properties = await this.promptProperties();
    if (properties === undefined) {
      return undefined;
    }

    // Step 5: File location
    const suggestedPath = defaultDirectory ? `${defaultDirectory}/${tagName}.ts` : `./components/${tagName}.ts`;
    const filePath = await this.promptFilePath(suggestedPath);
    if (!filePath) {
      return undefined;
    }

    return {
      resourceType: 'component',
      tagName,
      className,
      componentType,
      baseElement: baseClass,
      baseTag,
      properties,
      filePath,
    };
  }

  /**
   * Prompt for resource type
   */
  private async promptResourceType(): Promise<'component' | 'html' | undefined> {
    const selection = await vscode.window.showQuickPick([
      {
        label: '$(symbol-class) Web Component',
        description: 'Create a reusable custom element',
        detail: 'TypeScript component with props and signals',
        value: 'component' as const,
      },
      {
        label: '$(file-code) HTML Page',
        description: 'Create a new HTML file',
        detail: 'Standard HTML5 document',
        value: 'html' as const,
      },
    ], {
      placeHolder: 'Select resource type',
      title: 'Create Resource',
    });

    return selection?.value;
  }

  /**
   * Prompt for tag name
   */
  private async promptTagName(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter web component tag name (must contain hyphen)',
      placeHolder: 'my-component',
      validateInput: (value) => {
        if (!value) {
          return 'Tag name is required';
        }
        if (!value.includes('-')) {
          return 'Tag name must contain a hyphen (e.g., my-component)';
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Tag name must start with a letter and contain only lowercase letters, numbers, and hyphens';
        }
        return undefined;
      },
    });
  }

  /**
   * Prompt for class name
   */
  private async promptClassName(
    suggestion: string,
  ): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Enter TypeScript class name',
      placeHolder: 'MyComponent',
      value: suggestion,
      validateInput: (value) => {
        if (!value) {
          return 'Class name is required';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Class name must start with uppercase letter and contain only letters and numbers';
        }
        return undefined;
      },
    });
  }

  /**
   * Prompt for component type
   */
  private async promptComponentType(): Promise<
    'html-props' | 'vanilla' | undefined
  > {
    const selection = await vscode.window.showQuickPick([
      {
        label: '$(sparkle) html-props Component',
        description: 'Recommended - TypeScript, signals, constructor props',
        detail: 'Modern component with type-safe props, signals, and MyElement.define()',
        value: 'html-props' as const,
      },
      {
        label: '$(code) Vanilla Web Component',
        description: 'Standard HTML Custom Element',
        detail: 'Traditional web component with attribute-based API',
        value: 'vanilla' as const,
      },
    ], {
      placeHolder: 'Select component type',
      title: 'Component Type',
    });

    return selection?.value;
  }

  /**
   * Prompt for base element
   */
  private async promptBaseElement(): Promise<string | undefined> {
    const selection = await vscode.window.showQuickPick([
      {
        label: 'HTMLElement',
        description: 'Generic element (default)',
        detail: 'Autonomous custom element',
        value: 'HTMLElement',
      },
      {
        label: 'HTMLButtonElement',
        description: 'Extends <button>',
        detail: 'Customized built-in button element',
        value: 'HTMLButtonElement:button',
      },
      {
        label: 'HTMLInputElement',
        description: 'Extends <input>',
        detail: 'Customized built-in input element',
        value: 'HTMLInputElement:input',
      },
      {
        label: 'HTMLDivElement',
        description: 'Extends <div>',
        detail: 'Customized built-in div element',
        value: 'HTMLDivElement:div',
      },
      {
        label: 'HTMLAnchorElement',
        description: 'Extends <a>',
        detail: 'Customized built-in anchor element',
        value: 'HTMLAnchorElement:a',
      },
    ], {
      placeHolder: 'Select base HTML element',
      title: 'Base Element',
    });

    return selection?.value;
  }

  /**
   * Prompt for properties
   */
  private async promptProperties(): Promise<ComponentProperty[] | undefined> {
    const properties: ComponentProperty[] = [];

    while (true) {
      const action = await vscode.window.showQuickPick([
        {
          label: '$(add) Add Property',
          value: 'add',
        },
        {
          label: '$(check) Finish',
          description: `${properties.length} properties defined`,
          value: 'finish',
        },
      ], {
        placeHolder: 'Component properties',
        title: `Properties (${properties.length})`,
      });

      if (!action || action.value === 'finish') {
        return properties;
      }

      // Add property
      const property = await this.promptProperty();
      if (property) {
        properties.push(property);
      }
    }
  }

  /**
   * Prompt for single property
   */
  private async promptProperty(): Promise<ComponentProperty | undefined> {
    const name = await vscode.window.showInputBox({
      prompt: 'Property name (camelCase)',
      placeHolder: 'myProperty',
      validateInput: (value) => {
        if (!value) {
          return 'Property name is required';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Property name must start with lowercase letter and be camelCase';
        }
        return undefined;
      },
    });

    if (!name) {
      return undefined;
    }

    const typeSelection = await vscode.window.showQuickPick([
      { label: 'string', value: 'string' as const },
      { label: 'number', value: 'number' as const },
      { label: 'boolean', value: 'boolean' as const },
      { label: 'function', value: 'function' as const },
      { label: 'object', value: 'object' as const },
      { label: 'array', value: 'array' as const },
    ], {
      placeHolder: 'Select property type',
    });

    if (!typeSelection) {
      return undefined;
    }

    return {
      name,
      type: typeSelection.value,
      defaultValue: this.getDefaultValueForType(typeSelection.value),
    };
  }

  /**
   * Prompt for file path
   */
  private async promptFilePath(
    suggestion: string,
  ): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: 'Component file path (relative to workspace)',
      placeHolder: './components/my-component.ts',
      value: suggestion,
      validateInput: (value) => {
        if (!value) {
          return 'File path is required';
        }
        if (!value.endsWith('.ts')) {
          return 'File must have .ts extension';
        }
        return undefined;
      },
    });
  }

  /**
   * Generate code
   */
  private async generateCode(
    result: ResourceWizardResult,
  ): Promise<string> {
    if (result.resourceType === 'html') {
      return this.generateHtmlCode();
    } else {
      return this.generateComponentCode(result);
    }
  }

  /**
   * Generate HTML code
   */
  private generateHtmlCode(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Page</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <h1>New Page</h1>
  <p>Start building your page here.</p>
</body>
</html>`;
  }

  /**
   * Generate component code
   */
  private async generateComponentCode(
    result: ResourceWizardResult,
  ): Promise<string> {
    if (result.componentType === 'html-props') {
      const adapter = new HtmlPropsAdapter();
      return adapter.generateNewComponentCode(
        result.className!,
        result.tagName!,
        result.baseElement!,
        result.baseTag,
        result.properties || [],
      );
    } else {
      return this.generateVanillaCode(result);
    }
  }

  /**
   * Generate vanilla component code
   */
  private generateVanillaCode(result: ResourceWizardResult): string {
    const { className, tagName, properties } = result;

    const observedAttrs = (properties || [])
      .filter((p) => p.type !== 'function')
      .map((p) => `'${this.toKebabCase(p.name)}'`)
      .join(', ');

    return `/**
 * ${className} component
 * Generated by HTML Props Builder
 */
class ${className} extends HTMLElement {
  static get observedAttributes() {
    return [${observedAttrs}];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.render();
  }

  render() {
    // Build your component structure using HTML Props Builder
    this.innerHTML = \`
      <div>Component content</div>
    \`;
  }
}

customElements.define('${tagName}', ${className});

export default ${className};
`;
  }

  /**
   * Create file
   */
  private async createFile(
    filePath: string,
    code: string,
  ): Promise<vscode.Uri> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }

    // Resolve absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(workspaceFolder.uri.fsPath, filePath);

    const fileUri = vscode.Uri.file(absolutePath);

    // Create directory if needed
    const dirPath = path.dirname(absolutePath);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));

    // Write file
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(fileUri, encoder.encode(code));

    return fileUri;
  }

  /**
   * Open file in visual editor
   */
  private async openInVisualEditor(fileUri: vscode.Uri): Promise<void> {
    await vscode.commands.executeCommand(
      'vscode.openWith',
      fileUri,
      'webBuilder.visualHtmlEditor',
    );
  }

  /**
   * Get default value for type
   */
  private getDefaultValueForType(type: string): string {
    switch (type) {
      case 'string':
        return "''";
      case 'number':
        return '0';
      case 'boolean':
        return 'false';
      case 'object':
        return '{}';
      case 'array':
        return '[]';
      case 'function':
        return 'null';
      default:
        return "''";
    }
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}
