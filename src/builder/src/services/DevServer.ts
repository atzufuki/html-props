import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as esbuild from 'esbuild';

/**
 * Development server for serving HTML files and bundling TypeScript components
 * 
 * Features:
 * - Static file serving with proper CORS
 * - On-the-fly TypeScript bundling with esbuild
 * - Component dependency resolution
 * - Bundle caching for performance
 */
export class DevServer implements vscode.Disposable {
  private server?: http.Server;
  private port?: number;
  private workspaceRoot?: string;
  private bundleCache: Map<string, { code: string; timestamp: number }> = new Map();
  private documentCache: Map<string, string> = new Map(); // In-memory document content
  private outputChannel?: vscode.OutputChannel;

  /**
   * Start the development server
   */
  public async start(workspaceFolder: vscode.WorkspaceFolder, outputChannel?: vscode.OutputChannel): Promise<number> {
    if (this.server) {
      return this.port!;
    }

    this.workspaceRoot = workspaceFolder.uri.fsPath;
    this.outputChannel = outputChannel;

    return new Promise((resolve, reject) => {
      // Create HTTP server
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // Listen on random available port
      this.server.listen(0, 'localhost', () => {
        const address = this.server!.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          this.log(`DevServer started on http://localhost:${this.port}`);
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      this.server.on('error', (err) => {
        this.log(`DevServer error: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Stop the development server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.log('DevServer stopped');
          this.server = undefined;
          this.port = undefined;
          this.bundleCache.clear();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the server URL
   */
  public getUrl(): string | undefined {
    return this.port ? `http://localhost:${this.port}` : undefined;
  }

  /**
   * Get component URL for loading in webview
   */
  public getComponentUrl(filePath: string): string {
    if (!this.port) {
      throw new Error('DevServer not started');
    }
    const encoded = encodeURIComponent(filePath);
    return `http://localhost:${this.port}/component?file=${encoded}`;
  }

  /**
   * Get import map for browser (converts jsr: to esm.sh URLs)
   */
  public getImportMap(): Record<string, string> {
    const importMap = this.loadDenoImportMap();
    if (!importMap) {
      return {};
    }

    // Convert jsr: URLs to esm.sh URLs for browser compatibility
    const browserImportMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(importMap)) {
      if (value.startsWith('jsr:')) {
        // Convert jsr:@scope/package@version to https://esm.sh/jsr/@scope/package@version
        const jsrPath = value.substring(4); // Remove 'jsr:'
        browserImportMap[key] = `https://esm.sh/jsr/${jsrPath}`;
      } else if (value.startsWith('npm:')) {
        // Convert npm:package@version to https://esm.sh/package@version
        const npmPath = value.substring(4); // Remove 'npm:'
        browserImportMap[key] = `https://esm.sh/${npmPath}`;
      } else {
        browserImportMap[key] = value;
      }
    }

    return browserImportMap;
  }

  /**
   * Set in-memory document content (for unsaved changes)
   */
  public setDocumentContent(filePath: string, content: string): void {
    this.documentCache.set(filePath, content);
    // Clear bundle cache for this file to force rebuild
    this.bundleCache.delete(filePath);
    this.log(`Set in-memory content for: ${filePath}`);
  }

  /**
   * Clear in-memory document content
   */
  public clearDocumentContent(filePath?: string): void {
    if (filePath) {
      this.documentCache.delete(filePath);
      this.log(`Cleared in-memory content for: ${filePath}`);
    } else {
      this.documentCache.clear();
      this.log('Cleared all in-memory content');
    }
  }

  /**
   * Clear bundle cache (force rebuild)
   */
  public clearCache(filePath?: string): void {
    if (filePath) {
      this.bundleCache.delete(filePath);
      this.log(`Cleared cache for: ${filePath}`);
    } else {
      this.bundleCache.clear();
      this.log('Cleared all bundle cache');
    }
  }

  /**
   * Dispose (cleanup on extension deactivation)
   */
  public dispose(): void {
    this.stop();
  }

  /**
   * Handle HTTP request
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    if (!this.workspaceRoot || !req.url) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // CORS headers for webview
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Handle preview HTML request (renders component to HTML)
    if (url.pathname === '/preview') {
      this.handlePreviewRequest(url.searchParams, res);
      return;
    }
    
    // Handle pre-bundled bundle request
    if (url.pathname === '/bundle') {
      this.handleBundleRequest(url.searchParams, res);
      return;
    }
    
    // Handle component bundling endpoint
    if (url.pathname === '/component') {
      this.handleComponentRequest(url.searchParams, res);
      return;
    }

    // Handle static file serving
    this.handleStaticFile(url, res);
  }

  /**
   * Handle component preview HTML request
   * Returns rendered HTML that includes the component tag and loads the component bundle
   */
  private handlePreviewRequest(params: URLSearchParams, res: http.ServerResponse): void {
    const filePath = params.get('file');

    this.log(`[Preview Request] Received request for: ${filePath}`);

    if (!filePath) {
      this.log(`[Preview Request] ERROR: Missing file parameter`);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing file parameter');
      return;
    }

    try {
      const devServerUrl = this.getUrl();
      if (!devServerUrl) {
        throw new Error('DevServer URL not available');
      }

      // Get component URL that will load the bundled component
      const componentUrl = this.getComponentUrl(filePath);
      this.log(`[Preview Request] Component URL: ${componentUrl}`);

      // Generate preview HTML that loads the component
      // This is similar to what HtmlPropsAdapter.renderPreview() generates
      const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
  </style>
</head>
<body>
  <!-- Component will be mounted here by the bundle script -->
  <div id="root"></div>
  
  <!-- Load the bundled component script -->
  <script type="module">
    try {
      console.log('[Preview] Importing from: ${componentUrl}');
      const module = await import('${componentUrl}');
      console.log('[Preview] Import successful', module);
    } catch (error) {
      console.error('[Preview] Error importing bundle:', error);
      document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #d00; font-family: sans-serif;"><p>Error loading component: ' + error.message + '</p></div>';
    }
  </script>
</body>
</html>`;

      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(previewHtml);
    } catch (error) {
      const errorMsg = `Preview error: ${(error as Error).message}`;
      this.log(`[Preview Request] ERROR: ${errorMsg}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(errorMsg);
    }
  }

  /**
   * Handle component bundle request
   */
  private async handleComponentRequest(params: URLSearchParams, res: http.ServerResponse): Promise<void> {
    const filePath = params.get('file');
    
    this.log(`[Component Request] Received request for: ${filePath}`);

    if (!filePath) {
      this.log(`[Component Request] ERROR: Missing file parameter`);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing file parameter');
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      this.log(`[Component Request] ERROR: File not found: ${filePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`File not found: ${filePath}`);
      return;
    }

    try {
      // Check cache
      const cached = this.bundleCache.get(filePath);
      if (cached) {
        const stats = fs.statSync(filePath);
        this.log(`[Component Request] Cache check: file mtime=${stats.mtimeMs}, cached timestamp=${cached.timestamp}`);
        if (stats.mtimeMs <= cached.timestamp) {
          this.log(`[Component Request] Serving from cache: ${filePath}`);
          res.writeHead(200, { 
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          res.end(cached.code);
          return;
        } else {
          this.log(`[Component Request] Cache expired (file modified), rebuilding: ${filePath}`);
        }
      }

      // Bundle component
      this.log(`[Component Request] Bundling: ${filePath}`);
      const bundled = await this.bundleComponent(filePath);

      // Cache result
      const stats = fs.statSync(filePath);
      this.bundleCache.set(filePath, {
        code: bundled,
        timestamp: stats.mtimeMs
      });
      
      this.log(`[Component Request] Successfully bundled and cached: ${filePath}`);

      res.writeHead(200, { 
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(bundled);
    } catch (error) {
      const errorMsg = `Bundle error: ${(error as Error).message}`;
      const errorStack = (error as Error).stack || '';
      this.log(`[Component Request] ERROR: ${errorMsg}`);
      this.log(`[Component Request] Stack trace: ${errorStack}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`${errorMsg}\n\nStack:\n${errorStack}`);
    }
  }

  /**
   * Handle pre-bundled bundle request
   * Serves a pre-bundled JavaScript file from an absolute path
   */
  private handleBundleRequest(params: URLSearchParams, res: http.ServerResponse): void {
    const filePath = params.get('file');

    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing file parameter');
      return;
    }
    
    // Decode URL-encoded path
    const decodedPath = decodeURIComponent(filePath);
    
    // Check if file exists
    if (!fs.existsSync(decodedPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`File not found: ${decodedPath}`);
      return;
    }

    try {
      // Read and serve the bundle file
      fs.readFile(decodedPath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Error reading file: ${(err as Error).message}`);
          return;
        }

        res.writeHead(200, { 
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(data);
      });
    } catch (error) {
      const errorMsg = `Bundle request error: ${(error as Error).message}`;
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(errorMsg);
    }
  }

  /**
   * Bundle TypeScript component with esbuild
   */
  private async bundleComponent(filePath: string): Promise<string> {
    if (!this.workspaceRoot) {
      throw new Error('Workspace root not set');
    }

    this.log(`Building: ${filePath}`);
    this.log(`Working dir: ${this.workspaceRoot}`);

    // Check if we have in-memory content
    const inMemoryContent = this.documentCache.get(filePath);
    if (inMemoryContent) {
      this.log(`Using in-memory content for: ${filePath}`);
    }

    // Try to load Deno import map
    const importMap = this.loadDenoImportMap();
    if (importMap) {
      this.log(`Loaded import map with ${Object.keys(importMap).length} entries`);
    }

    try {
      const buildOptions: esbuild.BuildOptions = {
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        write: false,
        absWorkingDir: this.workspaceRoot,
        sourcemap: 'inline',
        minify: false,
        keepNames: true,
        loader: {
          '.css': 'text'
        },
        plugins: importMap ? [this.createImportMapPlugin(importMap)] : [],
        logLevel: 'warning'
      };

      // Use stdin for in-memory content, otherwise use entryPoints
      if (inMemoryContent) {
        buildOptions.stdin = {
          contents: inMemoryContent,
          resolveDir: path.dirname(filePath),
          sourcefile: filePath,
          loader: 'ts'
        };
      } else {
        buildOptions.entryPoints = [filePath];
      }

      const result = await esbuild.build(buildOptions);

      if (result.errors.length > 0) {
        const errorMsg = result.errors.map(e => e.text).join('\n');
        this.log(`Build errors:\n${errorMsg}`);
        throw new Error(`Build failed: ${errorMsg}`);
      }

      if (result.warnings.length > 0) {
        const warningMsg = result.warnings.map(w => w.text).join('\n');
        this.log(`Build warnings:\n${warningMsg}`);
      }

      if (!result.outputFiles || result.outputFiles.length === 0) {
        throw new Error('No output files generated');
      }

      this.log(`Build successful, output size: ${result.outputFiles[0].text.length} bytes`);
      return result.outputFiles[0].text;
    } catch (error) {
      this.log(`Build exception: ${(error as Error).stack || (error as Error).message}`);
      throw error;
    }
  }

  /**
   * Load Deno import map from deno.json or deno.jsonc
   */
  private loadDenoImportMap(): Record<string, string> | null {
    if (!this.workspaceRoot) {
      return null;
    }

    const denoJsonPath = path.join(this.workspaceRoot, 'deno.json');
    const denoJsoncPath = path.join(this.workspaceRoot, 'deno.jsonc');

    let configPath: string | null = null;
    if (fs.existsSync(denoJsonPath)) {
      configPath = denoJsonPath;
    } else if (fs.existsSync(denoJsoncPath)) {
      configPath = denoJsoncPath;
    }

    if (!configPath) {
      return null;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      
      // Remove // comments (preserving strings)
      let cleaned = content.split('\n').map(line => {
        const commentIndex = line.indexOf('//');
        if (commentIndex !== -1) {
          // Check if // is inside a string
          const beforeComment = line.substring(0, commentIndex);
          const quotes = (beforeComment.match(/"/g) || []).length;
          // If odd number of quotes, // is inside a string
          if (quotes % 2 === 0) {
            return line.substring(0, commentIndex);
          }
        }
        return line;
      }).join('\n');
      
      // Remove /* */ comments
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Remove trailing commas before } or ]
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      
      const config = JSON.parse(cleaned);
      
      if (config.imports) {
        this.log(`Found import map in ${path.basename(configPath)}`);
        return config.imports;
      }
    } catch (error) {
      this.log(`Failed to load import map: ${(error as Error).message}`);
      this.log(`Config path: ${configPath}`);
    }

    return null;
  }

  /**
   * Create esbuild plugin for handling Deno import maps
   */
  private createImportMapPlugin(importMap: Record<string, string>): esbuild.Plugin {
    const plugin: esbuild.Plugin = {
      name: 'deno-import-map',
      setup: (build) => {
        this.log(`[Import Map Plugin] Setting up with ${Object.keys(importMap).length} mappings`);
        
        // Log all mappings
        for (const [key, value] of Object.entries(importMap)) {
          this.log(`[Import Map] ${key} -> ${value}`);
        }

        // Resolve bare imports using the import map
        build.onResolve({ filter: /.*/ }, (args) => {
          // Skip already resolved paths
          if (args.namespace !== 'file') {
            return undefined;
          }

          this.log(`[Import Map] Resolving: ${args.path} from ${args.importer}`);

          // Exact match in import map
          if (importMap[args.path]) {
            const mapped = importMap[args.path];
            this.log(`[Import Map] Exact match: ${args.path} -> ${mapped}`);
            
            // If it's a JSR or HTTP URL, mark as external using ORIGINAL path
            // This way the bundled code imports '@html-props/core', not 'jsr:@html-props/core'
            if (mapped.startsWith('jsr:') || mapped.startsWith('https://') || mapped.startsWith('http://')) {
              this.log(`[Import Map] Marking as external: ${args.path}`);
              return { path: args.path, external: true };
            }
            
            // Otherwise try to resolve as local path
            return { path: mapped };
          }

          // Check for prefix matches (e.g., "@html-props/" -> "jsr:@html-props/")
          for (const [key, value] of Object.entries(importMap)) {
            if (key.endsWith('/') && args.path.startsWith(key)) {
              const suffix = args.path.substring(key.length);
              const mapped = value + suffix;
              this.log(`[Import Map] Prefix match: ${args.path} -> ${mapped}`);
              
              if (mapped.startsWith('jsr:') || mapped.startsWith('https://') || mapped.startsWith('http://')) {
                this.log(`[Import Map] Marking as external: ${args.path}`);
                return { path: args.path, external: true };
              }
              
              return { path: mapped };
            }
          }

          // No match, let esbuild handle it
          return undefined;
        });
      }
    };
    
    return plugin;
  }

  /**
   * Handle static file serving
   */
  private handleStaticFile(url: URL, res: http.ServerResponse) {
    if (!this.workspaceRoot) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }

    // Parse URL and remove query string
    let filePath = path.join(this.workspaceRoot, url.pathname);
    this.log(`[Static File] Requested: ${url.pathname}`);
    this.log(`[Static File] Resolved to: ${filePath}`);
    this.log(`[Static File] Workspace root: ${this.workspaceRoot}`);

    // Security: prevent directory traversal
    // Normalize both paths for consistent comparison on Windows
    const normalizedPath = path.normalize(filePath);
    const normalizedRoot = path.normalize(this.workspaceRoot);
    
    this.log(`[Static File] Normalized path: ${normalizedPath}`);
    this.log(`[Static File] Normalized root: ${normalizedRoot}`);
    
    if (!normalizedPath.startsWith(normalizedRoot)) {
      this.log(`[Static File] FORBIDDEN: Path outside workspace`);
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Check for in-memory content first
    const inMemoryContent = this.documentCache.get(normalizedPath);
    if (inMemoryContent) {
      this.log(`[Static File] Serving in-memory content for: ${normalizedPath}`);
      
      // Determine content type
      const ext = path.extname(normalizedPath).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.mjs': 'application/javascript',
        '.ts': 'application/javascript',
        '.json': 'application/json',
      };
      const contentType = contentTypes[ext] || 'text/plain';
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(inMemoryContent);
      return;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // Get file stats
    const stat = fs.statSync(filePath);

    // If directory, try index.html
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal server error');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  }

  /**
   * Log message to output channel
   */
  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[DevServer] ${message}`);
    } else {
      console.log(`[DevServer] ${message}`);
    }
  }
}
