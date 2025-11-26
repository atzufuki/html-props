import * as vscode from "vscode";
import * as path from "path";
import { AdapterManager } from "../adapters/AdapterManager";
import { HtmlPropsAdapter } from "../adapters/HtmlPropsAdapter";
import { CustomElementScanner } from "../services/CustomElementScanner";
import { AttributeRegistry } from "../services/AttributeRegistry";

/**
 * Property definition for component
 */
interface ComponentProperty {
  name: string;
  type: "string" | "number" | "boolean" | "function" | "object" | "array";
  defaultValue?: string;
}

/**
 * Component wizard result
 */
interface ComponentWizardResult {
  tagName: string;
  className: string;
  componentType: "html-props" | "vanilla";
  baseElement: string;
  baseTag?: string;
  properties: ComponentProperty[];
  filePath: string;
}

/**
 * Create Component Command
 *
 * Wizard for creating custom web components (html-props or vanilla).
 * Guides user through component creation with multi-step QuickPick UI.
 */
export class CreateComponentCommand {
  constructor(
    private scanner?: CustomElementScanner,
  ) {}

  /**
   * Execute create component wizard
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
          throw new Error("No workspace folder open");
        }

        const selectedUri = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          title: "Select or create a resource directory",
          openLabel: "Use as Resource Directory",
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
          "Resource directory added to settings. You can now create components here.",
        );
        return;
      }

      // If defaultDirectory is provided, run the full component creation wizard
      const result = await this.runWizard(defaultDirectory);

      if (!result) {
        // User cancelled
        return;
      }

      // Generate component code
      const code = await this.generateComponentCode(result);

      // Create component file
      const fileUri = await this.createComponentFile(result.filePath, code);

      // Open in visual editor
      await this.openInVisualEditor(fileUri);

      // Show success message
      vscode.window.showInformationMessage(
        `Component created: ${result.className} (<${result.tagName}>)`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create component: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Add resource directory to resourceDirectories in settings.json
   */
  private async addResourceDirectory(directoryPath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error("No workspace folder open");
    }

    // Get the relative path from workspace root
    let relativePath = path.relative(workspaceFolder.uri.fsPath, directoryPath);
    // Normalize to forward slashes and ensure it starts with ./
    relativePath = "./" + relativePath.replace(/\\/g, "/");

    // Get current configuration
    const config = vscode.workspace.getConfiguration("webBuilder");
    const resourceDirectories = config.get<
      Array<{ name: string; path: string }>
    >("resourceDirectories", []);

    // Check if already exists
    if (resourceDirectories.find((d) => d.path === relativePath)) {
      vscode.window.showWarningMessage(
        "This directory is already in resourceDirectories",
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
      "resourceDirectories",
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
  ): Promise<ComponentWizardResult | undefined> {
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
    let baseClass = "HTMLElement";
    let baseTag: string | undefined;

    if (baseElement !== "HTMLElement") {
      const parts = baseElement.split(":");
      baseClass = parts[0];
      baseTag = parts[1];
    }

    // Step 4: Properties
    const properties = await this.promptProperties();
    if (properties === undefined) {
      return undefined;
    }

    // Step 5: File location
    const suggestedPath = defaultDirectory
      ? `${defaultDirectory}/${tagName}.ts`
      : `./components/${tagName}.ts`;
    const filePath = await this.promptFilePath(suggestedPath);
    if (!filePath) {
      return undefined;
    }

    return {
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
   * Prompt for tag name
   */
  private async promptTagName(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: "Enter web component tag name (must contain hyphen)",
      placeHolder: "my-component",
      validateInput: (value) => {
        if (!value) {
          return "Tag name is required";
        }
        if (!value.includes("-")) {
          return "Tag name must contain a hyphen (e.g., my-component)";
        }
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return "Tag name must start with a letter and contain only lowercase letters, numbers, and hyphens";
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
      prompt: "Enter TypeScript class name",
      placeHolder: "MyComponent",
      value: suggestion,
      validateInput: (value) => {
        if (!value) {
          return "Class name is required";
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return "Class name must start with uppercase letter and contain only letters and numbers";
        }
        return undefined;
      },
    });
  }

  /**
   * Prompt for component type
   */
  private async promptComponentType(): Promise<
    "html-props" | "vanilla" | undefined
  > {
    const selection = await vscode.window.showQuickPick([
      {
        label: "$(sparkle) html-props Component",
        description: "Recommended - TypeScript, signals, constructor props",
        detail:
          "Modern component with type-safe props, signals, and MyElement.define()",
        value: "html-props" as const,
      },
      {
        label: "$(code) Vanilla Web Component",
        description: "Standard HTML Custom Element",
        detail: "Traditional web component with attribute-based API",
        value: "vanilla" as const,
      },
    ], {
      placeHolder: "Select component type",
      title: "Component Type",
    });

    return selection?.value;
  }

  /**
   * Prompt for base element
   */
  private async promptBaseElement(): Promise<string | undefined> {
    const selection = await vscode.window.showQuickPick([
      {
        label: "HTMLElement",
        description: "Generic element (default)",
        detail: "Autonomous custom element",
        value: "HTMLElement",
      },
      {
        label: "HTMLButtonElement",
        description: "Extends <button>",
        detail: "Customized built-in button element",
        value: "HTMLButtonElement:button",
      },
      {
        label: "HTMLInputElement",
        description: "Extends <input>",
        detail: "Customized built-in input element",
        value: "HTMLInputElement:input",
      },
      {
        label: "HTMLDivElement",
        description: "Extends <div>",
        detail: "Customized built-in div element",
        value: "HTMLDivElement:div",
      },
      {
        label: "HTMLAnchorElement",
        description: "Extends <a>",
        detail: "Customized built-in anchor element",
        value: "HTMLAnchorElement:a",
      },
    ], {
      placeHolder: "Select base HTML element",
      title: "Base Element",
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
          label: "$(add) Add Property",
          value: "add",
        },
        {
          label: "$(check) Finish",
          description: `${properties.length} properties defined`,
          value: "finish",
        },
      ], {
        placeHolder: "Component properties",
        title: `Properties (${properties.length})`,
      });

      if (!action || action.value === "finish") {
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
      prompt: "Property name (camelCase)",
      placeHolder: "myProperty",
      validateInput: (value) => {
        if (!value) {
          return "Property name is required";
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return "Property name must start with lowercase letter and be camelCase";
        }
        return undefined;
      },
    });

    if (!name) {
      return undefined;
    }

    const typeSelection = await vscode.window.showQuickPick([
      { label: "string", value: "string" as const },
      { label: "number", value: "number" as const },
      { label: "boolean", value: "boolean" as const },
      { label: "function", value: "function" as const },
      { label: "object", value: "object" as const },
      { label: "array", value: "array" as const },
    ], {
      placeHolder: "Select property type",
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
      prompt: "Component file path (relative to workspace)",
      placeHolder: "./components/my-component.ts",
      value: suggestion,
      validateInput: (value) => {
        if (!value) {
          return "File path is required";
        }
        if (!value.endsWith(".ts")) {
          return "File must have .ts extension";
        }
        return undefined;
      },
    });
  }

