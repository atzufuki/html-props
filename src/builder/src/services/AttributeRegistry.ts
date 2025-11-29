/**
 * Attribute Registry Service
 * Provides attribute definitions for HTML elements and custom elements
 */

import { AttributeDefinition, GLOBAL_ATTRIBUTES, HTML_ATTRIBUTES } from '../schemas/htmlAttributes';
import { CustomElement } from './CustomElementScanner';

export class AttributeRegistry {
  private static customElements: Map<string, CustomElement> = new Map();

  /**
   * Register custom elements and their attributes
   * Called when custom elements are scanned
   */
  static registerCustomElements(elements: CustomElement[]): void {
    for (const element of elements) {
      this.customElements.set(element.tag, element);
    }
  }

  /**
   * Clear all registered custom elements
   */
  static clearCustomElements(): void {
    this.customElements.clear();
  }

  /**
   * Check if a tag is a custom element
   */
  static isCustomElement(tagName: string): boolean {
    const normalizedTag = tagName.toLowerCase();
    return this.customElements.has(normalizedTag);
  }

  /**
   * Get custom element attributes only (no global attributes)
   */
  static getCustomElementAttributes(tagName: string): AttributeDefinition[] {
    const normalizedTag = tagName.toLowerCase();
    const customElement = this.customElements.get(normalizedTag);
    return customElement?.attributes || [];
  }

  /**
   * Get all available attributes for a given HTML element or custom element
   * @param tagName The HTML tag name (e.g., 'button', 'input', 'div')
   * @returns Array of attribute definitions with type information
   */
  static getAttributesForElement(tagName: string): AttributeDefinition[] {
    const normalizedTag = tagName.toLowerCase();
    
    // Check if this is a custom element
    const customElement = this.customElements.get(normalizedTag);
    if (customElement && customElement.attributes) {
      // Return custom element attributes + global attributes
      return [...customElement.attributes, ...GLOBAL_ATTRIBUTES];
    }
    
    // Get standard HTML element-specific attributes
    const elementAttrs = HTML_ATTRIBUTES[normalizedTag] || [];
    
    // Merge with global attributes (element-specific first, then global)
    return [...elementAttrs, ...GLOBAL_ATTRIBUTES];
  }

  /**
   * Get a specific attribute definition by name
   * @param tagName The HTML tag name
   * @param attrName The attribute name
   * @returns Attribute definition or undefined if not found
   */
  static getAttributeDefinition(tagName: string, attrName: string): AttributeDefinition | undefined {
    const attributes = this.getAttributesForElement(tagName);
    return attributes.find(attr => attr.name === attrName);
  }

  /**
   * Check if an attribute is a boolean attribute
   * @param tagName The HTML tag name
   * @param attrName The attribute name
   * @returns True if the attribute is boolean type
   */
  static isBooleanAttribute(tagName: string, attrName: string): boolean {
    const attr = this.getAttributeDefinition(tagName, attrName);
    return attr?.type === 'boolean';
  }

  /**
   * Check if an attribute is an enum attribute
   * @param tagName The HTML tag name
   * @param attrName The attribute name
   * @returns True if the attribute is enum type
   */
  static isEnumAttribute(tagName: string, attrName: string): boolean {
    const attr = this.getAttributeDefinition(tagName, attrName);
    return attr?.type === 'enum';
  }

  /**
   * Get enum values for an attribute
   * @param tagName The HTML tag name
   * @param attrName The attribute name
   * @returns Array of enum values or undefined if not an enum attribute
   */
  static getEnumValues(tagName: string, attrName: string): string[] | undefined {
    const attr = this.getAttributeDefinition(tagName, attrName);
    return attr?.type === 'enum' ? attr.enumValues : undefined;
  }

  /**
   * Get common attributes (id, class, style, title)
   * These are shown first in the properties panel
   */
  static getCommonAttributes(): AttributeDefinition[] {
    return GLOBAL_ATTRIBUTES.filter(attr => 
      ['id', 'class', 'style', 'title'].includes(attr.name)
    );
  }

  /**
   * Get element-specific attributes only (no global attributes)
   * @param tagName The HTML tag name
   * @returns Array of element-specific attribute definitions
   */
  static getElementSpecificAttributes(tagName: string): AttributeDefinition[] {
    const normalizedTag = tagName.toLowerCase();
    
    // Check if this is a custom element
    const customElement = this.customElements.get(normalizedTag);
    if (customElement && customElement.attributes) {
      return customElement.attributes;
    }
    
    return HTML_ATTRIBUTES[normalizedTag] || [];
  }

  /**
   * Get global attributes (excluding common ones that are shown separately)
   * @returns Array of global attribute definitions
   */
  static getOtherGlobalAttributes(): AttributeDefinition[] {
    return GLOBAL_ATTRIBUTES.filter(attr => 
      !['id', 'class', 'style', 'title'].includes(attr.name)
    );
  }
}
