import * as vscode from 'vscode';
import { ResourcesWebviewViewProvider } from './views/ResourcesWebviewViewProvider';
import { LayersWebviewViewProvider } from './views/LayersWebviewViewProvider';
import { ElementProperty, PropertiesWebviewViewProvider } from './views/PropertiesWebviewViewProvider';
import { WebBuilderEditorProvider } from './editors/WebBuilderEditorProvider';

import { HtmlDropEditProvider } from './providers/HtmlDropEditProvider';
import { AttributeRegistry } from './services/AttributeRegistry';
import { CustomElementScanner } from './services/CustomElementScanner';
import { AdapterManager } from './adapters';
import { CreateResourceCommand } from './commands/CreateResourceCommand';
import { DevServer } from './services/DevServer';
import { ElementData, InsertElementData, LayerData } from './types/interfaces';

// Output channel for diagnostic information
const outputChannel = vscode.window.createOutputChannel('HTML Props Builder');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  outputChannel.appendLine('HTML Props Builder extension is now active!');
  context.subscriptions.push(outputChannel);

  // Initialize Code Style Adapter Manager
  const adapterManager = new AdapterManager();
  outputChannel.appendLine(
    `Registered adapters: ${adapterManager.getAllAdapters().map((a) => a.id).join(', ')}`,
  );

  // Start development server for component bundling
  const devServer = new DevServer();
  context.subscriptions.push(devServer);
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    try {
      await devServer.start(workspaceFolder, outputChannel);
      outputChannel.appendLine(`DevServer started on ${devServer.getUrl()}`);

      // Set DevServer on all adapters that support it
      for (const adapter of adapterManager.getAllAdapters()) {
        if (typeof (adapter as any).setDevServer === 'function') {
          (adapter as any).setDevServer(devServer);
          outputChannel.appendLine(`DevServer set on adapter: ${adapter.id}`);
        }
      }
    } catch (err) {
      outputChannel.appendLine(
        `Failed to start DevServer: ${(err as Error).message}`,
      );
    }
  }

  // Track the document URI that was opened in visual editor
  let visualEditorDocument: vscode.Uri | undefined;
  let isWebBuilderVisible = false;

  // Check configuration to determine which panel types to use
  const config = vscode.workspace.getConfiguration('webBuilder');
  const useTreeViewPanels = config.get<boolean>('useTreeViewPanels', false);

  // Create Resources panel provider with custom element scanner (WebView-based)
  const customElementScanner = new CustomElementScanner();

  // Initialize custom element scanner with configuration
  const customElementConfig = vscode.workspace.getConfiguration('webBuilder');
  const resourceDirectories = customElementConfig.get<
    Array<{ name: string; path: string }>
  >('resourceDirectories', []);

  if (resourceDirectories.length > 0) {
    outputChannel.appendLine(
      `[Extension] Initializing custom element scanner with ${resourceDirectories.length} directories`,
    );
    await customElementScanner.initialize(resourceDirectories);

    // Register all custom elements with AttributeRegistry
    const allCustomElements: any[] = [];
    for (const dirName of customElementScanner.getDirectoryNames()) {
      const elements = customElementScanner.getElements(dirName);
      outputChannel.appendLine(
        `[Extension] Found ${elements.length} elements in ${dirName}`,
      );
      allCustomElements.push(...elements);
    }

    outputChannel.appendLine(
      `[Extension] Total custom elements found: ${allCustomElements.length}`,
    );
    AttributeRegistry.registerCustomElements(allCustomElements);
  }

  // Create Resources panel provider (WebView-based)
  const resourcesWebviewProvider = new ResourcesWebviewViewProvider(
    context.extensionUri,
    adapterManager,
    outputChannel,
    customElementScanner,
  );

  if (resourcesWebviewProvider) {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'webBuilder.resourcesWebview',
        resourcesWebviewProvider,
      ),
      resourcesWebviewProvider,
    );
  }

  // For TreeView panels (if configured), create a separate provider
  let elementsTreeView: vscode.TreeView<any> | undefined;
  if (useTreeViewPanels) {
    // TODO: Implement TreeView-based elements provider if needed
    outputChannel.appendLine(
      '[WARNING] TreeView-based elements panel not yet implemented in refactored architecture',
    );
  }

  /**
   * Handle visibility changes for HTML Props Builder sidebar
   */
  const handleVisibilityChange = async (e: { visible: boolean }) => {
    const wasVisible = isWebBuilderVisible;
    isWebBuilderVisible = e.visible;

    if (!e.visible || wasVisible) {
      // Closing HTML Props Builder sidebar or already was visible
      if (!e.visible && wasVisible && visualEditorDocument) {
        const docUri = visualEditorDocument;
        visualEditorDocument = undefined;

        // Wait for tabs to settle, then check if visual editor is open
        setTimeout(async () => {
          const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
          const visualEditorTab = tabs.find((tab) =>
            tab.input instanceof vscode.TabInputCustom &&
            tab.input.viewType === WebBuilderEditorProvider.viewType &&
            tab.input.uri.toString() === docUri.toString()
          );

          if (visualEditorTab) {
            await vscode.window.tabGroups.close(visualEditorTab);
            await vscode.commands.executeCommand('vscode.open', docUri);
          }
        }, 100);
      }
      return;
    }

    // Opening HTML Props Builder sidebar - open active HTML/TypeScript file in visual mode
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.scheme === 'file') {
      const languageId = activeEditor.document.languageId;
      const adapter = await adapterManager.getAdapter(
        activeEditor.document.uri.fsPath,
      );

      // Open in visual editor if we have an adapter for this file type
      if (adapter && (languageId === 'html' || languageId === 'typescript')) {
        const document = activeEditor.document;
        visualEditorDocument = document.uri;
        await vscode.commands.executeCommand(
          'workbench.action.closeActiveEditor',
        );
        await vscode.commands.executeCommand(
          'vscode.openWith',
          document.uri,
          WebBuilderEditorProvider.viewType,
        );
      }
    }
  };

  // Auto-open/close visual editor when HTML Props Builder sidebar visibility changes
  const visibilityProvider = resourcesWebviewProvider || elementsTreeView;
  if (visibilityProvider) {
    context.subscriptions.push(
      visibilityProvider.onDidChangeVisibility(handleVisibilityChange),
    );
  }

  // Register Layers panel (WebView)
  const layersWebviewProvider = new LayersWebviewViewProvider(
    context.extensionUri,
    outputChannel,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'html-props-builder-layers',
      layersWebviewProvider,
    ),
  );

  // Register properties panel (WebView only)
  const propertiesWebviewProvider = new PropertiesWebviewViewProvider(
    context.extensionUri,
    outputChannel,
  );
  propertiesWebviewProvider.setCustomElementScanner(customElementScanner);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'webBuilder.propertiesWebview',
      propertiesWebviewProvider,
    ),
  );

  // Register document drop edit provider for code files (HTML, JSX, etc.)
  const dropProvider = new HtmlDropEditProvider(adapterManager);
  const dropRegistration = vscode.languages.registerDocumentDropEditProvider(
    // Support all file types that have adapters
    [{ language: 'html' }, { language: 'javascript' }, {
      language: 'typescript',
    }],
    dropProvider,
  );

  // Register visual HTML editor
  const editorProvider = new WebBuilderEditorProvider(
    context,
    adapterManager,
    devServer,
    customElementScanner,
  );
  editorProvider.setLayersWebviewProvider(layersWebviewProvider);
  editorProvider.setPropertiesWebviewProvider(propertiesWebviewProvider);

  // Set editor provider on layers panel for direct communication
  layersWebviewProvider.setEditorProvider(editorProvider);

  // Set adapter manager on properties panel so it can get adapters for each file
  propertiesWebviewProvider.setAdapterManager(adapterManager);

  // Give properties panel access to editor provider for updating properties
  propertiesWebviewProvider.setEditorProvider(editorProvider);

  const editorRegistration = vscode.window.registerCustomEditorProvider(
    WebBuilderEditorProvider.viewType,
    editorProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  );

  // Register refresh command
  const refreshCommand = vscode.commands.registerCommand(
    'html-props-builder.refreshElements',
    () => {
      resourcesWebviewProvider.getBuiltinElements(); // Trigger refresh
      vscode.window.showInformationMessage('Elements refreshed!');
    },
  );

  // Register command to open a page
  const openPageCommand = vscode.commands.registerCommand(
    'html-props-builder.openPage',
    async (filePath: string) => {
      try {
        const fileUri = vscode.Uri.file(filePath);
        await vscode.commands.executeCommand(
          'vscode.openWith',
          fileUri,
          WebBuilderEditorProvider.viewType,
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error opening page: ${(error as Error).message}`,
        );
      }
    },
  );

  // Register command to insert element
  const insertElementCommand = vscode.commands.registerCommand(
    'html-props-builder.insertElement',
    async (elementData: InsertElementData) => {
      const activeEditor = vscode.window.activeTextEditor;

      if (activeEditor && activeEditor.document.languageId === 'html') {
        // Insert into text editor at cursor position
        const position = activeEditor.selection.active;
        const line = activeEditor.document.lineAt(position.line);
        const indent = line.text.match(/^\s*/)?.[0] || '';

        let snippet = '';
        const tag = elementData.tag;

        // Generate snippet
        if (tag === 'img') {
          snippet = `${indent}<img src="" alt="">`;
        } else if (tag === 'input') {
          snippet = `${indent}<input type="text">`;
        } else if (tag === 'a') {
          snippet = `${indent}<a href="">Link text</a>`;
        } else if (
          ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button'].includes(tag)
        ) {
          const placeholders: Record<string, string> = {
            'h1': 'Heading 1',
            'h2': 'Heading 2',
            'h3': 'Heading 3',
            'p': 'Paragraph text',
            'button': 'Button',
          };
          snippet = `${indent}<${tag}>${placeholders[tag] || 'Text'}</${tag}>`;
        } else {
          snippet = `${indent}<${tag}>\n${indent}\t\n${indent}</${tag}>`;
        }

        await activeEditor.edit((editBuilder) => {
          editBuilder.insert(position, snippet + '\n');
        });
      }
      // Note: Element insertion into visual editor is not yet implemented
      // Elements can be added via drag-drop from Elements panel instead
    },
  );

  // Set editor provider for elements panel direct calls
  resourcesWebviewProvider.setEditorProvider(editorProvider);

  // Register command to edit property
  const editPropertyCommand = vscode.commands.registerCommand(
    'html-props-builder.editProperty',
    async (property: ElementProperty) => {
      const selectedTag = propertiesWebviewProvider.getSelectedElementTag();
      if (!selectedTag) {
        return;
      }

      // Type-aware editing based on property type information from adapter
      let newValue: string | undefined;

      switch (property.attrType) {
        case 'boolean':
          // Use QuickPick for boolean properties
          const boolChoice = await vscode.window.showQuickPick(
            [
              { label: 'true', description: 'Enable this property' },
              { label: 'false', description: 'Disable this property' },
            ],
            {
              placeHolder: `Select value for ${property.name}`,
              title: property.description,
            },
          );
          if (boolChoice) {
            newValue = boolChoice.label;
          }
          break;

        case 'enum':
          // Use QuickPick for enum properties
          if (property.enumValues && property.enumValues.length > 0) {
            const items: { label: string; description?: string }[] = [
              ...property.enumValues.map((val: string) => ({
                label: val,
                description: undefined as string | undefined,
              })),
            ];

            // Add option to remove property (if not required)
            if (property.isSet) {
              items.push({
                label: '',
                description: '(remove property)',
              });
            }

            const enumChoice = await vscode.window.showQuickPick(
              items,
              {
                placeHolder: `Select ${property.name}`,
                title: property.description,
              },
            );
            if (enumChoice !== undefined) {
              newValue = enumChoice.label;
            }
          }
          break;

        case 'number':
          // Use InputBox with validation for number properties
          newValue = await vscode.window.showInputBox({
            prompt: `Edit ${property.name}`,
            value: property.isSet ? property.value : '',
            placeHolder: 'Enter a number',
            title: property.description,
            validateInput: (value) => {
              if (value === '') {
                return null; // Allow empty to unset
              }
              const num = Number(value);
              if (isNaN(num)) {
                return 'Must be a valid number';
              }
              return null;
            },
          });
          break;

        case 'url':
          // Use InputBox for URL properties
          newValue = await vscode.window.showInputBox({
            prompt: `Edit ${property.name}`,
            value: property.isSet ? property.value : '',
            placeHolder: 'Enter URL (e.g., https://example.com)',
            title: property.description,
            validateInput: (value) => {
              if (value === '') {
                return null; // Allow empty to unset
              }
              // Basic URL validation
              if (!value.match(/^(https?:\/\/|\/|\.\/|#)/)) {
                return 'URL should start with http://, https://, /, ./, or #';
              }
              return null;
            },
          });
          break;

        case 'string':
        default:
          // Use InputBox for string properties
          newValue = await vscode.window.showInputBox({
            prompt: `Edit ${property.name}`,
            value: property.isSet ? property.value : '',
            placeHolder: `Enter value for ${property.name}`,
            title: property.description,
          });
          break;
      }

      // Update property if value changed
      if (newValue !== undefined && newValue !== property.value) {
        // TODO: updateElementProperty not implemented in refactored EditorWebviewViewProvider
        // visualEditorProvider.updateElementProperty(property.name, newValue, property.type);
        vscode.window.showInformationMessage(
          'Property editing not yet implemented in refactored backend',
        );
      }
    },
  );

  // TODO: Register command to duplicate element from layers panel
  // Commented out - duplicateElementFromLayer() not implemented in refactored EditorWebviewViewProvider
  // const duplicateLayerElementCommand = vscode.commands.registerCommand('html-props-builder.duplicateLayerElement', async (layer: LayerData) => {
  //   if (!layer) {
  //     return;
  //   }
  //   visualEditorProvider.duplicateElementFromLayer(layer);
  // });

  // TODO: Register command to copy element from layers panel
  // Commented out - copyElementFromLayer() not implemented in refactored EditorWebviewViewProvider
  // const copyLayerElementCommand = vscode.commands.registerCommand('html-props-builder.copyLayerElement', async (layer: LayerData) => {
  //   if (!layer) {
  //     return;
  //   }
  //   visualEditorProvider.copyElementFromLayer(layer);
  // });

  // Commands for WebView integration
  // TODO: Commented out - highlightElementFromLayer() not implemented in refactored EditorWebviewViewProvider
  // const highlightElementFromLayerCommand = vscode.commands.registerCommand('webBuilder.highlightElementFromLayer', (data: { tag: string, attributes: Record<string, string>, selector?: string }) => {
  //   const layer = layersProvider.selectLayerByElement(data.tag, data.attributes);
  //   if (layer) {
  //     visualEditorProvider.highlightElementFromLayer(layer, data.selector);
  //   }
  // });

  // selectElementFromLayer command removed - layers-panel now sends selectElement message directly

  // TODO: Commented out - highlightElementFromLayer() not implemented
  // const clearHoverHighlightCommand = vscode.commands.registerCommand('webBuilder.clearHoverHighlight', () => {
  //   visualEditorProvider.highlightElementFromLayer(null);
  // });

  // deleteElementCommand removed - deleteElementFromLayer() requires LayerData which is no longer used

  // TODO: Commented out - duplicateElementFromLayer() not implemented
  // const duplicateElementCommand = vscode.commands.registerCommand('webBuilder.duplicateElement', (data: { tag: string, attributes: Record<string, string> }) => {
  //   const layer = layersProvider.selectLayerByElement(data.tag, data.attributes);
  //   if (layer) {
  //     visualEditorProvider.duplicateElementFromLayer(layer);
  //   }
  // });

  // TODO: Commented out - copyElementFromLayer() not implemented
  // const copyElementCommand = vscode.commands.registerCommand('webBuilder.copyElement', (data: { tag: string, attributes: Record<string, string> }) => {
  //   const layer = layersProvider.selectLayerByElement(data.tag, data.attributes);
  //   if (layer) {
  //     visualEditorProvider.copyElementFromLayer(layer);
  //   }
  // });

  // TODO: Commented out - moveElement() not implemented in refactored EditorWebviewViewProvider
  // const moveElementCommand = vscode.commands.registerCommand('webBuilder.moveElement', (data: {
  //   sourceTag: string,
  //   sourceAttributes: Record<string, string>,
  //   sourceSelector?: string,
  //   targetTag: string,
  //   targetAttributes: Record<string, string>,
  //   targetSelector?: string,
  //   position: string
  // }) => {
  //   visualEditorProvider.moveElement(
  //     data.sourceTag,
  //     data.sourceAttributes,
  //     data.targetTag,
  //     data.targetAttributes,
  //     data.position,
  //     data.sourceSelector,
  //     data.targetSelector
  //   );
  // });

  // TODO: Command to update property from WebView-based properties panel
  // Commented out - updateElementProperty() not implemented in refactored EditorWebviewViewProvider
  // const updatePropertyCommand = vscode.commands.registerCommand('webBuilder.updateProperty', (data: {
  //   name: string,
  //   value: string,
  //   propertyType: string,
  //   selector?: string
  // }) => {
  //   visualEditorProvider.updateElementProperty(data.name, data.value, data.propertyType, data.selector);
  // });

  // Command to create a custom web component
  const createResourceCommand = vscode.commands.registerCommand(
    'webBuilder.createResource',
    async () => {
      const command = new CreateResourceCommand(customElementScanner);
      await command.execute();
    },
  );

  // Alias for create resource (for Elements panel button)
  const createResourceAlias = vscode.commands.registerCommand(
    'html-props-builder.createResource',
    async () => {
      const command = new CreateResourceCommand(customElementScanner);
      await command.execute();
    },
  );

  // Command to create resource in specific category directory
  const createResourceInCategoryCommand = vscode.commands.registerCommand(
    'html-props-builder.createResourceInCategory',
    async (categoryPath: string) => {
      const command = new CreateResourceCommand(customElementScanner);
      await command.execute(categoryPath);
    },
  );

  // Add disposables to subscriptions
  if (elementsTreeView) {
    context.subscriptions.push(elementsTreeView);
  }

  context.subscriptions.push(
    dropRegistration,
    editorRegistration,
    refreshCommand,
    openPageCommand,
    insertElementCommand,
    editPropertyCommand,
    createResourceCommand,
    createResourceAlias,
    createResourceInCategoryCommand,
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Note: DevServer cleanup handled automatically via context.subscriptions
}
