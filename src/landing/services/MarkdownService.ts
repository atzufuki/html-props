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
  private pendingRequests: Map<string, Promise<DocContent>> = new Map();
  private versionsCache: DocVersion[] | null = null;
  private versionsPromise: Promise<DocVersion[]> | null = null;
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
    this.pendingRequests.clear();
    this.versionsCache = null;
    this.versionsPromise = null;
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

  hasDoc(page: string, version: string = 'local'): boolean {
    const resolvedVersion = this.resolveVersion(version);
    const cacheKey = `${resolvedVersion}:${page}`;
    return this.cache.has(cacheKey);
  }

  getDocSync(page: string, version: string = 'local'): DocContent | null {
    const resolvedVersion = this.resolveVersion(version);
    const cacheKey = `${resolvedVersion}:${page}`;
    return this.cache.get(cacheKey) || null;
  }

  async fetchDoc(page: string, version: string = 'local'): Promise<DocContent> {
    const resolvedVersion = this.resolveVersion(version);
    const cacheKey = `${resolvedVersion}:${page}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    let url: string;
    if (resolvedVersion === 'local') {
      // In dev mode, we expect the dev server to serve docs at /api/docs/content/
      url = `/api/docs/content/${page}.md`;
    } else {
      // Production/Versioned fetch
      url = `https://raw.githubusercontent.com/atzufuki/html-props/${resolvedVersion}/docs/${page}.md`;
    }

    const promise = (async () => {
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
        this.pendingRequests.delete(cacheKey);
      }
    })();

    this.pendingRequests.set(cacheKey, promise);
    return promise;
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
    if (this.versionsCache) return this.versionsCache;
    if (this.versionsPromise) return this.versionsPromise;

    this.versionsPromise = (async () => {
      try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const currentVersion = this.resolveVersion('local');

        let url: string;
        if (isLocal) {
          url = '/api/docs/content/versions.json';
        } else {
          url = `${this.baseUrl}/${currentVersion}/docs/versions.json`;
        }

        // Fetch versions
        let response = await fetch(url);

        // If failed and we are not on main (and not local), try main as fallback
        if (!response.ok && !isLocal && currentVersion !== 'main') {
          response = await fetch(`${this.baseUrl}/main/docs/versions.json`);
        }

        let versions: DocVersion[] = [];

        if (response.ok) {
          versions = await response.json();
        } else {
          // Fallback if file doesn't exist yet
          versions = [{ label: 'Latest', ref: 'main' }];
        }

        if (isLocal) {
          // Prepend local
          versions = [{ label: 'Local', ref: 'local' }, ...versions];

          // Ensure main is present if missing (e.g. if versions.json is empty or failed)
          if (!versions.some((v) => v.ref === 'main')) {
            versions.push({ label: 'Latest', ref: 'main' });
          }
        }

        this.versionsCache = versions;
        return versions;
      } catch (e) {
        console.warn('Failed to fetch versions, falling back to default', e);
        return [{ label: 'Latest', ref: 'main' }];
      } finally {
        this.versionsPromise = null;
      }
    })();

    return this.versionsPromise;
  }

  async getSidebarItems(version: string = 'local'): Promise<SidebarItem[]> {
    try {
      const { tokens } = await this.fetchDoc('index', version);
      return this.parseSidebarFromDoc(tokens);
    } catch (e) {
      console.error('Failed to load sidebar index', e);
      throw e;
    }
  }

  getSidebarItemsSync(version: string = 'local'): SidebarItem[] | null {
    const doc = this.getDocSync('index', version);
    if (!doc) return null;
    return this.parseSidebarFromDoc(doc.tokens);
  }

  private parseSidebarFromDoc(tokens: any[]): SidebarItem[] {
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
