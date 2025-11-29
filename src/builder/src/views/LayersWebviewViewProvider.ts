import * as vscode from 'vscode';
import { AdapterManager, ElementMetadata, ICodeStyleAdapter } from '../adapters';
import { WebBuilderEditorProvider } from '../editors/WebBuilderEditorProvider';

/**
 * WebView-based Layers Panel provider
 * 
 * Handles:
 * - Sending layer data from preview HTML to webview for rendering
 * - Managing layer selection and hover states
 */
export class LayersWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'webBuilder.layersWebview';
  
  private _view?: vscode.WebviewView;
  private editorProvider?: WebBuilderEditorProvider;
  
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly outputChannel: vscode.OutputChannel
  ) {
  }

  /**
   * Set editor provider for direct communication
   */
  public setEditorProvider(editorProvider: WebBuilderEditorProvider): void {
    this.editorProvider = editorProvider;
  }
  
  /**
   * Resolve the WebView view
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'webview'),
        vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist')
      ]
    };
    
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(data => {
      this._handleMessage(data);
    });
    
    // Don't send initial tree update here - wait for webview to signal it's ready
        
    this.outputChannel.appendLine('[LayersWebviewViewProvider] WebView resolved, waiting for ready signal');
  }
  
  /**
   * Update the tree data in the webview
   */
  /**
   * Update the layers tree from raw HTML
   * The layers panel webview will handle rendering the HTML structure
   * HTML may contain data-layers-selected marker for the currently selected element
   * 
   * @param html Full HTML document from preview (may contain data-layers-selected)
   */
  public updateTreeFromHtml(html: string) {
    if (this._view) {
      this.outputChannel.appendLine(`[LayersWebviewViewProvider] Updating tree from HTML, length: ${html.length}`);
      
      // Reveal the webview
      this._view.show?.(false); // false = don't focus
      
      // Send HTML directly to webview - it will parse and render
      // HTML contains data-layers-selected marker for the selected element
      this._view.webview.postMessage({
        type: 'updateTreeFromHtml',
        html: html
      });
    } else {
      this.outputChannel.appendLine('[LayersWebviewViewProvider] Cannot update tree - webview not ready');
    }
  }
  
  /**
   * Clear hover state
   */
  public clearHover() {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'clearHover'
      });
    }
  }
  
  /**
   * Handle messages from the webview
   */
  private _handleMessage(data: { 
    type: string; 
    tag?: string; 
    attributes?: Record<string, string>;
    selector?: string;
    cssPath?: string; // CSS path for element selection from layers
    sourceTag?: string;
    sourceAttributes?: Record<string, string>;
    sourceSelector?: string;
    sourceCssPath?: string; // CSS path for reorder source
    targetTag?: string;
    targetAttributes?: Record<string, string>;
    targetSelector?: string;
    targetCssPath?: string; // CSS path for reorder target
    position?: string;
    action?: string;
  }) {
    switch (data.type) {
      case 'webviewReady':
        // WebView is ready
        this.outputChannel.appendLine('[LayersWebviewViewProvider] WebView ready');
        break;
        
      case 'hoverElement':
        // Send directly to editor provider instead of using command
        if (this.editorProvider) {
          this.editorProvider.hoverElementFromLayer(data.cssPath);
        }
        break;
        
      case 'selectElement':
        // Send directly to editor provider instead of using command
        if (this.editorProvider) {
          // Pass cssPath directly - editorProvider will use it to select element in editor
          this.editorProvider.selectElementFromLayer(undefined as any, data.cssPath);
        }
        break;
      
      case 'moveElement':
        // Forward to editor provider for unified movement handling
        if (this.editorProvider && data.sourceCssPath && data.targetCssPath) {
          this.editorProvider.moveElementFromLayer(
            data.sourceCssPath,
            data.targetCssPath,
            data.position || 'after'
          );
        }
        break;
        
      case 'contextMenu':
        // Execute context menu action
        if (data.action && data.tag && data.attributes) {
          this._handleContextMenuAction(data.action, data.tag, data.attributes);
        }
        break;
        
      case 'clearHover':
        // Clear hover highlight in visual editor
        if (this.editorProvider) {
          this.editorProvider.hoverElementFromLayer(undefined);
        }
        break;
    }
  }
  
  /**
   * Handle context menu actions
   */
  private _handleContextMenuAction(
    action: string,
    tag: string,
    attributes: Record<string, string>
  ) {
    switch (action) {
      case 'delete':
        if (this.editorProvider) {
          this.editorProvider.deleteElement(tag, attributes);
        }
        break;
      case 'duplicate':
        if (this.editorProvider) {
          this.editorProvider.duplicateElement(tag, attributes);
        }
        break;
      case 'copy':
        if (this.editorProvider) {
          this.editorProvider.copyElement(tag, attributes);
        }
        break;
    }
  }
  
  /**
   * Clear the layers panel
   */
  clear(): void {
    // Layers are now provided by HTML from editor
  }

  /**
   * Get HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'layers-panel.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'layers-panel.css')
    );
    
    // Codicons CSS for icons
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'node_modules',
        '@vscode/codicons',
        'dist',
        'codicon.css'
      )
    );
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src ${webview.cspSource};">
  <link href="${codiconsUri}" rel="stylesheet" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Layers Panel</title>
</head>
<body>
  <div id="layers-tree" class="layers-tree"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
