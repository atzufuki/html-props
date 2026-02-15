/**
 * Test utilities for Playwright-based testing with Deno.test()
 *
 * Provides browser setup/teardown helpers and page loading utilities
 * for testing html-props components in real browsers.
 *
 * @module
 */

import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

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
  browserType?: "chromium" | "firefox" | "webkit";
}

export interface LoadPageOptions {
  /** Additional imports to include in the page */
  imports?: string[];
  /** Component class definitions to include */
  components?: string[];
  /** Initial body HTML content */
  body?: string;
  /** Additional head content (styles, etc.) */
  head?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_HEADLESS = Deno.env.get("HEADLESS") !== "false";
const DEFAULT_SLOW_MO = parseInt(Deno.env.get("SLOW_MO") ?? "0", 10);
const DEFAULT_BROWSER = (Deno.env.get("BROWSER") ?? "chromium") as
  | "chromium"
  | "firefox"
  | "webkit";

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
  options: SetupOptions = {}
): Promise<TestContext> {
  const {
    headless = DEFAULT_HEADLESS,
    slowMo = DEFAULT_SLOW_MO,
    browserType = DEFAULT_BROWSER,
  } = options;

  const browserLauncher =
    browserType === "firefox"
      ? firefox
      : browserType === "webkit"
        ? webkit
        : chromium;

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
// Page Loading
// =============================================================================

/**
 * Load a test page with html-props components.
 *
 * This sets up the page with:
 * - Import map for @html-props/* packages
 * - Default imports (HTMLPropsMixin, prop, ref, built-ins)
 * - Custom component definitions
 * - Initial body content
 *
 * @example
 * ```typescript
 * await loadTestPage(page, {
 *   components: [`
 *     class Counter extends HTMLPropsMixin(HTMLElement, {
 *       count: prop(0),
 *     }) {
 *       render() {
 *         return new Div({ textContent: \`Count: \${this.count}\` });
 *       }
 *     }
 *     customElements.define("test-counter", Counter);
 *   `],
 * });
 * ```
 */
export async function loadTestPage(
  page: Page,
  options: LoadPageOptions = {}
): Promise<void> {
  const {
    imports = [],
    components = [],
    body = "",
    head = "",
  } = options;

  // Default imports that are always included
  const defaultImports = [
    `import { HTMLPropsMixin, prop, ref } from "/src/core/mod.ts";`,
    `import { Div, Span, Button, Input, Ul, Li } from "/src/built-ins/mod.ts";`,
    `import { signal, computed, effect } from "/src/signals/mod.ts";`,
    `import { Row, Column, Container } from "/src/layout/mod.ts";`,
  ];

  const allImports = [...defaultImports, ...imports].join("\n");
  const allComponents = components.join("\n");

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>html-props Test</title>
    ${head}
    <script type="module">
      ${allImports}

      // Make imports available globally for page.evaluate()
      window.HTMLPropsMixin = HTMLPropsMixin;
      window.prop = prop;
      window.ref = ref;
      window.signal = signal;
      window.computed = computed;
      window.effect = effect;
      window.Div = Div;
      window.Span = Span;
      window.Button = Button;
      window.Input = Input;
      window.Ul = Ul;
      window.Li = Li;
      window.Row = Row;
      window.Column = Column;
      window.Container = Container;

      // Component definitions
      ${allComponents}

      // Signal that the page is ready
      window.__TEST_READY__ = true;
      window.dispatchEvent(new CustomEvent("test-ready"));
    </script>
  </head>
  <body>
    ${body}
  </body>
</html>
  `.trim();

  // Navigate to the project root to resolve imports
  // We need a base URL for module resolution
  const cwd = Deno.cwd();

  // Use a file:// URL as base, then set content
  await page.goto(`file://${cwd}/index.html`);
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  // Wait for modules to load and components to be defined
  await page.waitForFunction(() => window.__TEST_READY__ === true, {
    timeout: 10000,
  });
}

/**
 * Load a minimal test page without any imports.
 * Useful for testing basic DOM operations.
 */
export async function loadMinimalPage(
  page: Page,
  body = ""
): Promise<void> {
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
  timeout = 5000
): Promise<void> {
  await page.waitForFunction(
    (tag) => customElements.get(tag) !== undefined,
    tagName,
    { timeout }
  );
}

/**
 * Get the text content of an element.
 */
export async function getTextContent(
  page: Page,
  selector: string
): Promise<string | null> {
  return page.locator(selector).textContent();
}

/**
 * Get an attribute value from an element.
 */
export async function getAttribute(
  page: Page,
  selector: string,
  attribute: string
): Promise<string | null> {
  return page.locator(selector).getAttribute(attribute);
}

/**
 * Check if an element exists in the DOM.
 */
export async function elementExists(
  page: Page,
  selector: string
): Promise<boolean> {
  const count = await page.locator(selector).count();
  return count > 0;
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
