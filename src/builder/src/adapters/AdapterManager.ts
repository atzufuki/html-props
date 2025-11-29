import * as path from 'path';
import { ICodeStyleAdapter } from './ICodeStyleAdapter';
import { HtmlAdapter } from './HtmlAdapter';
import { HtmlPropsAdapter } from './HtmlPropsAdapter';

/**
 * Adapter Manager
 * 
 * Central manager for code style adapters. Handles adapter registration,
 * selection, and lifecycle management.
 */
export class AdapterManager {
  private adapters: Map<string, ICodeStyleAdapter> = new Map();
  private fileAdapterCache: Map<string, ICodeStyleAdapter> = new Map();

  constructor() {
    // Register built-in adapters
    this.registerAdapter(new HtmlAdapter());
    this.registerAdapter(new HtmlPropsAdapter());
  }

  /**
   * Register a code style adapter (built-in or user-defined)
   * @param adapter Adapter to register
   */
  registerAdapter(adapter: ICodeStyleAdapter): void {
    this.adapters.set(adapter.id, adapter);
    // Clear cache when new adapter is registered
    this.fileAdapterCache.clear();
  }
  
  /**
   * Register a user-defined adapter from extension
   * User adapters can override built-in ones if priority is higher
   * 
   * @param adapter User-defined adapter
   */
  registerUserAdapter(adapter: ICodeStyleAdapter): void {
    const existing = this.adapters.get(adapter.id);
    const newPriority = adapter.priority || 0;
    const existingPriority = existing?.priority || 0;
    
    if (!existing || newPriority > existingPriority) {
      this.adapters.set(adapter.id, adapter);
      // Clear cache when adapter is registered/updated
      this.fileAdapterCache.clear();
    }
  }

  /**
   * Get adapter for a file
   * When multiple adapters match the same extension, prefer higher priority
   * 
   * @param filePath Path to file
   * @returns Matching adapter or null
   */
  async getAdapter(filePath: string): Promise<ICodeStyleAdapter | null> {
    // Check cache first
    if (this.fileAdapterCache.has(filePath)) {
      return this.fileAdapterCache.get(filePath)!;
    }

    // Detect by extension, prefer higher priority
    const ext = path.extname(filePath).toLowerCase();
    let bestAdapter: ICodeStyleAdapter | null = null;
    let bestPriority = -1;
    
    for (const adapter of this.adapters.values()) {
      if (adapter.fileExtensions.includes(ext)) {
        const priority = adapter.priority || 0;
        if (priority > bestPriority) {
          bestAdapter = adapter;
          bestPriority = priority;
        }
      }
    }
    
    // Cache the result
    if (bestAdapter) {
      this.fileAdapterCache.set(filePath, bestAdapter);
    }

    return bestAdapter;
  }

  /**
   * Get adapter by ID
   * @param id Adapter ID
   * @returns Adapter or null
   */
  getAdapterById(id: string): ICodeStyleAdapter | null {
    return this.adapters.get(id) || null;
  }

  /**
   * Get all registered adapters
   * @returns Array of all adapters
   */
  getAllAdapters(): ICodeStyleAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * Get user-defined adapters only
   * (Adapters with priority > 0)
   * 
   * @returns Array of user-defined adapters
   */
  getUserAdapters(): ICodeStyleAdapter[] {
    return Array.from(this.adapters.values())
      .filter(adapter => (adapter.priority || 0) > 0);
  }
  
  /**
   * Get built-in adapters only
   * (Adapters with priority <= 0)
   * 
   * @returns Array of built-in adapters
   */
  getBuiltinAdapters(): ICodeStyleAdapter[] {
    return Array.from(this.adapters.values())
      .filter(adapter => (adapter.priority || 0) <= 0);
  }

  /**
   * Detect code style from file content (fallback if extension-based fails)
   * Tries all adapters with validate() and picks highest priority match
   * 
   * @param code Source code to analyze
   * @returns Matching adapter or null
   */
  async detectCodeStyle(code: string): Promise<ICodeStyleAdapter | null> {
    const validAdapters: Array<{ adapter: ICodeStyleAdapter; priority: number }> = [];
    
    // Test all adapters
    for (const adapter of this.adapters.values()) {
      const result = await adapter.validate(code);
      if (result.valid) {
        validAdapters.push({
          adapter,
          priority: adapter.priority || 0
        });
      }
    }
    
    // Return highest priority match
    if (validAdapters.length === 0) {
      return null;
    }
    
    validAdapters.sort((a, b) => b.priority - a.priority);
    return validAdapters[0].adapter;
  }
  
  /**
   * Clear adapter cache
   * Call this when adapters are added/removed/updated
   */
  clearCache(): void {
    this.fileAdapterCache.clear();
  }
  
  /**
   * Unregister an adapter
   * @param id Adapter ID to remove
   * @returns True if adapter was removed, false if not found
   */
  unregisterAdapter(id: string): boolean {
    const removed = this.adapters.delete(id);
    if (removed) {
      this.clearCache();
    }
    return removed;
  }
}