  /**
   * Generate component code
   */
  private async generateComponentCode(
    result: ComponentWizardResult,
  ): Promise<string> {
    if (result.componentType === "html-props") {
      return this.generateHtmlPropsCode(result);
    } else {
      return this.generateVanillaCode(result);
    }
  }

  /**
   * Generate html-props component code
   */
  private generateHtmlPropsCode(result: ComponentWizardResult): string {
    const { className, tagName, baseElement, baseTag, properties } = result;

    // Generate interface properties
    const interfaceProps = properties
      .map((p) => {
        const type = p.type === "function" ? "() => void" : p.type;
        return `  ${p.name}?: ${type};`;
      })
      .join("\n");

    // Generate signal properties
    const signalProps = properties
      .filter((p) => p.type !== "function")
      .map((p) => {
        const tsType = p.type === "array" ? "any[]" : p.type;
        const defaultVal = p.defaultValue ||
          this.getDefaultValueForType(p.type);
        return `  ${p.name} = signal<${tsType}>(${defaultVal});`;
      })
      .join("\n");

    // Generate function properties
    const functionProps = properties
      .filter((p) => p.type === "function")
      .map((p) => `  ${p.name}?: () => void;`)
      .join("\n");

    // Generate observedAttributes
    const observedAttrs = properties
      .filter((p) => p.type !== "function")
      .map((p) => `'${this.toKebabCase(p.name)}'`)
      .join(", ");

    // Generate define call with extends support
    const defineCall = baseTag
      ? `${className}.define('${tagName}', { extends: '${baseTag}' });`
      : `${className}.define('${tagName}');`;

    return `import HTMLProps from '@html-props/core';
import { signal } from '@html-props/signals';

/**
 * Props interface for ${className}
 */
interface ${className}Props extends ${baseElement} {
${interfaceProps}
}

/**
 * ${className} component
 * Generated by HTML Props Builder
 */
class ${className} extends HTMLProps(${baseElement})<${className}Props>() {
  static override get observedAttributes() {
    return [${observedAttrs}];
  }

${signalProps}
${functionProps ? "\n" + functionProps : ""}

  override attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    mapAttributeToSignal(this, name, newValue);
  }

  override render(): this['content'] {
    // Build your component structure using HTML Props Builder
    // Drag elements from Elements panel to construct the DOM hierarchy
    return [];
  }
}

/**
 * Helper to map kebab-case attributes to camelCase signal properties
 */
function mapAttributeToSignal(
  // deno-lint-ignore no-explicit-any
  component: any,
  attrName: string,
  value: string | null
) {
  if (value === null) return;
  const propName = attrName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  if (propName in component && typeof component[propName]?.set === 'function') {
    component[propName].set(value);
  }
}

${defineCall}

export default ${className};
`;
  }

  /**
   * Generate vanilla component code
   */
  private generateVanillaCode(result: ComponentWizardResult): string {
    const { className, tagName, properties } = result;

    const observedAttrs = properties
      .filter((p) => p.type !== "function")
      .map((p) => `'${this.toKebabCase(p.name)}'`)
      .join(", ");

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
   * Create component file
   */
  private async createComponentFile(
    filePath: string,
    code: string,
  ): Promise<vscode.Uri> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error("No workspace folder open");
    }

    // Resolve absolute path
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(workspaceFolder.uri.fsPath, filePath);

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
      "vscode.openWith",
      fileUri,
      "webBuilder.visualHtmlEditor",
    );
  }

  /**
   * Get default value for type
   */
  private getDefaultValueForType(type: string): string {
    switch (type) {
      case "string":
        return "''";
      case "number":
        return "0";
      case "boolean":
        return "false";
      case "object":
        return "{}";
      case "array":
        return "[]";
      case "function":
        return "null";
      default:
        return "''";
    }
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }

  /**
   * Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }
}
