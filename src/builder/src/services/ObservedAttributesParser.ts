import { AttributeType } from '../schemas/htmlAttributes';

/**
 * Result from parsing observedAttributes
 */
export interface ObservedAttributeInfo {
  attributes: string[];
  types: Record<string, AttributeType>;
  descriptions: Record<string, string>;
}

/**
 * Parses observedAttributes from web component source code
 */
export class ObservedAttributesParser {
  /**
   * Parse observedAttributes from source code
   * Supports both @property JSDoc format and inline @type comments
   */
  static parseObservedAttributes(sourceCode: string): ObservedAttributeInfo {
    const result: ObservedAttributeInfo = {
      attributes: [],
      types: {},
      descriptions: {}
    };

    // Try to find observedAttributes getter with JSDoc
    const match = sourceCode.match(
      /\/\*\*([\s\S]*?)\*\/\s*static\s+(?:override\s+)?get\s+observedAttributes\s*\(\)\s*{\s*return\s*\[([\s\S]*?)\]\s*;/
    );

    if (!match) return result;

    const jsDocText = match[1];
    const attributesStr = match[2];

    // Parse @property entries from JSDoc
    // Format: @property {type} name - description
    const propertyRegex = /@property\s+\{([^}]+)\}\s+(\w+)\s*-\s*(.+)/g;
    let propMatch;

    while ((propMatch = propertyRegex.exec(jsDocText)) !== null) {
      const typeStr = propMatch[1];  // e.g., "string", "boolean", "small" | "medium" | "large"
      const name = propMatch[2];     // e.g., "label", "disabled", "size"
      const description = propMatch[3]; // e.g., "Button text label"

      result.descriptions[name] = description.trim();
      result.types[name] = this._parseAttributeType(typeStr);
    }

    // Parse attribute names from return array
    // Format: ["label", "disabled", "size"] or ['label', 'disabled', 'size']
    const attrRegex = /["'](\w+)["']/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
      const attrName = attrMatch[1];
      result.attributes.push(attrName);

      // If type not already set from @property, check for inline comments
      if (!result.types[attrName]) {
        const inlineMatch = attributesStr.match(
          new RegExp(`["']${attrName}["']\\s*,?\\s*//\\s*@type\\s*\\{([^}]+)\\}`)
        );
        if (inlineMatch) {
          result.types[attrName] = this._parseAttributeType(inlineMatch[1]);
        }
      }
    }

    return result;
  }

  /**
   * Parse attribute type from JSDoc type string
   */
  private static _parseAttributeType(typeStr: string): AttributeType {
    // Handle union types like "small" | "medium" | "large"
    if (typeStr.includes('|')) {
      return 'enum';
    }

    // Handle basic types
    const normalized = typeStr.toLowerCase().trim();
    if (normalized === 'boolean' || normalized === 'bool') return 'boolean';
    if (normalized === 'number' || normalized === 'int' || normalized === 'integer') return 'number';
    if (normalized === 'color') return 'color';
    if (normalized === 'url' || normalized === 'uri') return 'url';

    // Default to string
    return 'string';
  }

  /**
   * Extract enum values from union type string
   * e.g., "small" | "medium" | "large" → ["small", "medium", "large"]
   */
  static extractEnumValues(typeStr: string): string[] {
    if (!typeStr.includes('|')) {
      return [];
    }

    return typeStr
      .split('|')
      .map(val => val.trim())
      .map(val => val.replace(/^["']|["']$/g, '')) // Remove quotes
      .filter(val => val.length > 0);
  }
}
