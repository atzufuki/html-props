/**
 * Property Definition Registry
 * Combines HTML attributes (from htmlAttributes.ts) and properties (from htmlProperties.ts)
 * Provides unified interface for querying element metadata
 */

import { getAttributeDefinitions, type AttributeDefinition } from '../schemas/htmlAttributes';
import { getPropertyDefinitions, type PropertyDefinition } from '../schemas/htmlProperties';

export interface MergedPropertyDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'enum' | 'url' | 'color';
  source: 'attribute' | 'property';
  description?: string;
  readonly?: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
}

/**
 * Registry for querying element attributes and properties
 */
export class PropertyDefinitionRegistry {
  /**
   * Get all attributes for an element tag
   * @param tag HTML tag name
   * @returns Array of attribute definitions
   */
  getAttributeDefinitions(tag: string): AttributeDefinition[] {
    return getAttributeDefinitions(tag);
  }

  /**
   * Get all properties for an element tag
   * @param tag HTML tag name
   * @returns Array of property definitions
   */
  getPropertyDefinitions(tag: string): PropertyDefinition[] {
    return getPropertyDefinitions(tag);
  }

  /**
   * Get merged definitions for attributes and properties
   * Properties take precedence if both exist with same name
   * @param tag HTML tag name
   * @returns Array of merged definitions
   */
  getMergedDefinitions(tag: string): MergedPropertyDefinition[] {
    const attributes = this.getAttributeDefinitions(tag);
    const properties = this.getPropertyDefinitions(tag);

    const merged = new Map<string, MergedPropertyDefinition>();

    // Add attributes first
    attributes.forEach((attr: AttributeDefinition) => {
      merged.set(attr.name, {
        name: attr.name,
        type: attr.type as any,
        source: 'attribute',
        description: attr.description,
        defaultValue: attr.defaultValue,
        enumValues: attr.enumValues
      });
    });

    // Add/override with properties
    properties.forEach((prop: PropertyDefinition) => {
      merged.set(prop.name, {
        name: prop.name,
        type: prop.type,
        source: 'property',
        description: prop.description,
        defaultValue: prop.defaultValue,
        enumValues: prop.enumValues
      });
    });

    return Array.from(merged.values());
  }

  /**
   * Get definition for a specific attribute or property
   * @param tag HTML tag name
   * @param name Attribute or property name
   * @returns Definition or undefined
   */
  getDefinition(tag: string, name: string): MergedPropertyDefinition | undefined {
    const merged = this.getMergedDefinitions(tag);
    return merged.find(d => d.name === name);
  }

  /**
   * Check if a property is read-only
   * @param tag HTML tag name
   * @param name Property name
   * @returns True if property is read-only
   */
  isReadOnly(tag: string, name: string): boolean {
    const def = this.getDefinition(tag, name);
    return def?.readonly ?? false;
  }

  /**
   * Get type for a property/attribute
   * @param tag HTML tag name
   * @param name Property/attribute name
   * @returns Type or undefined
   */
  getType(tag: string, name: string): string | undefined {
    const def = this.getDefinition(tag, name);
    return def?.type;
  }
}

// Export singleton instance
export const propertyDefinitionRegistry = new PropertyDefinitionRegistry();
