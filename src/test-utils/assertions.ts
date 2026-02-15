/**
 * Custom assertions for Playwright-based testing.
 *
 * Re-exports standard assertions from @std/assert and provides
 * additional helpers for DOM testing.
 *
 * @module
 */

// Re-export standard assertions
export {
  assert,
  assertEquals,
  assertExists,
  assertFalse,
  assertMatch,
  assertNotEquals,
  assertRejects,
  assertStrictEquals,
  assertStringIncludes,
  assertThrows,
} from '@std/assert';

import { assertEquals, assertExists } from '@std/assert';
import type { Page } from 'playwright';

// =============================================================================
// DOM Assertions
// =============================================================================

/**
 * Assert that an element exists in the page.
 */
export async function assertElementExists(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const count = await page.locator(selector).count();
  if (count === 0) {
    throw new Error(
      message ?? `Expected element "${selector}" to exist, but it was not found`,
    );
  }
}

/**
 * Assert that an element does not exist in the page.
 */
export async function assertElementNotExists(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const count = await page.locator(selector).count();
  if (count > 0) {
    throw new Error(
      message ?? `Expected element "${selector}" not to exist, but found ${count} element(s)`,
    );
  }
}

/**
 * Assert that an element has specific text content.
 */
export async function assertTextContent(
  page: Page,
  selector: string,
  expected: string,
  message?: string,
): Promise<void> {
  const actual = await page.locator(selector).textContent();
  assertEquals(
    actual,
    expected,
    message ?? `Expected "${selector}" to have text "${expected}", but got "${actual}"`,
  );
}

/**
 * Assert that an element's text content contains a substring.
 */
export async function assertTextContains(
  page: Page,
  selector: string,
  substring: string,
  message?: string,
): Promise<void> {
  const actual = await page.locator(selector).textContent();
  assertExists(actual, `Element "${selector}" has no text content`);
  if (!actual.includes(substring)) {
    throw new Error(
      message ?? `Expected "${selector}" text to contain "${substring}", but got "${actual}"`,
    );
  }
}

/**
 * Assert that an element has a specific attribute value.
 */
export async function assertAttribute(
  page: Page,
  selector: string,
  attribute: string,
  expected: string | null,
  message?: string,
): Promise<void> {
  const actual = await page.locator(selector).getAttribute(attribute);
  assertEquals(
    actual,
    expected,
    message ?? `Expected "${selector}" attribute "${attribute}" to be "${expected}", but got "${actual}"`,
  );
}

/**
 * Assert that an element has a specific CSS property value.
 */
export async function assertStyle(
  page: Page,
  selector: string,
  property: string,
  expected: string,
  message?: string,
): Promise<void> {
  const actual = await page.locator(selector).evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop),
    property,
  );
  assertEquals(
    actual,
    expected,
    message ?? `Expected "${selector}" style "${property}" to be "${expected}", but got "${actual}"`,
  );
}

/**
 * Assert that an element has a specific inline style value.
 * Unlike assertStyle, this checks the element's style attribute directly.
 */
export async function assertInlineStyle(
  page: Page,
  selector: string,
  property: string,
  expected: string,
  message?: string,
): Promise<void> {
  const actual = await page.locator(selector).evaluate(
    (el, prop) => (el as HTMLElement).style.getPropertyValue(prop),
    property,
  );
  assertEquals(
    actual,
    expected,
    message ?? `Expected "${selector}" inline style "${property}" to be "${expected}", but got "${actual}"`,
  );
}

/**
 * Assert that an element is visible.
 */
export async function assertVisible(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const isVisible = await page.locator(selector).isVisible();
  if (!isVisible) {
    throw new Error(
      message ?? `Expected element "${selector}" to be visible`,
    );
  }
}

/**
 * Assert that an element is hidden.
 */
export async function assertHidden(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const isVisible = await page.locator(selector).isVisible();
  if (isVisible) {
    throw new Error(
      message ?? `Expected element "${selector}" to be hidden`,
    );
  }
}

/**
 * Assert the number of elements matching a selector.
 */
export async function assertElementCount(
  page: Page,
  selector: string,
  expected: number,
  message?: string,
): Promise<void> {
  const actual = await page.locator(selector).count();
  assertEquals(
    actual,
    expected,
    message ?? `Expected ${expected} elements matching "${selector}", but found ${actual}`,
  );
}

/**
 * Assert that an element has a specific class.
 */
export async function assertHasClass(
  page: Page,
  selector: string,
  className: string,
  message?: string,
): Promise<void> {
  const hasClass = await page.locator(selector).evaluate(
    (el, cls) => el.classList.contains(cls),
    className,
  );
  if (!hasClass) {
    throw new Error(
      message ?? `Expected element "${selector}" to have class "${className}"`,
    );
  }
}

/**
 * Assert that an element does not have a specific class.
 */
export async function assertNotHasClass(
  page: Page,
  selector: string,
  className: string,
  message?: string,
): Promise<void> {
  const hasClass = await page.locator(selector).evaluate(
    (el, cls) => el.classList.contains(cls),
    className,
  );
  if (hasClass) {
    throw new Error(
      message ?? `Expected element "${selector}" not to have class "${className}"`,
    );
  }
}

/**
 * Assert that an input/textarea has a specific value.
 */
export async function assertInputValue(
  page: Page,
  selector: string,
  expected: string,
  message?: string,
): Promise<void> {
  const actual = await page.locator(selector).inputValue();
  assertEquals(
    actual,
    expected,
    message ?? `Expected "${selector}" value to be "${expected}", but got "${actual}"`,
  );
}

/**
 * Assert that a checkbox/radio is checked.
 */
export async function assertChecked(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const isChecked = await page.locator(selector).isChecked();
  if (!isChecked) {
    throw new Error(
      message ?? `Expected element "${selector}" to be checked`,
    );
  }
}

/**
 * Assert that a checkbox/radio is not checked.
 */
export async function assertNotChecked(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const isChecked = await page.locator(selector).isChecked();
  if (isChecked) {
    throw new Error(
      message ?? `Expected element "${selector}" not to be checked`,
    );
  }
}

/**
 * Assert that an element is disabled.
 */
export async function assertDisabled(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const isDisabled = await page.locator(selector).isDisabled();
  if (!isDisabled) {
    throw new Error(
      message ?? `Expected element "${selector}" to be disabled`,
    );
  }
}

/**
 * Assert that an element is enabled.
 */
export async function assertEnabled(
  page: Page,
  selector: string,
  message?: string,
): Promise<void> {
  const isEnabled = await page.locator(selector).isEnabled();
  if (!isEnabled) {
    throw new Error(
      message ?? `Expected element "${selector}" to be enabled`,
    );
  }
}
