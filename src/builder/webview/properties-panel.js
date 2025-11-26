(function () {
  // Get VS Code API
  const vscode = acquireVsCodeApi();
  
  /** @type {Array} */
  let currentCategories = [];

  /** @type {string|null} */
  let currentSelector = null;

  /**
   * Handle messages from the extension
   */
  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
      case 'updateProperties':
        currentCategories = message.categories || [];
        currentSelector = message.selector || null;
        renderProperties();
        break;
      
      case 'updatePropertiesFromHtml':
        updatePropertiesFromHtml(message.html, message.properties);
        break;
    }
  });

  /**
   * Generate CSS selector for an element
   * Used to identify elements for property editing
   * Matches logic from layers-panel.js
   */
  function generateSelector(tag, attributes, index, siblingCount, parentPath = '') {
    // Build selector for this element
    let selector = tag;
    
    // If element has ID, use it (IDs are unique)
    if (attributes?.id) {
      selector = `#${attributes.id}`;
    } else if (attributes?.class) {
      // Add first class for some identity
      const firstClass = attributes.class.split(' ')[0];
      if (firstClass) {
        selector += `.${firstClass}`;
      }
      // Add nth-of-type only if multiple siblings of same type exist
      if (siblingCount > 1) {
        selector += `:nth-of-type(${index + 1})`;
      }
    } else {
      // No ID or class, use nth-of-type only if multiple siblings
      if (siblingCount > 1) {
        selector += `:nth-of-type(${index + 1})`;
      }
    }
    
    // Build full path from root
    if (parentPath) {
      return `${parentPath} > ${selector}`;
    }
    
    return selector;
  }

  /**
   * Update properties from HTML
   * Parses HTML and finds selected element (marked with data-layers-selected="true")
   * Matches logic from layers-panel.js
   */
  function updatePropertiesFromHtml(html, properties = {}) {
    if (!html) {
      currentCategories = [];
      currentSelector = null;
      renderProperties();
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find selected element and its selector
      let selectedElement = null;
      let selectedSelector = null;
      
      function findSelected(element, parentPath = '') {
        if (element.nodeType !== 1) return false;
        
        // Check if this element is selected
        if (element.getAttribute('data-layers-selected') === 'true') {
          selectedElement = element;
          
          // Generate selector for this element
          const tag = element.tagName.toLowerCase();
          const attributes = {};
          for (const attr of element.attributes) {
            attributes[attr.name] = attr.value;
          }
          
          // Count siblings of same tag
          let index = 0;
          let siblingCount = 1;
          if (element.parentElement) {
            const sameSiblings = Array.from(element.parentElement.children)
              .filter(el => el.tagName === element.tagName);
            index = sameSiblings.indexOf(element);
            siblingCount = sameSiblings.length;
          }
          
          selectedSelector = generateSelector(tag, attributes, index, siblingCount, parentPath);
          return true;
        }
        
        // Build current selector for parent path
        const tag = element.tagName.toLowerCase();
        const attributes = {};
        for (const attr of element.attributes) {
          attributes[attr.name] = attr.value;
        }
        
        let index = 0;
        let siblingCount = 1;
        if (element.parentElement) {
          const sameSiblings = Array.from(element.parentElement.children)
            .filter(el => el.tagName === element.tagName);
          index = sameSiblings.indexOf(element);
          siblingCount = sameSiblings.length;
        }
        
        const currentSelector = generateSelector(tag, attributes, index, siblingCount, parentPath);
        
        // Check children
        for (const child of element.children) {
          if (findSelected(child, currentSelector)) {
            return true;
          }
        }
        
        return false;
      }
      
      if (doc.documentElement) {
        findSelected(doc.documentElement);
      }
      
      if (selectedElement && selectedSelector) {
        // Send message to backend to update properties with runtime values
        vscode.postMessage({
          type: 'elementSelected',
          html: html,
          selector: selectedSelector,
          properties: properties
        });
      } else {
        // No selected element found
        currentCategories = [];
        currentSelector = null;
        renderProperties();
      }
    } catch (error) {
      console.error('Error parsing HTML:', error);
      currentCategories = [];
      currentSelector = null;
      renderProperties();
    }
  }

  /**
   * Render entire properties panel
   * Called whenever data changes
   */
  function renderProperties() {
    const container = document.getElementById('properties-container');
    if (!container) {
      return;
    }

    // Clear container
    container.innerHTML = '';

    if (!currentCategories || currentCategories.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <div><span class="codicon codicon-selection"></span></div>
        <div>Select an element to see properties</div>
      `;
      container.appendChild(emptyState);
      return;
    }

    // Render each category
    currentCategories.forEach(category => {
      container.appendChild(renderCategory(category));
    });
  }

  /**
   * Render a category section
   */
  function renderCategory(category) {
    const section = document.createElement('div');
    section.className = 'section';
    section.dataset.sectionId = category.id;
    
    // Determine icon based on category
    let iconClass = 'codicon-symbol-property';
    if (category.id === 'basic') {
      iconClass = 'codicon-tag';
    } else if (category.id === 'custom') {
      iconClass = 'codicon-star';
    } else if (category.id === 'common' || category.id === 'attributes') {
      iconClass = 'codicon-symbol-color';
    } else if (category.id === 'global') {
      iconClass = 'codicon-symbol-boolean';
    }
    
    // Section header
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <span class="codicon codicon-chevron-down section-chevron"></span>
      <span class="codicon ${iconClass} section-icon${category.id === 'custom' ? ' custom' : ''}"></span>
      <span class="section-title">${category.label}</span>
      ${category.description ? `<span class="section-badge">${category.description}</span>` : ''}
    `;
    
    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });
    
    section.appendChild(header);
    
    // Section items
    const items = document.createElement('div');
    items.className = 'section-items';
    
    if (category.properties && category.properties.length > 0) {
      category.properties.forEach(property => {
        items.appendChild(renderProperty(property));
      });
    }
    
    section.appendChild(items);
    
    return section;
  }

  /**
   * Render a property row
   */
  function renderProperty(property) {
    const row = document.createElement('div');
    row.className = 'property-row';
    row.dataset.propertyName = property.name;
    
    // Label
    const label = document.createElement('div');
    label.className = 'property-label';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = `property-name${property.category === 'custom' ? ' custom' : ''}${property.isSet === false ? ' unset' : ''}`;
    nameSpan.textContent = property.name;
    label.appendChild(nameSpan);
    
    // Add reset button for editable properties that have a value
    if (property.editable && property.isSet !== false && property.type !== 'tag') {
      const reset = document.createElement('span');
      reset.className = 'property-reset';
      reset.textContent = 'reset';
      reset.addEventListener('click', (e) => {
        e.stopPropagation();
        updateProperty(property.name, '', property.type);
      });
      label.appendChild(reset);
    }
    
    row.appendChild(label);
    
    // Property description (if available)
    if (property.description) {
      const desc = document.createElement('div');
      desc.className = 'property-description';
      desc.textContent = property.description;
      row.appendChild(desc);
    }
    
    // Value editor
    if (!property.editable) {
      // Read-only value
      const value = document.createElement('div');
      value.className = 'property-value';
      value.textContent = property.value;
      row.appendChild(value);
    } else {
      // Editable property - render appropriate editor
      row.appendChild(renderPropertyEditor(property));
    }
    
    return row;
  }

  /**
   * Render property editor based on type
   */
  function renderPropertyEditor(property) {
    // Special handling for tag property (read-only)
    if (property.type === 'tag') {
      const value = document.createElement('div');
      value.className = 'property-value';
      value.textContent = property.value;
      return value;
    }
    
    // Type-specific editors
    if (property.attrType === 'boolean') {
      return renderToggle(property);
    } else if (property.attrType === 'enum' && property.enumValues) {
      return renderEnumSelect(property);
    } else if (property.attrType === 'number') {
      return renderNumberInput(property);
    } else if (property.attrType === 'color') {
      return renderColorInput(property);
    } else if (property.attrType === 'url') {
      return renderUrlInput(property);
    } else {
      return renderTextInput(property);
    }
  }

  /**
   * Render toggle switch
   */
  function renderToggle(property) {
    const container = document.createElement('div');
    
    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch';
    
    // Set active state based on value (not isSet - value determines state)
    const isActive = property.value === 'true';
    if (isActive) {
      toggle.classList.add('active');
    }
    
    const knob = document.createElement('div');
    knob.className = 'toggle-knob';
    toggle.appendChild(knob);
    
    toggle.addEventListener('click', () => {
      const newValue = toggle.classList.contains('active') ? 'false' : 'true';
      toggle.classList.toggle('active');
      updateProperty(property.name, newValue, property.type);
    });
    
    container.appendChild(toggle);
    return container;
  }

  /**
   * Render enum select dropdown
   */
  function renderEnumSelect(property) {
    const select = document.createElement('select');
    select.className = 'property-input';
    
    // Add empty option if not set
    if (property.isSet === false) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '(not set)';
      emptyOption.selected = true;
      select.appendChild(emptyOption);
    }
    
    // Add enum options
    (property.enumValues || []).forEach(val => {
      const option = document.createElement('option');
      option.value = val;
      option.textContent = val;
      if (property.value === val) {
        option.selected = true;
      }
      // Mark default value
      if (val === property.defaultValue) {
        option.textContent += ' (default)';
      }
      select.appendChild(option);
    });
    
    select.addEventListener('change', () => {
      updateProperty(property.name, select.value, property.type);
    });
    
    return select;
  }

  /**
   * Render number input with steppers
   */
  function renderNumberInput(property) {
    const container = document.createElement('div');
    container.className = 'number-stepper';
    
    // Decrease button
    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'stepper-btn';
    decreaseBtn.innerHTML = '<span class="codicon codicon-remove"></span>';
    
    // Input field (define before button handlers)
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'property-input';
    input.value = property.value || '0';
    input.placeholder = property.isSet === false ? '(not set)' : '';
    
    decreaseBtn.addEventListener('click', () => {
      const currentValue = parseFloat(input.value) || 0;
      const newValue = currentValue - 1;
      input.value = newValue.toString();
      updateProperty(property.name, input.value, property.type);
    });
    container.appendChild(decreaseBtn);
    
    input.addEventListener('change', () => {
      updateProperty(property.name, input.value, property.type);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        updateProperty(property.name, input.value, property.type);
        input.blur();
      }
    });
    
    input.addEventListener('blur', () => {
      // Validate number on blur
      const num = parseFloat(input.value);
      if (isNaN(num) && input.value !== '') {
        input.value = property.value;
      }
    });
    
    container.appendChild(input);
    
    // Increase button
    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'stepper-btn';
    increaseBtn.innerHTML = '<span class="codicon codicon-add"></span>';
    increaseBtn.addEventListener('click', () => {
      const currentValue = parseFloat(input.value) || 0;
      const newValue = currentValue + 1;
      input.value = newValue.toString();
      updateProperty(property.name, input.value, property.type);
    });
    container.appendChild(increaseBtn);
    
    return container;
  }

  /**
   * Render text input
   */
  function renderTextInput(property) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'property-input';
    input.value = property.value || '';
    input.placeholder = property.isSet === false ? `(not set)` : '';
    
    // Listen for change events (when user clicks away)
    input.addEventListener('change', () => {
      updateProperty(property.name, input.value, property.type);
    });
    
    // Also listen for Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        updateProperty(property.name, input.value, property.type);
        input.blur();
      }
    });
    
    return input;
  }

  /**
   * Render color input
   */
  function renderColorInput(property) {
    const container = document.createElement('div');
    container.className = 'color-input-group';

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'color-swatch';
    colorPicker.value = property.value || '#000000';
    colorPicker.addEventListener('change', () => {
      updateProperty(property.name, colorPicker.value, property.type);
    });
    container.appendChild(colorPicker);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'property-input';
    textInput.value = property.value || '';
    textInput.placeholder = '#FF0000 or red';
    textInput.addEventListener('change', () => {
      updateProperty(property.name, textInput.value, property.type);
    });
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        updateProperty(property.name, textInput.value, property.type);
        textInput.blur();
      }
    });
    container.appendChild(textInput);

    return container;
  }

  /**
   * Render URL input
   */
  function renderUrlInput(property) {
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'property-input';
    input.value = property.value || '';
    input.placeholder = 'https://example.com';
    
    input.addEventListener('change', () => {
      updateProperty(property.name, input.value, property.type);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        updateProperty(property.name, input.value, property.type);
        input.blur();
      }
    });
    
    return input;
  }

  /**
   * Update property value
   */
  function updateProperty(name, value, propertyType) {
    const selector = currentSelector;
    
    vscode.postMessage({
      type: 'updateProperty',
      name,
      value,
      propertyType,
      selector
    });
  }

  /**
   * Initialize on DOM ready
   */
  function init() {
    renderProperties();
    vscode.postMessage({ type: 'webviewReady' });
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
