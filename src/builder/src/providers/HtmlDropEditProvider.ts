import * as vscode from 'vscode';
import { CustomElement } from '../services/CustomElementScanner';
import { AdapterManager, ICodeStyleAdapter, ElementDefinition } from '../adapters';

/**
 * Type guard for ElementDefinition
 */
function isElementDefinition(item: any): item is ElementDefinition {
  return 'tag' in item && ('description' in item || 'displayName' in item) && !('filePath' in item);
}

/**
 * Type guard for CustomElement
 */
function isCustomElement(item: any): item is CustomElement {
  return 'filePath' in item && 'tag' in item;
}

/**
 * Document drop edit provider for code files (HTML, JSX, etc.)
 * Uses Code Style Adapters to generate appropriate snippets
 */
export class CodeDropEditProvider implements vscode.DocumentDropEditProvider {
  private adapterManager: AdapterManager;
  
  constructor(adapterManager: AdapterManager) {
    this.adapterManager = adapterManager;
  }
  /**
   * Provide drop edits for code documents using adapter
   */
  async provideDocumentDropEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentDropEdit | undefined> {
    
    // Get appropriate adapter for this document
    const adapter = await this.adapterManager.getAdapter(document.uri.fsPath);
    if (!adapter) {
      console.warn('No adapter found for', document.uri.fsPath);
      return undefined;
    }
    
    // Check if we have element data
    const elementData = dataTransfer.get('application/vnd.code.tree.webBuilderElements');
    if (!elementData) {
      return undefined;
    }

    // Parse the dropped elements
    const elements = elementData.value as Array<ElementDefinition | CustomElement>;
    if (!elements || elements.length === 0) {
      return undefined;
    }

    // Get indentation at drop position
    const line = document.lineAt(position.line);
    const lineText = line.text;
    const leadingWhitespace = lineText.match(/^\s*/)?.[0] || '';
    
    // Determine if we should add extra indentation
    let indentation = leadingWhitespace;
    
    if (lineText.trim() === '' && position.line > 0) {
      // Empty line - check previous line
      const prevLine = document.lineAt(position.line - 1);
      const prevText = prevLine.text;
      const prevIndent = prevText.match(/^\s*/)?.[0] || '';
      
      // If previous line opens a tag, add one level of indentation
      if (prevText.trim().match(/<[^/][^>]*>$/)) {
        indentation = prevIndent + '\t';
      } else {
        indentation = prevIndent;
      }
    }

    // Generate code snippets for all dropped elements using adapter
    const snippetPromises = elements
      .filter(el => isElementDefinition(el) || isCustomElement(el))
      .map(async el => {
        try {
          const element = el as CustomElement | ElementDefinition;
          const tag = element.tag;
          const attrs = 'defaultAttributes' in element ? element.defaultAttributes : undefined;
          
          // Generate snippet using adapter
          const snippet = await adapter.generateSnippet(tag, attrs, undefined);
          
          // Add indentation to each line
          return snippet.split('\n').map((line, i) => 
            i === 0 ? indentation + line : indentation + line
          ).join('\n');
        } catch (error) {
          console.error('Failed to generate snippet:', error);
          // Fallback: check if element has tag property
          const elementTag = (el && typeof el === 'object' && 'tag' in el) ? (el as { tag: string }).tag : 'div';
          return `${indentation}<${elementTag}></${elementTag}>`;
        }
      });
    
    const snippets = await Promise.all(snippetPromises);
    
    if (snippets.length === 0) {
      return undefined;
    }

    // Join with newlines and create snippet string
    const snippetString = new vscode.SnippetString(snippets.join('\n'));
    
    // Create the edit
    const edit = new vscode.DocumentDropEdit(snippetString);
    edit.title = `Insert ${elements.length} element${elements.length > 1 ? 's' : ''}`;
    
    return edit;
  }
}

// Backward compatibility export
export { CodeDropEditProvider as HtmlDropEditProvider };
