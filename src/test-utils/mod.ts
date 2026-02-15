/**
 * Test utilities for Playwright-based testing with Deno.test()
 *
 * Provides browser setup/teardown helpers and page loading utilities
 * for testing html-props components in real browsers.
 *
 * Uses Deno.bundle() to compile TypeScript components for browser execution.
 *
 * @module
 */

import { type Browser, type BrowserContext, chromium, firefox, type Page, webkit } from 'playwright';

// =============================================================================
// Types
// =============================================================================

export interface TestContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export interface SetupOptions {
  /** Run in headless mode (default: true, set HEADLESS=false to debug) */
  headless?: boolean;
  /** Slow down actions by this many milliseconds (default: 0) */
  slowMo?: number;
  /** Browser to use: 'chromium' | 'firefox' | 'webkit' (default: 'chromium') */
  browserType?: 'chromium' | 'firefox' | 'webkit';
}

export interface LoadPageOptions {
  /** Entry point file to bundle (relative to project root) */
  entryPoint?: string;
  /** Inline TypeScript/JavaScript code to bundle and execute */
  code?: string;
  /** Initial body HTML content */
  body?: string;
  /** Additional head content (styles, etc.) */
  head?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_HEADLESS = Deno.env.get('HEADLESS') !== 'false';
const DEFAULT_SLOW_MO = parseInt(Deno.env.get('SLOW_MO') ?? '0', 10);
const DEFAULT_BROWSER = (Deno.env.get('BROWSER') ?? 'chromium') as
  | 'chromium'
  | 'firefox'
  | 'webkit';

// =============================================================================
// Browser Setup
// =============================================================================

/**
 * Launch a browser and create a new page for testing.
 *
 * @example
 * ```typescript
 * const ctx = await setupBrowser();
 * // ... run tests ...
 * await teardownBrowser(ctx);
 * ```
 */
export async function setupBrowser(
  options: SetupOptions = {},
): Promise<TestContext> {
  const {
    headless = DEFAULT_HEADLESS,
    slowMo = DEFAULT_SLOW_MO,
    browserType = DEFAULT_BROWSER,
  } = options;

  const browserLauncher = browserType === 'firefox' ? firefox : browserType === 'webkit' ? webkit : chromium;

  const browser = await browserLauncher.launch({
    headless,
    slowMo,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  return { browser, context, page };
}

/**
 * Close the browser and clean up resources.
 */
export async function teardownBrowser(ctx: TestContext): Promise<void> {
  await ctx.context.close();
  await ctx.browser.close();
}

/**
 * Create a fresh page in the existing browser context.
 * Useful for test isolation without restarting the browser.
 */
export async function freshPage(ctx: TestContext): Promise<Page> {
  await ctx.page.close();
  ctx.page = await ctx.context.newPage();
  return ctx.page;
}

// =============================================================================
// Bundling
// =============================================================================

/**
 * Bundle TypeScript code using Deno.bundle().
 * Returns JavaScript code that can be executed in the browser.
 */
export async function bundleCode(code: string): Promise<string> {
  // Create a temporary file in the project's src directory so relative imports work
  const projectRoot = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  const tempFileName = `_test_bundle_${Date.now()}_${Math.random().toString(36).slice(2)}.ts`;
  const tempFile = `${projectRoot}${tempFileName}`;

  try {
    // Write the code to the temp file
    await Deno.writeTextFile(tempFile, code);

    // Bundle with Deno.bundle()
    // @ts-ignore - Deno.bundle is unstable
    const result = await Deno.bundle({
      entrypoints: [tempFile],
    });

    if (!result.success) {
      throw new Error(`Bundle failed: ${JSON.stringify(result.errors)}`);
    }

    return result.outputFiles[0].text();
  } finally {
    // Clean up temp file
    try {
      await Deno.remove(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Bundle a file using Deno.bundle().
 */
export async function bundleFile(entryPoint: string): Promise<string> {
  // @ts-ignore - Deno.bundle is unstable
  const result = await Deno.bundle({
    entrypoints: [entryPoint],
  });

  if (!result.success) {
    throw new Error(`Bundle failed: ${JSON.stringify(result.errors)}`);
  }

  return result.outputFiles[0].text();
}

// =============================================================================
// Page Loading
// =============================================================================

/**
 * Default imports that are prepended to test code.
 */
const DEFAULT_IMPORTS = `
import { HTMLPropsMixin, prop, ref } from "./src/core/mod.ts";
import { Div, Span, Button, Input, Ul, Li } from "./src/built-ins/mod.ts";
import { signal, computed, effect, batch, untracked, readonly } from "./src/signals/mod.ts";
import { Row, Column, Container } from "./src/layout/mod.ts";

// Make imports available globally for page.evaluate()
(window as any).HTMLPropsMixin = HTMLPropsMixin;
(window as any).prop = prop;
(window as any).ref = ref;
(window as any).signal = signal;
(window as any).computed = computed;
(window as any).effect = effect;
(window as any).batch = batch;
(window as any).untracked = untracked;
(window as any).readonly = readonly;
(window as any).Div = Div;
(window as any).Span = Span;
(window as any).Button = Button;
(window as any).Input = Input;
(window as any).Ul = Ul;
(window as any).Li = Li;
(window as any).Row = Row;
(window as any).Column = Column;
(window as any).Container = Container;
`;

/**
 * Load a test page with html-props components.
 *
 * Uses Deno.bundle() to compile TypeScript code for the browser.
 *
 * @example
 * ```typescript
 * await loadTestPage(page, {
 *   code: `
 *     class Counter extends HTMLPropsMixin(HTMLElement, {
 *       count: prop(0),
 *     }) {
 *       render() {
 *         return new Div({ textContent: \`Count: \${this.count}\` });
 *       }
 *     }
 *     customElements.define("test-counter", Counter);
 *   `,
 * });
 * ```
 */
export async function loadTestPage(
  page: Page,
  options: LoadPageOptions = {},
): Promise<void> {
  const { code = '', body = '', head = '', entryPoint } = options;

  let bundledCode: string;

  if (entryPoint) {
    // Bundle from file
    bundledCode = await bundleFile(entryPoint);
  } else {
    // Bundle inline code with default imports
    const fullCode = `
${DEFAULT_IMPORTS}

${code}

// Signal that the page is ready
(window as any).__TEST_READY__ = true;
window.dispatchEvent(new CustomEvent("test-ready"));
`;
    bundledCode = await bundleCode(fullCode);
  }

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>html-props Test</title>
    ${head}
  </head>
  <body>
    ${body}
    <script type="module">
      ${bundledCode}
    </script>
  </body>
</html>
  `.trim();

  // Navigate to about:blank first to reset the page state (including customElements registry)
  // This is necessary because page.setContent() doesn't fully reset the page
  await page.goto('about:blank');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // Wait for modules to load and components to be defined
  await page.waitForFunction(
    () => (window as any).__TEST_READY__ === true,
    { timeout: 10000 },
  );
}

/**
 * Load a minimal test page without any imports.
 * Useful for testing basic DOM operations.
 */
export async function loadMinimalPage(page: Page, body = ''): Promise<void> {
  await page.setContent(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Test</title>
  </head>
  <body>${body}</body>
</html>
  `);
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Wait for a custom element to be defined.
 */
export async function waitForElement(
  page: Page,
  tagName: string,
  timeout = 5000,
): Promise<void> {
  await page.waitForFunction(
    (tag) => customElements.get(tag) !== undefined,
    tagName,
    { timeout },
  );
}

/**
 * Get the text content of an element.
 */
export async function getTextContent(
  page: Page,
  selector: string,
): Promise<string | null> {
  return page.locator(selector).textContent();
}

/**
 * Get an attribute value from an element.
 */
export async function getAttribute(
  page: Page,
  selector: string,
  attribute: string,
): Promise<string | null> {
  return page.locator(selector).getAttribute(attribute);
}

/**
 * Check if an element exists in the DOM.
 */
export async function elementExists(
  page: Page,
  selector: string,
): Promise<boolean> {
  const count = await page.locator(selector).count();
  return count > 0;
}

/**
 * Get inline style value from an element.
 */
export async function getStyleValue(
  page: Page,
  selector: string,
  property: string,
): Promise<string> {
  return page.locator(selector).evaluate(
    (el, prop) => (el as HTMLElement).style.getPropertyValue(prop),
    property,
  );
}

/**
 * Get computed style value from an element.
 */
export async function getComputedStyleValue(
  page: Page,
  selector: string,
  property: string,
): Promise<string> {
  return page.locator(selector).evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop),
    property,
  );
}

/**
 * Sleep for a specified duration.
 * Use sparingly - prefer waitFor* methods.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Test Options
// =============================================================================

/**
 * Standard test options for Playwright tests.
 * Disables sanitizers that conflict with browser automation.
 */
export const TEST_OPTIONS = {
  sanitizeOps: false,
  sanitizeResources: false,
};

// =============================================================================
// Type Declarations for window globals
// =============================================================================

declare global {
  interface Window {
    __TEST_READY__: boolean;
    HTMLPropsMixin: unknown;
    prop: unknown;
    ref: unknown;
    signal: unknown;
    computed: unknown;
    effect: unknown;
    Div: unknown;
    Span: unknown;
    Button: unknown;
    Input: unknown;
    Ul: unknown;
    Li: unknown;
    Row: unknown;
    Column: unknown;
    Container: unknown;
  }
}
