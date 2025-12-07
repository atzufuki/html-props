(function () {
  // Get VS Code API
  const vscode = acquireVsCodeApi();

  /** @type {any[]} */
  let builtinElements = [];

  /** @type {Array<{name: string, elements: any[]}>} */
  let customElementCategories = [];

  /** @type {Set<string>} */
  const collapsedCategories = new Set();

  let isDraggingFromPanel = false;
  let ghostElementInPanel = null;

  /**
   * Generate HTML snippet for an element
   */
  function generateSnippet(element) {
    const tag = element.tag;

    // Self-closing tags
    if (tag === 'img') {
      return '<img src="" alt="">';
    } else if (tag === 'input') {
      return '<input type="text">';
    } else if (tag === 'br' || tag === 'hr') {
      return `<${tag}>`;
    }

    // Link
    if (tag === 'a') {
      return '<a href="">Link text</a>';
    }

    // Elements with placeholder content
    const placeholders = {
      'h1': 'Heading 1',
      'h2': 'Heading 2',
      'h3': 'Heading 3',
      'h4': 'Heading 4',
      'h5': 'Heading 5',
      'h6': 'Heading 6',
      'p': 'Paragraph text',
      'button': 'Button',
      'label': 'Label',
      'span': 'Text',
    };

    const placeholder = placeholders[tag] || '';

    if (placeholder) {
      return `<${tag}>${placeholder}</${tag}>`;
    }

    // Generic container elements
    return `<${tag}>\n\t\n</${tag}>`;
  }

  /**
   * Render a category
   */
  function renderCategory(categoryId, categoryTitle, iconClass, elements, isCustom = false, categoryPath = null) {
    const category = document.createElement('div');
    category.className = 'category';
    category.dataset.categoryId = categoryId;

    if (collapsedCategories.has(categoryId)) {
      category.classList.add('collapsed');
    }

    // Category header
    const header = document.createElement('div');
    header.className = 'category-header';

    // Header content (clickable to expand/collapse)
    const headerContent = document.createElement('div');
    headerContent.className = 'category-header-content';
    headerContent.innerHTML = `
      <span class="codicon codicon-chevron-down category-chevron"></span>
      <span class="codicon ${iconClass} category-icon${isCustom ? ' custom' : ''}"></span>
      <span class="category-title">${categoryTitle}</span>
      <span class="category-badge">${elements.length}</span>
    `;

    headerContent.addEventListener('click', () => {
      toggleCategory(categoryId, category);
    });

    header.appendChild(headerContent);

    // Kebab menu button for custom element categories
    if (isCustom && categoryPath) {
      const menuButton = document.createElement('button');
      menuButton.className = 'category-menu-btn';
      menuButton.innerHTML = '<span class="codicon codicon-kebab-horizontal"></span>';
      menuButton.title = `Category options`;
      menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('visible');
      });
      headerContent.appendChild(menuButton);

      // Create dropdown menu
      const dropdownMenu = document.createElement('div');
      dropdownMenu.className = 'category-dropdown-menu';

      const createBtn = document.createElement('button');
      createBtn.className = 'dropdown-menu-item';
      createBtn.innerHTML = '<span class="codicon codicon-add"></span><span>Create Resource</span>';
      createBtn.addEventListener('click', () => {
        createResourceInCategory(categoryPath);
      });
      dropdownMenu.appendChild(createBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'dropdown-menu-item';
      deleteBtn.innerHTML = '<span class="codicon codicon-trash"></span><span>Remove Directory</span>';
      deleteBtn.addEventListener('click', () => {
        deleteDirectory(categoryPath);
      });
      dropdownMenu.appendChild(deleteBtn);

      header.appendChild(dropdownMenu);

      // Close menu when clicking outside
      document.addEventListener('click', () => {
        dropdownMenu.classList.remove('visible');
      });
    }

    category.appendChild(header);

    // Category items
    const items = document.createElement('div');
    items.className = 'category-items';

    elements.forEach((element) => {
      items.appendChild(renderElement(element, isCustom));
    });

    category.appendChild(items);

    return category;
  }

  /**
   * Render an element card
   */
  function renderElement(element, isCustom = false) {
    const card = document.createElement('div');
    card.className = 'element-card';
    card.dataset.tag = element.tag;

    // Check if this is an HTML file (from file extension)
    const isHtmlFile = element.filePath && element.filePath.endsWith('.html');

    // Drag handle - custom drag instead of native (only for non-HTML elements)
    if (!isHtmlFile) {
      const dragHandle = document.createElement('span');
      dragHandle.className = 'codicon codicon-gripper drag-handle';
      dragHandle.style.cursor = 'grab';
      dragHandle.title = 'Drag to insert element';
      card.appendChild(dragHandle);
    }

    // Element icon
    const icon = document.createElement('span');
    let iconClass = 'codicon-symbol-property';
    if (isHtmlFile) {
      iconClass = 'codicon-file-code';
    } else if (isCustom) {
      iconClass = 'codicon-symbol-event';
    }
    icon.className = `codicon ${iconClass} element-icon${isCustom ? ' custom' : ''}`;
    card.appendChild(icon);

    // Element content
    const content = document.createElement('div');
    content.className = 'element-content';

    const nameAndTag = document.createElement('div');
    const name = document.createElement('span');
    name.className = 'element-name';
    name.textContent = element.name;
    nameAndTag.appendChild(name);

    if (!isHtmlFile) {
      const tag = document.createElement('span');
      tag.className = 'element-tag';
      tag.textContent = ` <${element.tag}>`;
      nameAndTag.appendChild(tag);
    }

    content.appendChild(nameAndTag);

    if (element.description) {
      const description = document.createElement('div');
      description.className = 'element-description';
      description.textContent = element.description;
      content.appendChild(description);
    }

    card.appendChild(content);

    // Click behavior
    if (element.filePath) {
      // HTML files or custom elements: open their source file
      card.addEventListener('click', () => {
        openElementFile(element.filePath);
      });
      // Make HTML files look clickable
      if (isHtmlFile) {
        card.style.cursor = 'pointer';
      }
    }
    // Built-in elements: only allow custom drag (no click behavior)

    // Custom drag & drop using messages (only for non-HTML elements)
    if (!isHtmlFile) {
      const dragHandle = card.querySelector('.drag-handle');
      dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const snippet = generateSnippet(element);

        // Create ghost element immediately for visual feedback
        const ghostContainer = document.createElement('div');
        ghostContainer.innerHTML = snippet;
        let ghostElement = ghostContainer.firstElementChild;
        let handleMouseMove = null;

        if (ghostElement) {
          ghostElement.id = 'wb-ghost-element'; // Mark so editor can find it
          ghostElement.style.cssText = `
            position: fixed;
            top: -1000px;
            left: -1000px;
            z-index: 10000;
            pointer-events: none;
            opacity: 0.8;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            border: 2px solid #007acc;
            max-width: 300px;
            max-height: 200px;
          `;

          document.body.appendChild(ghostElement);
          ghostElementInPanel = ghostElement;
          console.log('[elements-panel] ghost created');

          // Track mouse move to update ghost position
          handleMouseMove = (moveEvent) => {
            if (!isDraggingFromPanel) return;

            // Update ghost position while in panel
            if (ghostElement && ghostElement.parentNode) {
              ghostElement.style.left = (moveEvent.clientX - 50) + 'px';
              ghostElement.style.top = (moveEvent.clientY - 25) + 'px';
            }
          };

          document.addEventListener('mousemove', handleMouseMove);
        }

        // Notify editor to start virtual drag
        isDraggingFromPanel = true;
        vscode.postMessage({
          type: 'startDragFromElements',
          html: snippet,
          tag: element.tag,
        });

        card.classList.add('dragging');

        // Track mouse up to end drag
        const handleMouseUp = () => {
          console.log('[elements-panel] mouseup event');
          isDraggingFromPanel = false;
          card.classList.remove('dragging');

          // Remove mousemove listener
          if (handleMouseMove) {
            document.removeEventListener('mousemove', handleMouseMove);
          }

          // Clean up ghost in panel if it still exists
          if (ghostElement && ghostElement.parentNode) {
            ghostElement.remove();
            console.log('[elements-panel] ghost cleanup on mouseup');
          }
          ghostElementInPanel = null;

          // Notify editor that drag ended
          vscode.postMessage({
            type: 'stopDragFromElements',
          });

          // Remove the listener
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mouseup', handleMouseUp);
      });
    }

    return card;
  }

  /**
   * Open element source file
   */
  function openElementFile(filePath) {
    vscode.postMessage({
      type: 'openElement',
      filePath: filePath,
    });
  }

  /**
   * Toggle category expand/collapse
   */
  function toggleCategory(categoryId, categoryElement) {
    if (collapsedCategories.has(categoryId)) {
      collapsedCategories.delete(categoryId);
      categoryElement.classList.remove('collapsed');
    } else {
      collapsedCategories.add(categoryId);
      categoryElement.classList.add('collapsed');
    }
  }

  /**
   * Insert element
   */
  function insertElement(element) {
    vscode.postMessage({
      type: 'insertElement',
      element: element,
    });
  }

  /**
   * Create new resource (main button)
   */
  function createResource() {
    vscode.postMessage({
      type: 'createResource',
    });
  }

  /**
   * Create resource in specific category
   */
  function createResourceInCategory(categoryPath) {
    vscode.postMessage({
      type: 'createResourceInCategory',
      categoryPath: categoryPath,
    });
  }

  /**
   * Delete a directory from settings
   */
  function deleteDirectory(directoryPath) {
    vscode.postMessage({
      type: 'deleteDirectory',
      directoryPath: directoryPath,
    });
  }

  /**
   * Render all elements
   */
  function renderElements() {
    const container = document.getElementById('elements-container');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    // Render built-in elements
    if (builtinElements.length > 0) {
      container.appendChild(
        renderCategory('builtin', 'Built-in Elements', 'codicon-symbol-class', builtinElements, false, null),
      );
    }

    // Render custom element categories
    customElementCategories.forEach((category) => {
      container.appendChild(
        renderCategory(
          `custom-${category.name}`,
          category.name,
          'codicon-folder',
          category.elements,
          true,
          category.path, // Pass the directory path
        ),
      );
    });

    // Show empty state if no elements
    if (builtinElements.length === 0 && customElementCategories.length === 0) {
      container.innerHTML = '<div class="empty-state">No elements available</div>';
    }
  }

  /**
   * Filter elements based on search query
   */
  function filterElements(query) {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      // Show all elements
      document.querySelectorAll('.category').forEach((cat) => {
        cat.classList.remove('hidden');
      });
      document.querySelectorAll('.element-card').forEach((card) => {
        card.classList.remove('hidden');
      });

      // Remove no-results message
      const noResults = document.querySelector('.no-results');
      if (noResults) {
        noResults.remove();
      }
      return;
    }

    let hasVisibleElements = false;

    // Filter each category
    document.querySelectorAll('.category').forEach((category) => {
      const items = category.querySelectorAll('.element-card');
      let visibleCount = 0;

      items.forEach((card) => {
        const name = card.querySelector('.element-name')?.textContent?.toLowerCase() || '';
        const tag = card.dataset.tag?.toLowerCase() || '';
        const description = card.querySelector('.element-description')?.textContent?.toLowerCase() || '';

        if (
          name.includes(normalizedQuery) ||
          tag.includes(normalizedQuery) ||
          description.includes(normalizedQuery)
        ) {
          card.classList.remove('hidden');
          visibleCount++;
          hasVisibleElements = true;
        } else {
          card.classList.add('hidden');
        }
      });

      // Hide category if no visible items
      if (visibleCount === 0) {
        category.classList.add('hidden');
      } else {
        category.classList.remove('hidden');
        // Expand category when searching
        category.classList.remove('collapsed');
      }

      // Update badge count
      const badge = category.querySelector('.category-badge');
      if (badge) {
        badge.textContent = visibleCount.toString();
      }
    });

    // Show no-results message
    const container = document.getElementById('elements-container');
    let noResults = container.querySelector('.no-results');

    if (!hasVisibleElements) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
          <div><span class="codicon codicon-search"></span></div>
          <div>No elements found matching "${query}"</div>
        `;
        container.appendChild(noResults);
      }
    } else if (noResults) {
      noResults.remove();
    }
  }

  /**
   * Update elements data
   */
  function updateElements(data) {
    builtinElements = data.builtinElements || [];
    customElementCategories = data.customElementCategories || [];

    renderElements();
  }

  /**
   * Handle messages from extension
   */
  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
      case 'updateElements':
        updateElements(message);
        break;
    }
  });

  // Setup search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterElements(e.target.value);
    });

    // Clear on Escape
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        filterElements('');
        searchInput.blur();
      }
    });
  }

  // Setup create component button
  const createBtn = document.getElementById('create-component-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      createResource();
    });
  }

  // Handle mouse leaving the panel during drag
  const resourcesPanel = document.querySelector('.resources-panel');
  if (resourcesPanel) {
    resourcesPanel.addEventListener('mouseleave', () => {
      // When mouse leaves the panel and we're dragging, remove ghost from panel
      if (isDraggingFromPanel && ghostElementInPanel && ghostElementInPanel.parentNode) {
        ghostElementInPanel.remove();
        console.log('[resources-panel] ghost removed on mouseleave');
        ghostElementInPanel = null;
      }

      // Also remove dragging class from any element
      document.querySelectorAll('.element-card.dragging').forEach((card) => {
        card.classList.remove('dragging');
        console.log('[resources-panel] removed dragging class on mouseleave');
      });
    });
  }

  // Initial render
  const container = document.getElementById('elements-container');
  if (container) {
    container.innerHTML = '<div class="empty-state">Loading...</div>';
  }

  // Notify extension that webview is ready
  vscode.postMessage({ type: 'webviewReady' });
})();
