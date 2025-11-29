import * as vscode from 'vscode';
import { CustomElement, CustomElementScanner } from '../services/CustomElementScanner';
import { AttributeRegistry } from '../services/AttributeRegistry';
import { AdapterManager, ElementDefinition, ICodeStyleAdapter } from '../adapters';
import { WebBuilderEditorProvider } from '../editors/WebBuilderEditorProvider';

/**
 * WebView-based Resources Panel provider with enhanced UX
 *
 * Handles:
 * - Loading built-in elements from adapter
 * - Scanning custom elements from configured directories
 * - Displaying HTML pages from configured directories
 * - Providing elements and pages data to webview
 * - Handling element insertion, drag, and component creation
 */
export class ResourcesWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'webBuilder.resourcesWebview';

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
    this.currentAdapter = this.adapterManager.getAdapterById('html') ||
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
      if (e.affectsConfiguration('webBuilder.resourceDirectories')) {
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
        '[WARN] [ResourcesWebviewViewProvider] No adapter available for built-in elements',
      );
      this.builtinElements = [];
      return;
    }

    try {
      this.builtinElements = await this.currentAdapter.getBuiltinElements();
      this.refresh();
    } catch (error) {
      this.outputChannel.appendLine(
        `[ERROR] [ResourcesWebviewViewProvider] Failed to load built-in elements from adapter: ${error}`,
      );
      this.builtinElements = [];
    }
  }

  /**
   * Load custom elements from configured directories
   */
  private async loadCustomElements(): Promise<void> {
    const config = vscode.workspace.getConfiguration('webBuilder');
    const directories = config.get<Array<{ name: string; path: string }>>(
      'resourceDirectories',
      [],
    );

    this.outputChannel.appendLine(
      `[ResourcesWebviewViewProvider] Loading custom elements from ${directories.length} directories`,
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
        `[ResourcesWebviewViewProvider] Found ${elements.length} elements in ${dirName}`,
      );
      allCustomElements.push(...elements);
    }

    this.outputChannel.appendLine(
      `[ResourcesWebviewViewProvider] Total custom elements found: ${allCustomElements.length}`,
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
      if (dirPath) {
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
        vscode.Uri.joinPath(this._extensionUri, 'webview'),
        vscode.Uri.joinPath(
          this._extensionUri,
          'node_modules',
          '@vscode',
          'codicons',
          'dist',
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
        `[ResourcesWebviewViewProvider] Visibility changed: ${webviewView.visible}`,
      );
      this._onDidChangeVisibility.fire({ visible: webviewView.visible });
    });

    // Fire initial visibility state
    this._onDidChangeVisibility.fire({ visible: webviewView.visible });

    this.outputChannel.appendLine(
      '[ResourcesWebviewViewProvider] WebView resolved, waiting for ready signal',
    );
  }

  /**
   * Update the elements data in the webview
   */
  private _updateElements() {
    if (!this._view) {
      this.outputChannel.appendLine(
        '[ResourcesWebviewViewProvider] Cannot update - webview not ready',
      );
      return;
    }

    // Get built-in elements
    const builtinElements = this.getBuiltinElements();

    // Get custom elements
    let customElementCategories = this.getCustomElementCategories();

    // Send data to webview
    this._view.webview.postMessage({
      type: 'updateElements',
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
      directoryPath?: string;
      clientX?: number;
      clientY?: number;
    },
  ) {
    switch (data.type) {
      case 'webviewReady':
        this.outputChannel.appendLine(
          '[ResourcesWebviewViewProvider] WebView ready, sending elements data',
        );
        this._updateElements();
        break;

      case 'startDragFromElements':
        // Call editor provider directly
        if (this.editorProvider) {
          this.editorProvider.notifyStartDragFromElements(
            data.html || '',
            data.tag || '',
          );
        }
        break;

      case 'stopDragFromElements':
        // Call editor provider directly
        if (this.editorProvider) {
          this.editorProvider.notifyStopDragFromElements();
        }
        break;

      case 'updateDragPosition':
        // Call editor provider directly
        if (this.editorProvider) {
          this.editorProvider.updateDragPositionFromElements(
            data.clientX || 0,
            data.clientY || 0,
          );
        }
        break;

      case 'openElement':
        // Open element source file in HTML Props Builder editor
        if (data.filePath) {
          const fileUri = vscode.Uri.file(data.filePath);
          vscode.commands.executeCommand(
            'vscode.openWith',
            fileUri,
            'webBuilder.visualHtmlEditor',
          );
        }
        break;

      case 'createResource':
        this.outputChannel.appendLine(
          '[ResourcesWebviewViewProvider] Create resource (main button)',
        );
        vscode.commands.executeCommand('html-props-builder.createResource');
        break;

      case 'createResourceInCategory':
        if (data.categoryPath) {
          this.outputChannel.appendLine(
            `[ResourcesWebviewViewProvider] Create resource in category: ${data.categoryPath}`,
          );
          vscode.commands.executeCommand(
            'html-props-builder.createResourceInCategory',
            data.categoryPath,
          );
        }
        break;

      case 'deleteDirectory':
        if (data.directoryPath) {
          this.outputChannel.appendLine(
            `[ResourcesWebviewViewProvider] Delete directory: ${data.directoryPath}`,
          );
          this.handleDeleteDirectory(data.directoryPath);
        }
        break;
    }
  }

  /**
   * Handle directory deletion from settings
   */
  private async handleDeleteDirectory(directoryPath: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('webBuilder');
      const resourceDirectories = config.get<
        Array<{ name: string; path: string }>
      >('resourceDirectories', []);

      // Find the directory to remove
      const index = resourceDirectories.findIndex((d) => d.path === directoryPath);
      if (index === -1) {
        vscode.window.showWarningMessage('Directory not found in settings');
        return;
      }

      // Confirm deletion
      const dirName = resourceDirectories[index].name;
      const confirmed = await vscode.window.showWarningMessage(
        `Remove "${dirName}" directory from settings?`,
        { modal: true },
        'Remove',
      );

      if (confirmed !== 'Remove') {
        return;
      }

      // Remove from settings
      resourceDirectories.splice(index, 1);
      await config.update(
        'resourceDirectories',
        resourceDirectories,
        vscode.ConfigurationTarget.Workspace,
      );

      // Refresh scanner
      if (this.scanner) {
        await this.scanner.initialize(resourceDirectories);
      }

      this.refresh();
      vscode.window.showInformationMessage(
        `Directory "${dirName}" removed from settings`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to remove directory: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'resources-panel.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'resources-panel.css'),
    );

    // Codicons CSS for icons
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'node_modules',
        '@vscode/codicons',
        'dist',
        'codicon.css',
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
      <div class="search-wrapper">
        <span class="codicon codicon-search search-icon"></span>
        <input type="text" class="search-input" placeholder="Search elements..." id="search-input">
      </div>
      <button class="toolbar-btn" id="create-component-btn" title="Add a new resource directory">
        <span class="codicon codicon-add"></span>
      </button>
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
