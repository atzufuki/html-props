import { marked } from 'marked';

export interface DocContent {
  html: string;
  tokens: any[];
}

export interface SidebarItem {
  label: string;
  file: string;
}

export interface DocVersion {
  label: string;
  ref: string;
}

export class MarkdownService {
  private static instance: MarkdownService;
  private cache: Map<string, DocContent> = new Map();
  private baseUrl = 'https://raw.githubusercontent.com/atzufuki/html-props';

  private constructor() {}

  static getInstance(): MarkdownService {
    if (!MarkdownService.instance) {
      MarkdownService.instance = new MarkdownService();
    }
    return MarkdownService.instance;
  }

  clearCache() {
    this.cache.clear();
  }

  parse(text: string): any[] {
    return marked.lexer(text);
  }

  resolveVersion(version: string): string {
    if (version !== 'local') return version;

    const hostname = window.location.hostname;
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);

    if (isLocal) return 'local';

    // Attempt to extract branch/version from Deno Deploy hostname
    // e.g. html-props--v1.atzufuki.deno.net -> v1
    const match = hostname.match(/--([a-zA-Z0-9-_]+)\./);
    return match ? match[1] : 'main';
  }

  async fetchDoc(page: string, version: string = 'local'): Promise<DocContent> {
    const resolvedVersion = this.resolveVersion(version);
    const cacheKey = `${resolvedVersion}:${page}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let url: string;
    if (resolvedVersion === 'local') {
      // In dev mode, we expect the dev server to serve docs at /docs/
      url = `/docs/${page}.md`;
    } else {
      // Production/Versioned fetch
      url = `https://raw.githubusercontent.com/atzufuki/html-props/${resolvedVersion}/docs/${page}.md`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch doc: ${response.statusText}`);
      }
      const text = await response.text();

      // Parse markdown
      const tokens = marked.lexer(text);
      const html = marked.parser(tokens);

      const content = { html, tokens };
      this.cache.set(cacheKey, content);
      return content;
    } catch (error) {
      console.error('Error fetching doc:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getManifest(version: string = 'local'): Promise<string[]> {
    const resolvedVersion = this.resolveVersion(version);
    if (resolvedVersion === 'local') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch('/api/docs', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Failed to fetch docs manifest');
        return await res.json();
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    } else {
      // GitHub API
      const url = `https://api.github.com/repos/atzufuki/html-props/contents/docs?ref=${resolvedVersion}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch docs manifest from GitHub');
      const data = await res.json();
      return data
        .filter((item: any) => item.type === 'file' && item.name.endsWith('.md'))
        .map((item: any) => item.name);
    }
  }

  async getVersions(): Promise<DocVersion[]> {
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      // Fetch versions from main
      const response = await fetch(`${this.baseUrl}/main/docs/versions.json`);
      let versions: DocVersion[] = [];

      if (response.ok) {
        versions = await response.json();
      } else {
        // Fallback if file doesn't exist yet
        versions = [{ label: 'Latest', ref: 'main' }];
      }

      if (isLocal) {
        // Prepend local
        return [{ label: 'Local', ref: 'local' }, ...versions];
      }

      return versions;
    } catch (e) {
      console.warn('Failed to fetch versions, falling back to default', e);
      return [{ label: 'Latest', ref: 'main' }];
    }
  }

  async getSidebarItems(version: string = 'local'): Promise<SidebarItem[]> {
    try {
      const { tokens } = await this.fetchDoc('index', version);
      const list = tokens.find((t: any) => t.type === 'list');

      if (!list || !list.items) {
        return [];
      }

      return list.items.map((item: any) => {
        // Extract link from list item
        // Item tokens usually contain 'text' which might contain a link
        // Or we can look at item.tokens
        const linkToken = this.findLinkToken(item.tokens);
        if (linkToken) {
          return {
            label: linkToken.text,
            file: linkToken.href,
          };
        }
        return null;
      }).filter((item: any) => item !== null);
    } catch (e) {
      console.error('Failed to load sidebar index', e);
      throw e;
    }
  }

  private findLinkToken(tokens: any[]): any {
    for (const token of tokens) {
      if (token.type === 'link') return token;
      if (token.tokens) {
        const found = this.findLinkToken(token.tokens);
        if (found) return found;
      }
    }
    return null;
  }
}
