import * as vscode from 'vscode';
import { CustomElementScanner } from '../services/CustomElementScanner';
import { AdapterManager } from '../adapters';

/**
 * Property category for grouping attributes
 */
export interface PropertyCategory {
  id: string;
  label: string;
  description?: string;
  properties: ElementProperty[];
}

/**
 * Element property definition
 */
export interface ElementProperty {
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
}

/**
 * WebView-based Properties Panel provider with rich editors
 */
export class PropertiesWebviewViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'webBuilder.propertiesWebview';
  
  private _view?: vscode.WebviewView;
  private categories: PropertyCategory[] = [];
  private selectedElementTag: string | null = null;
  private editorProvider?: any; // WebBuilderEditorProvider
  private adapterManager?: AdapterManager;
  private customElementScanner?: CustomElementScanner;
  private currentAdapter?: any; // ICodeStyleAdapter
  private currentFilePath?: string; // Track which file is currently open
  private currentElementData: {
    tag: string;
    attributes: Record<string, string>;
    properties?: Record<string, unknown>;
    textContent?: string;
    selector?: string;
    selectorFormat?: 'css' | 'ast' | 'path' | 'custom';
  } | null = null;
  
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly outputChannel: vscode.OutputChannel
  ) {}

  /**
   * Set the custom element scanner for accessing custom element attributes
   */
  public setCustomElementScanner(scanner: CustomElementScanner): void {
    this.customElementScanner = scanner;
  }

  /**
   * Set the adapter manager for getting adapters by file path
   */
  public setAdapterManager(adapterManager: AdapterManager): void {
    this.adapterManager = adapterManager;
  }

  /**
   * Set the current adapter for parsing HTML and getting element metadata
   */
  public setCurrentAdapter(adapter: any): void {
    this.currentAdapter = adapter;
  }

  /**
   * Set the current file path being edited
   */
  public setCurrentFilePath(filePath: string): void {
    this.currentFilePath = filePath;
  }

  /**
   * Set the editor provider for handling property updates
   */
  public setEditorProvider(editorProvider: any): void {
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
  }
  
  /**
   * Update properties from preview HTML
   * Called by editor provider when element is selected
   * Parses HTML and finds selected element using data-layers-selected attribute
   * 
   * @param previewHtml Full preview HTML document
   * @param properties Runtime property values from preview DOM
   */
  public async updatePropertiesFromHtml(
    previewHtml: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    if (!previewHtml) {
      this._sendPropertiesToWebview([], null);
      return;
    }

    // Send HTML to properties panel webview which will parse it
    // and find the selected element
    if (this._view) {
      this._view.webview.postMessage({
        type: 'updatePropertiesFromHtml',
        html: previewHtml,
        properties: properties
      });
    }
  }
  
  /**
   * Handle element selected from preview
   * Processes the selector and updates property categories
   */
  public async handleElementSelected(
    previewHtml: string,
    elementSelector: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    if (!previewHtml || !this.currentAdapter) {
      this._sendPropertiesToWebview([], null);
      return;
    }

    try {
      // Parse preview HTML
      const ast = await this.currentAdapter.parsePreview(previewHtml);
      
      // Get element metadata for the selected element
      const elementMetadata = await this.currentAdapter.getElementMetadata?.(ast, elementSelector);

      if (elementMetadata) {
        // Update with element data
        await this.updateElement({
          tag: elementMetadata.tag,
          attributes: elementMetadata.attributes,
          properties: properties,
          textContent: elementMetadata.textContent,
          selector: elementSelector
        });
      } else {
        // Clear properties if no element found
        this.clear();
      }
    } catch (error) {
      this.clear();
    }
  }

  /**
   * Find selected element selector from HTML by data-layers-selected attribute
   * Returns null if no selected element found
   */

  /**
   * Update element data
   * Delegates to adapter for building property categories
   */
  public async updateElement(elementData: {
    tag: string;
    attributes: Record<string, string>;
    properties?: Record<string, unknown>;
    textContent?: string;
    selector?: string;
  } | null): Promise<void> {
    if (!elementData || !this.currentAdapter) {
      this._sendPropertiesToWebview([], null);
      return;
    }

    this.currentElementData = elementData;
    this.selectedElementTag = elementData.tag;

    try {
      // Delegate to adapter for building categories
      let categories: any[] = [];
      if (this.currentAdapter.buildPropertyCategories) {
        categories = await this.currentAdapter.buildPropertyCategories(
          elementData.tag,
          elementData.attributes,
          elementData.properties,
          elementData.textContent,
          undefined,
          this.currentFilePath
        );
      }

      this._sendPropertiesToWebview(categories, elementData.selector || elementData.tag);
    } catch (error) {
      this._sendPropertiesToWebview([], null);
    }
  }

  /**
   * Send categories to webview
   */
  private _sendPropertiesToWebview(categories: PropertyCategory[], selector: string | null = null): void {
    if (!this._view) {
      return;
    }

    this._view.webview.postMessage({
      type: 'updateProperties',
      categories: categories,
      selector: selector
    });
  }
  
  /**
   * Clear properties panel
   */
  public clear(): void {
    this._sendPropertiesToWebview([]);
  }

  /**
   * Get selected element tag
   */
  public getSelectedElementTag(): string | null {
    return this.selectedElementTag;
  }

  /**
   * Handle messages from webview
   */
  private _handleMessage(data: any): void {
    
    switch (data.type || data.command) {
      case 'elementSelected':
        // Element selected in properties panel webview
        // Webview has parsed HTML and found selected element
        if (data.html && data.selector) {
          this.handleElementSelected(data.html, data.selector, data.properties);
        }
        break;

      case 'updateProperty':
        // Forward to editor provider to handle property update
        if (this.editorProvider && data.name && data.selector) {
          this.editorProvider.updatePropertyInPreview(
            data.selector,
            data.name,
            data.value
          );
        }
        break;
    }
  }

  /**
   * Get HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'properties-panel.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'properties-panel.css')
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
  <title>Properties Panel</title>
</head>
<body>
  <div class="properties-panel">
    <div id="properties-container" class="properties-container"></div>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Render input element based on property type
   */
  private _renderPropertyInput(prop: ElementProperty): string {
    // Read-only values (like tag, natural dimensions)
    if (!prop.editable || prop.type === 'tag') {
      return `<div class="property-value">${prop.value || '(empty)'}</div>`;
    }

    const type = prop.attrType || 'string';
    const value = prop.value || '';

    // Boolean toggle
    if (type === 'boolean') {
      const isChecked = String(value) === 'true';
      return `
        <div class="toggle-switch${isChecked ? ' active' : ''}" data-property-name="${prop.name}" data-toggle="true">
          <div class="toggle-knob"></div>
        </div>`;
    }

    // Enum select dropdown
    if (type === 'enum' && prop.enumValues?.length) {
      const options = prop.enumValues
        .map((opt: string) => `<option value="${opt}"${value === opt ? ' selected' : ''}>${opt}</option>`)
        .join('');
      return `
        <select class="property-input" data-property-name="${prop.name}" data-type="enum">
          <option value="">(none)</option>
          ${options}
        </select>`;
    }

    // Number input
    if (type === 'number') {
      return `<input 
        type="number" 
        class="property-input" 
        value="${value}" 
        data-property-name="${prop.name}"
        data-type="number"
      />`;
    }

    // Color input
    if (type === 'color') {
      return `
        <div class="color-input-group">
          <input 
            type="color" 
            class="color-swatch" 
            value="${value || '#000000'}" 
            data-property-name="${prop.name}"
            data-type="color"
          />
          <input 
            type="text" 
            class="property-input" 
            value="${value}" 
            placeholder="e.g., #FF0000 or red"
            data-property-name="${prop.name}"
            data-type="color"
          />
        </div>`;
    }

    // URL input
    if (type === 'url') {
      return `<input 
        type="url" 
        class="property-input" 
        value="${value}" 
        placeholder="https://example.com"
        data-property-name="${prop.name}"
        data-type="url"
      />`;
    }

    // Default: text input
    return `<input 
      type="text" 
      class="property-input" 
      value="${value}" 
      placeholder="Enter value"
      data-property-name="${prop.name}"
      data-type="string"
    />`;
  }

  /**
   * Dispose
   */
  public dispose(): void {
    // Cleanup if needed
  }
}

