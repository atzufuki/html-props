import { marked } from 'marked';

export interface DocContent {
  html: string;
  tokens: any[];
}

export interface SidebarItem {
  label: string;
  file: string;
}

export class MarkdownService {
  private static instance: MarkdownService;
  private cache: Map<string, DocContent> = new Map();

  private constructor() {}

  static getInstance(): MarkdownService {
    if (!MarkdownService.instance) {
      MarkdownService.instance = new MarkdownService();
    }
    return MarkdownService.instance;
  }

  parse(text: string): any[] {
    return marked.lexer(text);
  }

  async fetchDoc(page: string, version: string = 'local'): Promise<DocContent> {
    const cacheKey = `${version}:${page}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let url: string;
    if (version === 'local') {
      // In dev mode, we expect the dev server to serve docs at /docs/
      url = `/docs/${page}.md`;
    } else {
      // Production/Versioned fetch
      url = `https://raw.githubusercontent.com/atzufuki/html-props/${version}/docs/${page}.md`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

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
    }
  }

  async getManifest(version: string = 'local'): Promise<string[]> {
    if (version === 'local') {
      console.log('Fetching manifest from /api/docs');
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
      const url = `https://api.github.com/repos/atzufuki/html-props/contents/docs?ref=${version}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch docs manifest from GitHub');
      const data = await res.json();
      return data
        .filter((item: any) => item.type === 'file' && item.name.endsWith('.md'))
        .map((item: any) => item.name);
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
      return [];
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
