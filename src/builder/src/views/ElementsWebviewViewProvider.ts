import * as vscode from "vscode";
import {
  CustomElement,
  CustomElementScanner,
} from "../services/CustomElementScanner";
import { AttributeRegistry } from "../services/AttributeRegistry";
import {
  AdapterManager,
  ElementDefinition,
  ICodeStyleAdapter,
} from "../adapters";
import { WebBuilderEditorProvider } from "../editors/WebBuilderEditorProvider";

/**
 * WebView-based Resources Panel provider with enhanced UX
 *
 * Handles:
 * - Loading built-in elements from adapter
 * - Scanning custom elements from configured directories
 * - Providing elements data to webview
 * - Handling element insertion, drag, and component creation
 */
export class ResourcesWebviewViewProvider
  implements vscode.WebviewViewProvider {
  public static readonly viewType = "webBuilder.resourcesWebview";

  private _view?: vscode.WebviewView;
  private _onDidChangeVisibility = new vscode.EventEmitter<
    { visible: boolean }
  >();
  public readonly onDidChangeVisibility = this._onDidChangeVisibility.event;

  // Element management
  private builtinElements: ElementDefinition[] = [];
  private scanner: CustomElementScanner;
  private adapterManager: AdapterManager;
  private currentAdapter?: ICodeStyleAdapter;
  private editorProvider?: WebBuilderEditorProvider;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    adapterManager: AdapterManager,
    private readonly outputChannel: vscode.OutputChannel,
    scanner?: CustomElementScanner,
  ) {
    this.adapterManager = adapterManager;
    this.scanner = scanner || new CustomElementScanner();

    // Get HTML adapter for built-in elements (default adapter)
    this.currentAdapter = this.adapterManager.getAdapterById("html") ||
      undefined;

    // Set initial adapter for scanner
    this.scanner.setAdapter(this.currentAdapter);

    // Load built-in elements from adapter
    this.loadBuiltinElements();

    // Listen to scanner changes
    this.scanner.onDidChangeElements(() => {
      this.refresh();
    });

    // Listen to configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("webBuilder.resourceDirectories")) {
        this.loadCustomElements();
      }
    });

    // Listen to active editor changes to update adapter
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor) {
        const adapter = await this.adapterManager.getAdapter(
          editor.document.uri.fsPath,
        );
        if (adapter && adapter !== this.currentAdapter) {
          this.currentAdapter = adapter;
          this.scanner.setAdapter(adapter);
          // Rescan with new adapter patterns
          this.loadCustomElements();
        }
      }
    });

    // Initial load
    this.loadCustomElements();
  }

  /**
   * Set editor provider for direct communication
   */
  public setEditorProvider(editorProvider: WebBuilderEditorProvider): void {
    this.editorProvider = editorProvider;
  }

  /**
   * Load built-in elements from current adapter
   */
  private async loadBuiltinElements(): Promise<void> {
    if (!this.currentAdapter) {
      this.outputChannel.appendLine(
        "[WARN] [ElementsWebviewViewProvider] No adapter available for built-in elements",
      );
      this.builtinElements = [];
      return;
    }

    try {
      this.builtinElements = await this.currentAdapter.getBuiltinElements();
      this.refresh();
    } catch (error) {
      this.outputChannel.appendLine(
        `[ERROR] [ElementsWebviewViewProvider] Failed to load built-in elements from adapter: ${error}`,
      );
      this.builtinElements = [];
    }
  }

  /**
   * Load custom elements from configured directories
   */
  private async loadCustomElements(): Promise<void> {
    const config = vscode.workspace.getConfiguration("webBuilder");
    const directories = config.get<Array<{ name: string; path: string }>>(
      "resourceDirectories",
      [],
    );

    this.outputChannel.appendLine(
      `[ElementsWebviewViewProvider] Loading custom elements from ${directories.length} directories`,
    );
    directories.forEach((dir) => {
      this.outputChannel.appendLine(`  - ${dir.name}: ${dir.path}`);
    });

    await this.scanner.initialize(directories);

    // Register all custom elements with AttributeRegistry
    const allCustomElements: CustomElement[] = [];
    for (const dirName of this.scanner.getDirectoryNames()) {
      const elements = this.scanner.getElements(dirName);
      this.outputChannel.appendLine(
        `[ElementsWebviewViewProvider] Found ${elements.length} elements in ${dirName}`,
      );
      allCustomElements.push(...elements);
    }

    this.outputChannel.appendLine(
      `[ElementsWebviewViewProvider] Total custom elements found: ${allCustomElements.length}`,
    );
    AttributeRegistry.registerCustomElements(allCustomElements);

    this.refresh();
  }

  /**
   * Refresh the webview with updated elements
   */
  private refresh(): void {
    this._updateElements();
  }

  /**
   * Get built-in HTML elements
   */
  public getBuiltinElements(): ElementDefinition[] {
    return this.builtinElements;
  }

  /**
   * Get custom element categories
   */
  public getCustomElementCategories(): Array<
    { name: string; path: string; elements: CustomElement[] }
  > {
    const categories: Array<
      { name: string; path: string; elements: CustomElement[] }
    > = [];

    for (const dirName of this.scanner.getDirectoryNames()) {
      const elements = this.scanner.getElements(dirName);
      const dirPath = this.scanner.getDirectoryPath(dirName);
      if (elements.length > 0 && dirPath) {
        categories.push({
          name: dirName,
          path: dirPath,
          elements: elements,
        });
      }
    }

    return categories;
  }

  /**
   * Resolve the WebView view
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview"),
        vscode.Uri.joinPath(
          this._extensionUri,
          "node_modules",
          "@vscode",
          "codicons",
          "dist",
        ),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      this._handleMessage(data);
    });

    // Listen to visibility changes
    webviewView.onDidChangeVisibility(() => {
      this.outputChannel.appendLine(
        `[ElementsWebviewViewProvider] Visibility changed: ${webviewView.visible}`,
      );
      this._onDidChangeVisibility.fire({ visible: webviewView.visible });
    });

    // Fire initial visibility state
    this._onDidChangeVisibility.fire({ visible: webviewView.visible });

    this.outputChannel.appendLine(
      "[ElementsWebviewViewProvider] WebView resolved, waiting for ready signal",
    );
  }

  /**
   * Update the elements data in the webview
   */
  private async _updateElements() {
    if (!this._view) {
      this.outputChannel.appendLine(
        "[ElementsWebviewViewProvider] Cannot update - webview not ready",
      );
      return;
    }

    // Get built-in elements
    const builtinElements = this.getBuiltinElements();

    // Get custom elements
    let customElementCategories = this.getCustomElementCategories();

    // Send data to webview
    this._view.webview.postMessage({
      type: "updateElements",
      builtinElements,
      customElementCategories,
    });
  }

  /**
   * Handle messages from the webview
   */
  private _handleMessage(
    data: {
      type: string;
      html?: string;
      tag?: string;
      categoryPath?: string;
      filePath?: string;
      clientX?: number;
      clientY?: number;
    },
  ) {
    switch (data.type) {
      case "webviewReady":
        this.outputChannel.appendLine(
          "[ElementsWebviewViewProvider] WebView ready, sending elements data",
        );
        this._updateElements();
        break;

      case "startDragFromElements":
        // Call editor provider directly
        if (this.editorProvider) {
          this.editorProvider.notifyStartDragFromElements(
            data.html || "",
            data.tag || "",
          );
        }
        break;

      case "stopDragFromElements":
        // Call editor provider directly
        if (this.editorProvider) {
          this.editorProvider.notifyStopDragFromElements();
        }
        break;

      case "updateDragPosition":
        // Call editor provider directly
        if (this.editorProvider) {
          this.editorProvider.updateDragPositionFromElements(
            data.clientX || 0,
            data.clientY || 0,
          );
        }
        break;

      case "openElement":
        // Open element source file in HTML Props Builder editor
        if (data.filePath) {
          const fileUri = vscode.Uri.file(data.filePath);
          vscode.commands.executeCommand(
            "vscode.openWith",
            fileUri,
            "webBuilder.visualHtmlEditor",
          );
        }
        break;

      case "createComponent":
        this.outputChannel.appendLine(
          "[ElementsWebviewViewProvider] Create component (main button)",
        );
        vscode.commands.executeCommand("html-props-builder.createComponent");
        break;

      case "createComponentInCategory":
        if (data.categoryPath) {
          this.outputChannel.appendLine(
            `[ElementsWebviewViewProvider] Create component in category: ${data.categoryPath}`,
          );
          vscode.commands.executeCommand(
            "html-props-builder.createComponentInCategory",
            data.categoryPath,
          );
        }
        break;
    }
  }

  /**
   * Get HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview", "resources-panel.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview", "resources-panel.css"),
    );

    // Codicons CSS for icons
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "node_modules",
        "@vscode/codicons",
        "dist",
        "codicon.css",
      ),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src ${webview.cspSource};">
  <link href="${codiconsUri}" rel="stylesheet" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Resources Panel</title>
</head>
<body>
  <div class="resources-panel">
    <div class="toolbar">
      <span class="toolbar-title">Resources</span>
      <button class="toolbar-btn" id="create-component-btn" title="Create Component (Ctrl+Shift+C)">
        <span class="codicon codicon-add"></span>
      </button>
    </div>
    <div class="search-box">
      <div class="search-wrapper">
        <span class="codicon codicon-search search-icon"></span>
        <input type="text" class="search-input" placeholder="Search elements..." id="search-input">
      </div>
    </div>
    <div id="elements-container" class="elements-container"></div>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.scanner.dispose();
    this._onDidChangeVisibility.dispose();
  }
}
