import * as vscode from "vscode";
import { LayersWebviewViewProvider } from "../views/LayersWebviewViewProvider";
import { ElementData, LayerData, PropertiesData } from "../types/interfaces";
import { AdapterManager, ICodeStyleAdapter } from "../adapters";
import { DevServer } from "../services/DevServer";
import { CustomElementScanner } from "../services/CustomElementScanner";
import { PropertiesWebviewViewProvider } from "../views/PropertiesWebviewViewProvider";

/**
 * Interface for properties provider (TreeView or WebView)
 */
interface IPropertiesProvider {
  updateElement(elementData: ElementData | null): void;
  updateElementProps?(
    propsData: PropertiesData | null,
    elementData?: ElementData,
  ): void;
  clear(): void;
  getSelectedElementTag(): string | null;
}

/**
 * Editor DOM Webview View Provider - CustomTextEditorProvider
 *
 * Displays the visual editor with editor UI overlays (editor-inject.js and editor-inject.css).
 * Works with Preview DOM to implement dual DOM architecture.
 *
 * Architecture:
 * - Manages custom text editor for HTML/TypeScript files
 * - Injects editor-inject.js/css for UI overlays
 * - Coordinates with Preview DOM for clean HTML source of truth
 * - Sends low-level messages to Preview DOM (insert/delete/move/updateProperty)
 * - Receives updated HTML from Preview DOM and syncs to Editor DOM
 */
