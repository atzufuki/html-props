(function () {
  
  // Get VS Code API
  const vscode = acquireVsCodeApi();
  
  /** @type {any[]} */
  let treeData = [];
  
  /** @type {string|null} */
  let selectedItemId = null;
  
  /** @type {string|null} */
  let hoveredItemId = null;
  
  /** @type {Set<string>} */
  const expandedItems = new Set();
  
  /** @type {string|null} */
  let draggedItemId = null;
  
  /** @type {any} */
  let draggedLayer = null;
  
  /**
   * Render the tree structure
   */
  function renderTree(layers, parentElement, depth = 0) {
    if (!layers || layers.length === 0) {
      if (depth === 0) {
        parentElement.innerHTML = '<div class="empty-state">No elements in document</div>';
      }
      return;
    }
    
    const ul = document.createElement('ul');
    ul.className = depth === 0 ? 'tree-root' : 'tree-children';
    
    layers.forEach((layer) => {
      const li = document.createElement('li');
      li.className = 'tree-item';
      li.dataset.depth = depth.toString();
      
      // Use CSS path (selector) as unique ID
      const itemId = layer.element.selector;
      li.dataset.itemId = itemId;
      
      // Check if item should be expanded
      const hasChildren = layer.children && layer.children.length > 0;
      if (expandedItems.has(itemId)) {
        li.classList.add('expanded');
      }
      
      // Create item content
      const content = document.createElement('div');
      content.className = 'tree-item-content';
      content.tabIndex = 0;
      content.draggable = true; // Enable drag & drop
      content.setAttribute('role', 'treeitem');
      content.setAttribute('aria-expanded', hasChildren ? (expandedItems.has(itemId) ? 'true' : 'false') : 'false');
      content.setAttribute('aria-level', (depth + 1).toString());
      
      // Chevron icon (for items with children)
      const chevron = document.createElement('span');
      chevron.className = `codicon codicon-chevron-right tree-chevron${hasChildren ? '' : ' hidden'}`;
      content.appendChild(chevron);
      
      // Element icon
      const icon = document.createElement('span');
      const isCustom = layer.element.isCustomElement || false;
      icon.className = `codicon codicon-symbol-class tree-icon${isCustom ? ' custom' : ''}`;
      content.appendChild(icon);
      
      // Label
      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = layer.label;
      content.appendChild(label);
      
      // Description (if any)
      if (layer.description) {
        const description = document.createElement('span');
        description.className = 'tree-description';
        description.textContent = layer.description;
        content.appendChild(description);
      }
      
      // Event listeners
      content.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Toggle expand/collapse if chevron clicked
        if (hasChildren && e.target === chevron) {
          toggleExpand(li, itemId);
        } else {
          selectItem(layer);
        }
      });
      
      content.addEventListener('mouseenter', () => {
        handleHover(layer);
      });
      
      content.addEventListener('mouseleave', () => {
        clearHover();
      });
      
      // Drag & drop events
      content.addEventListener('dragstart', (e) => {
        draggedItemId = itemId;
        draggedLayer = layer;
        content.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', itemId);
      });
      
      content.addEventListener('dragend', () => {
        content.classList.remove('dragging');
        // Remove all drop indicators
        document.querySelectorAll('.drop-before, .drop-after, .drop-inside').forEach(el => {
          el.classList.remove('drop-before', 'drop-after', 'drop-inside');
        });
        draggedItemId = null;
        draggedLayer = null;
      });
      
      content.addEventListener('dragover', (e) => {
        if (!draggedItemId || draggedItemId === itemId) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // Determine drop position based on mouse Y position
        const rect = content.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const position = getDropPosition(mouseY, rect.height, hasChildren);
        
        // Remove previous drop indicators
        document.querySelectorAll('.drop-before, .drop-after, .drop-inside').forEach(el => {
          el.classList.remove('drop-before', 'drop-after', 'drop-inside');
        });
        
        // Add appropriate drop indicator
        if (position === 'inside') {
          li.classList.add('drop-inside');
        } else if (position === 'before') {
          li.classList.add('drop-before');
        } else {
          li.classList.add('drop-after');
        }
      });
      
      content.addEventListener('dragleave', (e) => {
        // Only remove if leaving the content entirely
        if (!content.contains(e.relatedTarget)) {
          li.classList.remove('drop-before', 'drop-after', 'drop-inside');
        }
      });
      
      content.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedItemId || !draggedLayer || draggedItemId === itemId) {
          return;
        }
        
        // Determine drop position
        const rect = content.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const position = getDropPosition(mouseY, rect.height, hasChildren);
        
        // Remove drop indicators
        li.classList.remove('drop-before', 'drop-after', 'drop-inside');
        
        // Send message to extension to reorder elements
        // Use selector (CSS path) for identification, compatible with editor-inject.js moveElement
        vscode.postMessage({
          type: 'moveElement',
          sourceCssPath: draggedLayer.element.selector,
          targetCssPath: layer.element.selector,
          position: position
        });
      });
      
      // Keyboard navigation
      content.addEventListener('keydown', (e) => {
        handleKeyDown(e, li, itemId, layer, hasChildren);
      });
      
      li.appendChild(content);
      
      // Render children
      if (hasChildren) {
        renderTree(layer.children, li, depth + 1);
      }
      
      ul.appendChild(li);
    });
    
    parentElement.appendChild(ul);
  }
  
  /**
   * Toggle expand/collapse state
   */
  function toggleExpand(li, itemId) {
    if (expandedItems.has(itemId)) {
      expandedItems.delete(itemId);
      li.classList.remove('expanded');
      li.querySelector('.tree-item-content')?.setAttribute('aria-expanded', 'false');
    } else {
      expandedItems.add(itemId);
      li.classList.add('expanded');
      li.querySelector('.tree-item-content')?.setAttribute('aria-expanded', 'true');
    }
  }
  
  /**
   * Determine drop position based on mouse Y coordinate
   */
  function getDropPosition(mouseY, height, hasChildren) {
    if (hasChildren && mouseY > height * 0.25 && mouseY < height * 0.75) {
      return 'inside';
    }
    return mouseY < height / 2 ? 'before' : 'after';
  }
  
  /**
   * Select an item and notify editor
   */
  function selectItem(layer) {
    if (!layer || !layer.element) {
      return;
    }
    
    const itemId = layer.element.selector;
    selectedItemId = itemId;
    
    // Update visual selection
    const previouslySelected = document.querySelectorAll('.tree-item-content.selected');
    previouslySelected.forEach(el => {
      el.classList.remove('selected');
    });
    
    const selectedElement = document.querySelector(`[data-item-id="${CSS.escape(itemId)}"] > .tree-item-content`);
    if (selectedElement) {
      selectedElement.classList.add('selected');
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
    
    // Notify extension with cssPath for editor to select element
    vscode.postMessage({
      type: 'selectElement',
      tag: layer.element.tag,
      attributes: layer.element.attributes,
      cssPath: layer.element.selector
    });
  }

  /**
   * Handle hover and notify editor
   */
  function handleHover(layer) {
    if (!layer || !layer.element) {
      return;
    }
    
    const itemId = layer.element.selector;
    if (hoveredItemId === itemId) {
      return;
    }
    
    hoveredItemId = itemId;
    
    // Notify extension
    vscode.postMessage({
      type: 'hoverElement',
      tag: layer.element.tag,
      attributes: layer.element.attributes,
      cssPath: layer.element.selector
    });
  }
  
  /**
   * Clear hover state
   */
  function clearHover() {
    if (hoveredItemId === null) {
      return;
    }
    
    hoveredItemId = null;
    
    // Notify extension
    vscode.postMessage({
      type: 'clearHover'
    });
  }
  
  /**
   * Handle keyboard navigation
   */
  function handleKeyDown(e, li, itemId, layer, hasChildren) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusNextItem(li);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        focusPreviousItem(li);
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !expandedItems.has(itemId)) {
          toggleExpand(li, itemId);
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && expandedItems.has(itemId)) {
          toggleExpand(li, itemId);
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectItem(layer);
        break;
    }
  }
  
  /**
   * Focus next tree item
   */
  function focusNextItem(currentLi) {
    const allItems = Array.from(document.querySelectorAll('.tree-item-content'));
    const currentIndex = allItems.indexOf(currentLi.querySelector('.tree-item-content'));
    
    if (currentIndex < allItems.length - 1) {
      allItems[currentIndex + 1].focus();
    }
  }
  
  /**
   * Focus previous tree item
   */
  function focusPreviousItem(currentLi) {
    const allItems = Array.from(document.querySelectorAll('.tree-item-content'));
    const currentIndex = allItems.indexOf(currentLi.querySelector('.tree-item-content'));
    
    if (currentIndex > 0) {
      allItems[currentIndex - 1].focus();
    }
  }
  
  /**
   * Update tree data
   */
  /**
   * Generate full CSS path for element in the tree
   * Builds path like "html > body > div > p:nth-of-type(2)"
   * This matches the format used by editor-inject.js getElementCSSPath()
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
   * Update tree from raw HTML string
   * HTML may contain data-layers-selected="true" marker on selected element
   * @param {string} html - Full HTML document
   */
  function updateTreeFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const layers = [];
    
    function traverse(element, parentLayers, parentPath = '') {
      if (element.nodeType !== 1) return;
      
      const tag = element.tagName.toLowerCase();
      const attributes = {};
      
      for (const attr of element.attributes) {
        attributes[attr.name] = attr.value;
      }
      
      // Count siblings of same tag to determine if we need nth-of-type
      let index = 0;
      let siblingCount = 1;
      if (element.parentElement) {
        const sameSiblings = Array.from(element.parentElement.children)
          .filter(el => el.tagName === element.tagName);
        index = sameSiblings.indexOf(element);
        siblingCount = sameSiblings.length;
      }
      
      // Generate CSS path for this element
      // Pass both index and siblingCount so selector knows if it needs :nth-of-type()
      const selector = generateSelector(tag, attributes, index, siblingCount, parentPath);
      
      const layer = {
        element: { 
          tag, 
          attributes,
          selector: selector
        },
        label: tag,
        description: attributes.id ? `#${attributes.id}` : (attributes.class ? `.${attributes.class.split(' ')[0]}` : ''),
        children: []
      };
      
      parentLayers.push(layer);
      
      // Traverse children with updated parent path
      for (const child of element.children) {
        traverse(child, layer.children, selector);
      }
    }
    
    if (doc.documentElement) {
      traverse(doc.documentElement, layers);
    }
    
    treeData = layers;
    const container = document.getElementById('layers-tree');
    container.innerHTML = '';
    renderTree(layers, container);
    
    // Navigate to selected element if marked with data-layers-selected
    navigateToSelectedElement();
    
    // Navigate to hovered element if marked with data-layers-hovered
    navigateToHoveredElement();
  }
  
  /**
   * Navigate to element marked with data-layers-selected="true"
   * Expands all parent nodes and highlights the selected element
   */
  function navigateToSelectedElement() {
    // Find the element with data-layers-selected="true" in our tree data
    let selectedPath = [];
    
    function findSelected(layers, path = []) {
      for (const layer of layers) {
        const currentPath = [...path, layer];
        
        if (layer.element.attributes['data-layers-selected'] === 'true') {
          selectedPath = currentPath;
          return true;
        }
        
        if (layer.children && findSelected(layer.children, currentPath)) {
          return true;
        }
      }
      return false;
    }
    
    if (!findSelected(treeData)) {
      return; // No selected element found
    }
    
    // Expand all parent elements
    for (let i = 0; i < selectedPath.length - 1; i++) {
      const layer = selectedPath[i];
      expandedItems.add(layer.element.selector);
    }
    
    // Re-render to show expanded state
    const container = document.getElementById('layers-tree');
    if (container) {
      container.innerHTML = '';
      renderTree(treeData, container);
      
      // Now highlight and scroll to the selected item
      const selectedLayer = selectedPath[selectedPath.length - 1];
      const selectedItemId = selectedLayer.element.selector;
      const selectedLi = document.querySelector(`[data-item-id="${CSS.escape(selectedItemId)}"]`);
      
      if (selectedLi) {
        const content = selectedLi.querySelector('.tree-item-content');
        if (content) {
          content.classList.add('selected');
          content.scrollIntoView({ block: 'nearest' });
          content.focus();
        }
      }
    }
  }

  /**
   * Navigate to element marked with data-layers-hovered="true"
   * Applies hover highlighting without changing selection
   */
  function navigateToHoveredElement() {
    // Find the element with data-layers-hovered="true" in our tree data
    let hoveredPath = [];
    
    function findHovered(layers, path = []) {
      for (const layer of layers) {
        const currentPath = [...path, layer];
        
        if (layer.element.attributes['data-layers-hovered'] === 'true') {
          hoveredPath = currentPath;
          return true;
        }
        
        if (layer.children && findHovered(layer.children, currentPath)) {
          return true;
        }
      }
      return false;
    }
    
    // Clear previous hover
    document.querySelectorAll('.tree-item-content.hover').forEach(el => {
      el.classList.remove('hover');
    });
    
    if (!findHovered(treeData)) {
      return; // No hovered element found
    }
    
    // Highlight the hovered item
    if (hoveredPath.length > 0) {
      const hoveredLayer = hoveredPath[hoveredPath.length - 1];
      const hoveredItemId = hoveredLayer.element.selector;
      const hoveredLi = document.querySelector(`[data-item-id="${CSS.escape(hoveredItemId)}"]`);
      
      if (hoveredLi) {
        const content = hoveredLi.querySelector('.tree-item-content');
        if (content) {
          content.classList.add('hover');
        }
      }
    }
  }

  /**
   * Handle messages from extension
   */
  window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
      case 'updateTreeFromHtml':
        updateTreeFromHtml(message.html);
        break;
        
      case 'clearHover':
        hoveredItemId = null;
        break;
    }
  });
  
  // Initial render
  const container = document.getElementById('layers-tree');
  if (container) {
    container.innerHTML = '<div class="empty-state">Loading...</div>';
  }
  
  // Notify extension that webview is ready
  vscode.postMessage({ type: 'webviewReady' });
})();