export class WebBuilderEditorProvider
  implements vscode.CustomTextEditorProvider {
  /**
   * Custom editor view type
   */
  public static readonly viewType = "webBuilder.visualHtmlEditor";

  private editorWebviewPanel?: vscode.WebviewPanel;
  private layersWebviewProvider?: LayersWebviewViewProvider;
  private propertiesWebviewProvider?: PropertiesWebviewViewProvider;

  // Document state
  private activeDocument?: vscode.TextDocument;
  private currentAdapter?: ICodeStyleAdapter;

  // Preview DOM state (for diffing)
  private previousPreviewHTML: string = "";
  private fullPreviewHTML: string = "";

  // Selection state (for sidebar operations)
  private lastSelectedElementSelector: string = "body";

  private readonly outputChannel: vscode.OutputChannel;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly adapterManager: AdapterManager,
    private readonly devServer?: DevServer,
    private readonly customElementScanner?: CustomElementScanner,
  ) {
    this.outputChannel = vscode.window.createOutputChannel(
      "HTML Props Builder",
    );
  }

  /**
   * Resolve custom text editor
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    this.activeDocument = document;
    this.editorWebviewPanel = webviewPanel;

    // Get adapter for this file type
    const adapter = await this.adapterManager.getAdapter(document.uri.fsPath);
    if (!adapter) {
      vscode.window.showErrorMessage("No adapter found for this file type");
      return;
    }
    this.currentAdapter = adapter;

    // Set adapter on properties provider so it can use it for parsing HTML
    const propertiesProvider = this.propertiesWebviewProvider as any;
    if (propertiesProvider.setCurrentAdapter) {
      propertiesProvider.setCurrentAdapter(adapter);
    }

    // Set custom element scanner on properties provider
    if (propertiesProvider.setCustomElementScanner) {
      propertiesProvider.setCustomElementScanner(this.customElementScanner);
    }

    // Set current file path on properties provider
    if (propertiesProvider.setCurrentFilePath) {
      propertiesProvider.setCurrentFilePath(document.uri.fsPath);
    }

    // Set adapter configuration
    if (adapter.setCurrentFilePath) {
      adapter.setCurrentFilePath(document.uri.fsPath);
    }

    if (adapter.setCurrentWorkspaceFolder) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (workspaceFolder) {
        adapter.setCurrentWorkspaceFolder(workspaceFolder);
      }
    }

    if (adapter.setDevServer) {
      adapter.setDevServer(this.devServer);
    }

    if (adapter.setCustomElementScanner) {
      adapter.setCustomElementScanner(this.customElementScanner);
    }

    // Setup webview options
    webviewPanel.webview.options = {
      enableScripts: true,
      enableCommandUris: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "webview"),
        vscode.Uri.joinPath(this.context.extensionUri, "media"),
      ],
    };

    // Setup message handler
    webviewPanel.webview.onDidReceiveMessage(async (message: any) => {
      console.log("[EditorWebview] Message received:", message.type);
      try {
        await this.handleEditorMessage(message);
      } catch (error) {
        console.error("[EditorWebview] Error handling message:", error);
        vscode.window.showErrorMessage(
          `Editor error: ${(error as Error).message}`,
        );
      }
    });

    // Show loading state initially
    this.setLoading();

    // Load HTML content asynchronously
    try {
      const sourceCode = document.getText();
      const ast = await adapter.parse(sourceCode);

      // Use adapter's renderPreview() to generate HTML
      // This ensures adapter-specific logic (bundlePath, etc.) is applied
      let previewHtml = await adapter.renderPreview(ast);

      this.fullPreviewHTML = previewHtml;
      this.previousPreviewHTML = previewHtml;

      console.log(
        "[EditorWebview] Preview HTML loaded, length:",
        previewHtml.length,
      );
      console.log(
        "[EditorWebview] Preview HTML (first 800 chars):",
        previewHtml.substring(0, 800),
      );

      // Set content with editor injections on Editor DOM
      this.setContent(previewHtml);

      // Update Shadow DOM (source of truth for clean HTML)
      this.setPreviewContent(previewHtml);

      // Update layers panel
      if (this.layersWebviewProvider) {
        this.layersWebviewProvider.updateTreeFromHtml(previewHtml);
      }
    } catch (error) {
      console.error("[EditorWebview] Error loading HTML:", error);
      vscode.window.showErrorMessage(
        `Failed to render preview: ${(error as Error).message}`,
      );
    }

    // Cleanup on panel dispose
    webviewPanel.onDidDispose(() => {
      this.editorWebviewPanel = undefined;
      this.activeDocument = undefined;
    });
  }

  /**
   * Handle messages from editor webview (editor-inject.js)
   *
   * These are OUTBOUND messages FROM the editor to other panels:
   * - Editor → Layers panel
   * - Editor → Properties panel
   *
   * INBOUND messages (Sidebar/Layers/Properties → Editor) are handled
   * via direct method calls like selectElementFromLayer(), not via this handler.
   */
  private async handleEditorMessage(message: any): Promise<void> {
    console.log(`[EditorWebview] Message received: ${message.type}`);

    switch (message.type) {
      case "updateLayersFromHtml":
        // Editor DOM has updated, sync to Layers panel
        if (this.layersWebviewProvider && message.html) {
          this.layersWebviewProvider.updateTreeFromHtml(message.html);
        }
        break;

      case "updatePropertiesFromHtml":
        // Editor DOM has updated, sync to Properties panel
        if (this.propertiesWebviewProvider && message.html) {
          await this.propertiesWebviewProvider.updatePropertiesFromHtml(
            message.html,
            message.properties,
          );
        }
        break;

      case "updateSourceFromHtml":
        // Editor DOM has updated, sync to source code via applyHTMLDiff with JSON data
        this.outputChannel.appendLine(
          `[updateSourceFromHtml] Message received, has domJson: ${!!message
            .domJson}`,
        );
        if (message.domJson) {
          try {
            await this.applyHTMLDiffToSource(message.domJson);
          } catch (error) {
            this.outputChannel.appendLine(
              `[ERROR] Failed to apply HTML diff: ${(error as Error).message}`,
            );
          }
        } else {
          this.outputChannel.appendLine(`[ERROR] No domJson in message!`);
        }
        break;
    }
  }

  /**
   * Apply HTML diff to source code
   * Now receives DOM structure as JSON with preserved element props
   * Uses adapter's applyHTMLDiff to sync visual changes back to source
   */
  private async applyHTMLDiffToSource(domJson: any): Promise<void> {
    if (!this.activeDocument || !this.currentAdapter) {
      this.outputChannel.appendLine(
        `[applyHTMLDiffToSource] Missing document or adapter`,
      );
      return;
    }

    try {
      this.outputChannel.appendLine(
        `[applyHTMLDiffToSource] Starting with JSON length: ${
          JSON.stringify(domJson).length
        }`,
      );
      const sourceCode = this.activeDocument.getText();

      // Use adapter's applyHTMLDiff method with JSON data
      const updatedSourceCode = await this.currentAdapter.applyHTMLDiff(
        this.previousPreviewHTML,
        "", // newHTML not used anymore (using domJson instead)
        sourceCode,
        domJson, // Pass JSON structure with preserved props
      );

      this.outputChannel.appendLine(
        `[applyHTMLDiffToSource] Updated source code length: ${updatedSourceCode.length}`,
      );

      // Update document
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        this.activeDocument.lineAt(0).range.start,
        this.activeDocument.lineAt(this.activeDocument.lineCount - 1).range.end,
      );
      edit.replace(this.activeDocument.uri, fullRange, updatedSourceCode);
      await vscode.workspace.applyEdit(edit);

      // Update tracking - use serialized JSON as new state
      this.previousPreviewHTML = JSON.stringify(domJson);

      this.outputChannel.appendLine(
        `[applyHTMLDiff] Source updated successfully`,
      );
    } catch (error) {
      this.outputChannel.appendLine(
        `[ERROR applyHTMLDiff] ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Set loading state
   */
  private setLoading(): void {
    if (!this.editorWebviewPanel) {
      return;
    }

    this.editorWebviewPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Props Builder - Editor</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .loading {
            text-align: center;
        }
        .spinner {
            border: 2px solid var(--vscode-editor-foreground);
            border-top: 2px solid var(--vscode-focusBorder);
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>Loading visual editor...</p>
    </div>
</body>
</html>`;
  }

  /**
   * Set content with editor UI injections
   */
  private setContent(html: string): void {
    if (!this.editorWebviewPanel) {
      return;
    }

    // Store previous HTML for applyHTMLDiff
    // This will be updated by editor-inject.js after DOM changes
    // Initially set to current preview HTML to avoid spurious diffs
    this.previousPreviewHTML = html;

    // Inject editor styles into head
    const styleUri = this.editorWebviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "webview",
        "editor-inject.css",
      ),
    );

    const headInjection = `
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@latest/dist/codicon.css" data-editor-inject="codicons">
  <link rel="stylesheet" href="${styleUri}" data-editor-inject="editor-styles">`;

    // Inject DOM adapter script before editor script
    const domAdapterUri = this.editorWebviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "webview",
        "adapters",
        "dom_adapter.js",
      ),
    );

    // Inject editor script into body
    const scriptUri = this.editorWebviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "webview",
        "editor-inject.js",
      ),
    );

    const bodyInjection = `
  <script src="${domAdapterUri}" data-editor-inject="dom-adapter-script"></script>
  <script src="${scriptUri}" data-editor-inject="editor-script"></script>`;

    let result = html.replace(/<\/head>/i, headInjection + "\n</head>");
    result = result.replace(/<\/body>/i, bodyInjection + "\n</body>");

    // Log the final HTML for debugging
    console.log(
      "[EditorWebview] Final HTML (first 500 chars):",
      result.substring(0, 500),
    );

    this.editorWebviewPanel.webview.html = result;
  }

  /**
   * Send message to editor DOM
   */
  public postMessage(message: any): void {
    if (!this.editorWebviewPanel) {
      console.warn(
        "[EditorWebview] Cannot post message - panel not initialized",
      );
      return;
    }
    this.editorWebviewPanel.webview.postMessage(message);
  }

  /**
   * Update Shadow DOM in editor with clean HTML
   */
  private setPreviewContent(html: string): void {
    if (!this.editorWebviewPanel) {
      console.warn(
        "[EditorWebview] Cannot update Shadow DOM - panel not initialized",
      );
      return;
    }

    console.log(
      "[EditorWebview] Updating Shadow DOM with HTML length:",
      html.length,
    );
    this.postMessage({
      type: "setPreviewContent",
      html: html,
    });
  }

  /**
   * Set layers webview provider for selection synchronization
   */
  public setLayersWebviewProvider(
    layersWebviewProvider: LayersWebviewViewProvider,
  ): void {
    this.layersWebviewProvider = layersWebviewProvider;
  }

  /**
   * Set properties webview provider for selection synchronization
   */
  public setPropertiesWebviewProvider(
    propertiesWebviewProvider: PropertiesWebviewViewProvider,
  ): void {
    this.propertiesWebviewProvider = propertiesWebviewProvider;
  }

  /**
   * Select element from layers panel
   * Sends CSS selector to editor DOM to highlight and select the element
   */
  public selectElementFromLayer(
    layer: LayerData | undefined,
    selector?: string,
  ): void {
    console.log("[EditorWebview] selectElementFromLayer:", layer, selector);

    // Use selector if provided, otherwise construct from layer data
    const cssPath = selector ||
      (layer ? this.constructCssSelector(layer) : "body");

    // Store for reference
    if (cssPath) {
      this.lastSelectedElementSelector = cssPath;
    }

    // Send to editor DOM to select the element
    if (this.editorWebviewPanel) {
      this.editorWebviewPanel.webview.postMessage({
        type: "selectElement",
        cssPath,
      });
    }
  }

  /**
   * Hover element from layers panel
   * Shows hover highlight without changing selection
   */
  public hoverElementFromLayer(cssPath?: string): void {
    if (this.editorWebviewPanel) {
      this.editorWebviewPanel.webview.postMessage({
        type: "hoverElement",
        cssPath: cssPath || null,
      });
    }
  }

  /**
   * Move element from layers panel
   * Receives source and target CSS selectors from layers panel and moves element
   */
  public moveElementFromLayer(
    sourceCssPath: string,
    targetCssPath: string,
    position: string,
  ): void {
    console.log(
      "[EditorWebview] moveElementFromLayer:",
      sourceCssPath,
      targetCssPath,
      position,
    );

    if (this.editorWebviewPanel) {
      this.editorWebviewPanel.webview.postMessage({
        type: "moveElement",
        sourceSelector: sourceCssPath,
        targetSelector: targetCssPath,
        position: position,
      });
    }
  }

  /**
   * Construct CSS selector from layer data
   * This is a fallback when no selector is provided
   */
  private constructCssSelector(layer: LayerData): string {
    // If layer has ID, use it
    if (layer.element?.attributes?.id) {
      return `#${layer.element.attributes.id}`;
    }

    // Otherwise use tag + class
    let selector = layer.element?.tag || "body";

    if (layer.element?.attributes?.class) {
      const firstClass = layer.element.attributes.class.split(" ")[0];
      if (firstClass) {
        selector += `.${firstClass}`;
      }
    }

    return selector;
  }

  /**
   * Update property in preview DOM
   * Called by Properties panel when user edits a property
   */
  public updatePropertyInPreview(
    selector: string,
    name: string,
    value: string,
  ): void {
    if (!this.editorWebviewPanel) {
      return;
    }

    // Send update to editor DOM to apply to preview
    this.editorWebviewPanel.webview.postMessage({
      type: "updateProperty",
      selector: selector,
      propertyName: name,
      propertyValue: value,
      propertyType: "attribute",
    });
  }

  /**
   * Notify editor that drag from elements panel has started
   */
  public notifyStartDragFromElements(html: string, tag: string): void {
    if (!this.editorWebviewPanel) {
      return;
    }
    this.editorWebviewPanel.webview.postMessage({
      type: "startDragFromElements",
      html,
      tag,
    });
  }

  /**
   * Notify editor that drag from elements panel has ended
   */
  public notifyStopDragFromElements(): void {
    if (!this.editorWebviewPanel) {
      return;
    }
    this.editorWebviewPanel.webview.postMessage({
      type: "stopDragFromElements",
    });
  }

  /**
   * Update drag position from elements panel
   */
  public updateDragPositionFromElements(
    clientX: number,
    clientY: number,
  ): void {
    if (!this.editorWebviewPanel) {
      return;
    }
    this.editorWebviewPanel.webview.postMessage({
      type: "updateDragPosition",
      clientX,
      clientY,
    });
  }

  /**
   * Delete element (from layers panel context menu)
   */
  public deleteElement(tag: string, attributes: Record<string, string>): void {
    if (!this.editorWebviewPanel) {
      return;
    }
    this.editorWebviewPanel.webview.postMessage({
      type: "deleteElement",
      tag,
      attributes,
    });
  }

  /**
   * Duplicate element (from layers panel context menu)
   */
  public duplicateElement(
    tag: string,
    attributes: Record<string, string>,
  ): void {
    if (!this.editorWebviewPanel) {
      return;
    }
    this.editorWebviewPanel.webview.postMessage({
      type: "duplicateElement",
      tag,
      attributes,
    });
  }

  /**
   * Copy element (from layers panel context menu)
   */
  public copyElement(tag: string, attributes: Record<string, string>): void {
    if (!this.editorWebviewPanel) {
      return;
    }
    this.editorWebviewPanel.webview.postMessage({
      type: "copyElement",
      tag,
      attributes,
    });
  }
}
