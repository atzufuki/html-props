/**
 * Visual Editor Injector
 * Injects interactive editing capabilities into user's HTML
 * Features: element selection, toolbar, drag/drop reordering, copy/paste/duplicate
 */
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  let selectedElement = null;
  let hoveredElement = null;
  let copiedElementHtml = null;
  let panelUpdateTimeout = null;
  let pendingLayersUpdate = false;
  let previewVisible = false;
  let isDraggingElement = false;
  let dragStartElement = null;
  let dropTarget = null;
  let dropPosition = 'after';
  let draggedElementHtml = null;
  let lastDropTargetElement = null; // Track last drop target to clean it up
  let isDraggingFromElements = false; // Track drag from elements panel
  let draggedFromElementsSnippet = ''; // Store the snippet being dragged
  let ghostElement = null; // Ghost element in editor
  let hasMovedToEditor = false; // Track if cursor has moved to editor
  let ghostMoveHandler = null; // Handler for updating ghost position

  // === Clean HTML Preview Container with iframe ===
  // Create a container to display clean HTML preview in iframe
  const previewContainer = document.createElement("div");
  previewContainer.id = "wb-preview-container";
  previewContainer.setAttribute("data-editor-inject", "preview-container");
  previewContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 50vw;
    height: 100vh;
    border-left: 2px solid #ccc;
    overflow: hidden;
    z-index: 9999;
    background: white;
    display: none;
    transition: display 0.2s;
  `;
  document.body.appendChild(previewContainer);

  // Create iframe for clean HTML preview
  const previewIframe = document.createElement("iframe");
  previewIframe.id = "wb-preview-iframe";
  previewIframe.setAttribute("data-editor-inject", "preview-iframe");
  previewIframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    margin: 0;
    padding: 0;
  `;
  previewContainer.appendChild(previewIframe);

  // Drop divider - will be dynamically inserted/removed in DOM
  let currentDropDivider = null;

  // Create DOM adapters for Editor and Preview
  const editorAdapter = new DOMAdapter(document);
  const previewAdapter = new DOMAdapter(previewIframe.contentDocument || previewIframe.contentWindow.document);

  /**
   * Update preview iframe with clean HTML
   * This becomes our source of truth for layers panel
   *
   * The iframe load event signals that custom elements have been registered
   * and the document is ready for layer panel updates
   */
  function setPreviewContent(html) {
    try {
      // Get iframe document
      const iframeDoc =
        previewIframe.contentDocument || previewIframe.contentWindow.document;

      // Mark that we're expecting a load event
      pendingLayersUpdate = false;

      // Write full HTML to iframe
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // After document write, set flag that we have pending layers update
      // This will be processed when iframe signals load completion
      pendingLayersUpdate = true;
    } catch (e) {}
  }

  /**
   * Handle iframe load event
   * Called when iframe has fully loaded and custom elements are registered
   */
  function onPreviewIframeLoad() {
    // If we have a pending layers update (new content was set), send it now
    // This ensures custom elements have fully initialized and their children are rendered
    if (pendingLayersUpdate) {
      pendingLayersUpdate = false;

      // Schedule debounced update with a small delay to let DOM settle
      if (panelUpdateTimeout) {
        clearTimeout(panelUpdateTimeout);
      }

      panelUpdateTimeout = setTimeout(() => {
        sendPanelUpdates();
      }, 50); // Very short delay just for DOM to settle
    }
  }

  // Listen for iframe load event
  previewIframe.addEventListener("load", onPreviewIframeLoad);

  // === Action Toolbar ===
  const actionToolbar = document.createElement("div");
  actionToolbar.id = "wb-action-toolbar";
  actionToolbar.setAttribute("data-editor-inject", "toolbar");
  actionToolbar.style.cssText = `
    position: fixed;
    display: none;
    gap: 4px;
    padding: 4px;
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    z-index: 10001;
    box-shadow: 0 2px 8px var(--vscode-widget-shadow);
  `;

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "codicon codicon-trash";
  deleteBtn.title = "Delete (Del)";
  deleteBtn.style.cssText = `
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 3px;
    transition: background-color 0.2s;
  `;
  deleteBtn.onmouseover = () =>
    (deleteBtn.style.backgroundColor = "var(--vscode-toolbar-hoverBackground)");
  deleteBtn.onmouseout = () =>
    (deleteBtn.style.backgroundColor = "transparent");
  deleteBtn.onclick = () => deleteSelectedElement();

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "codicon codicon-copy";
  copyBtn.title = "Copy (Ctrl+C)";
  copyBtn.style.cssText = `
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 3px;
    transition: background-color 0.2s;
  `;
  copyBtn.onmouseover = () =>
    (copyBtn.style.backgroundColor = "var(--vscode-toolbar-hoverBackground)");
  copyBtn.onmouseout = () => (copyBtn.style.backgroundColor = "transparent");
  copyBtn.onclick = () => copySelectedElement();

  // Paste button
  const pasteBtn = document.createElement("button");
  pasteBtn.className = "codicon codicon-clippy";
  pasteBtn.title = "Paste (Ctrl+V)";
  pasteBtn.style.cssText = `
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 3px;
    transition: background-color 0.2s;
    opacity: 0.3;
  `;
  pasteBtn.disabled = true;
  pasteBtn.onmouseover = () => {
    if (!pasteBtn.disabled) {
      pasteBtn.style.backgroundColor = "var(--vscode-toolbar-hoverBackground)";
    }
  };
  pasteBtn.onmouseout = () => (pasteBtn.style.backgroundColor = "transparent");
  pasteBtn.onclick = () => {
    if (!pasteBtn.disabled) {
      pasteSelectedElement();
    }
  };

  // Duplicate button
  const duplicateBtn = document.createElement("button");
  duplicateBtn.className = "codicon codicon-files";
  duplicateBtn.title = "Duplicate (Ctrl+D)";
  duplicateBtn.style.cssText = `
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 3px;
    transition: background-color 0.2s;
  `;
  duplicateBtn.onmouseover = () =>
    (duplicateBtn.style.backgroundColor =
      "var(--vscode-toolbar-hoverBackground)");
  duplicateBtn.onmouseout = () =>
    (duplicateBtn.style.backgroundColor = "transparent");
  duplicateBtn.onclick = () => duplicateSelectedElement();

  // Drag button
  const dragBtn = document.createElement("button");
  dragBtn.className = "codicon codicon-move";
  dragBtn.title = "Drag (move element)";
  dragBtn.style.cssText = `
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: move;
    font-size: 16px;
    padding: 4px 8px;
    border-radius: 3px;
    transition: background-color 0.2s;
  `;
  dragBtn.onmouseover = () =>
    (dragBtn.style.backgroundColor = "var(--vscode-toolbar-hoverBackground)");
  dragBtn.onmouseout = () =>
    (dragBtn.style.backgroundColor = "transparent");
  dragBtn.onmousedown = (e) => {
    if (!selectedElement) return;
    e.preventDefault();
    
    // Start custom drag
    isDraggingElement = true;
    dragStartElement = selectedElement;
    dragBtn.style.opacity = '0.5';
    showStatus('Drag to target element to move');
    
    // Add visual feedback
    selectedElement.style.opacity = '0.7';
  };

  actionToolbar.appendChild(dragBtn);
  actionToolbar.appendChild(copyBtn);
  actionToolbar.appendChild(pasteBtn);
  actionToolbar.appendChild(duplicateBtn);
  actionToolbar.appendChild(deleteBtn);
  document.body.appendChild(actionToolbar);

  // === Control Bar (always visible) ===
  const controlBar = document.createElement("div");
  controlBar.id = "wb-control-bar";
  controlBar.setAttribute("data-editor-inject", "control-bar");
  controlBar.style.cssText = `
    position: fixed;
    bottom: 8px;
    left: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 10000;
  `;
  document.body.appendChild(controlBar);

  // Toggle preview button
  const togglePreviewBtn = document.createElement("button");
  togglePreviewBtn.id = "wb-toggle-preview";
  togglePreviewBtn.className = "codicon codicon-eye";
  togglePreviewBtn.title = "Toggle Preview (Alt+P)";
  togglePreviewBtn.style.cssText = `
    background-color: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-editorWidget-border);
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 16px;
    padding: 6px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  togglePreviewBtn.onmouseover = () =>
    (togglePreviewBtn.style.backgroundColor =
      "var(--vscode-toolbar-hoverBackground)");
  togglePreviewBtn.onmouseout = () =>
    (togglePreviewBtn.style.backgroundColor =
      "var(--vscode-editorWidget-background)");
  togglePreviewBtn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    togglePreview();
  };
  controlBar.appendChild(togglePreviewBtn);

  // === Status Bar (transient messages) ===
  const statusBar = document.createElement("div");
  statusBar.id = "wb-status-bar";
  statusBar.setAttribute("data-editor-inject", "status-bar");
  statusBar.style.cssText = `
    position: fixed;
    bottom: 8px;
    right: 8px;
    padding: 6px 12px;
    background-color: var(--vscode-statusBarItem-prominentBackground);
    color: var(--vscode-statusBarItem-prominentForeground);
    border-radius: 4px;
    font-size: var(--vscode-font-size);
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    font-family: var(--vscode-font-family);
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  document.body.appendChild(statusBar);

  // Status message span
  const statusMessage = document.createElement("span");
  statusBar.appendChild(statusMessage);

  let statusTimeout = null;

  function showStatus(message) {
    statusMessage.textContent = message;
    statusBar.style.opacity = "0.9";
    statusBar.style.pointerEvents = "auto";

    if (statusTimeout) {
      clearTimeout(statusTimeout);
    }

    statusTimeout = setTimeout(() => {
      statusBar.style.opacity = "0";
      statusBar.style.pointerEvents = "none";
    }, 3000);
  }

  /**
   * Toggle preview container visibility
   */
  function togglePreview() {
    previewVisible = !previewVisible;
    previewContainer.style.display = previewVisible ? "block" : "none";

    // Update button icon and show feedback
    if (previewVisible) {
      togglePreviewBtn.className = "codicon codicon-eye";
      showStatus("Preview visible");
      // Sync Preview DOM to Editor DOM when preview becomes visible
      // syncPreviewToEditor();
    } else {
      togglePreviewBtn.className = "codicon codicon-eye-closed";
      showStatus("Preview hidden");
    }
  }

  // === Make elements interactive ===
  function makeElementsInteractive() {
    const elements = document.body.querySelectorAll(
      "*:not(#wb-action-toolbar):not(#wb-status-bar):not(#wb-control-bar):not([data-editor-inject]):not(script):not(style):not(link):not(meta)"
    );
    elements.forEach((el) => {
      if (!el.classList.contains("wb-hoverable")) {
        el.classList.add("wb-hoverable");

        el.addEventListener("click", (e) => {
          // Don't select if click came from editor-inject element
          if (e.target.closest("[data-editor-inject]")) {
            return;
          }

          e.stopPropagation();
          e.preventDefault();

          // Select the clicked element, not its parent
          selectElement(el);
        });

        // Drop indicator handling is done via mousemove handler at document level
        // NOT per-element mouseover/mouseout to avoid conflicting styling
      }
    });
  }

  // === Show drop indicator (from old implementation) ===
  function showDropIndicator(element, position) {
    // If we have a last target that's different, clean it first
    if (lastDropTargetElement && lastDropTargetElement !== element) {
      lastDropTargetElement.removeAttribute('data-drop-target');
      lastDropTargetElement.style.borderTop = '';
      lastDropTargetElement.classList.remove('wb-drop-target');
    }
    
    // Update tracking and show new indicator
    lastDropTargetElement = element;
    dropTarget = element;
    dropPosition = position;
    editorAdapter.showDropIndicator(element, position);
  }

  // === Hide drop indicator ===
  function hideDropIndicator() {
    // Clean up last target element
    if (lastDropTargetElement) {
      lastDropTargetElement.removeAttribute('data-drop-target');
      lastDropTargetElement.style.borderTop = '';
      lastDropTargetElement.classList.remove('wb-drop-target');
      lastDropTargetElement = null;
    }
    
    // Remove drop divider from DOM if it exists
    if (currentDropDivider && currentDropDivider.parentNode) {
      currentDropDivider.remove();
      currentDropDivider = null;
    }
    
    editorAdapter.hideDropIndicator();
    dropTarget = null;
  }

  /**
   * Show drop divider (blue line indicating insert position)
   * Uses fixed positioning and centers divider between elements
   * @param {Element} element - Target element
   * @param {('before' | 'after' | 'inside')} position - Position relative to element
   */
  function showDropDivider(element, position) {
    // Remove old divider if it exists
    if (currentDropDivider && currentDropDivider.parentNode) {
      currentDropDivider.remove();
    }

    if (position === 'inside') {
      // Don't show divider for inside position
      currentDropDivider = null;
      return;
    }

    // Get element's position and find adjacent element
    const rect = element.getBoundingClientRect();
    const parent = element.parentNode;
    
    let adjacentElement = null;
    let dividerX, dividerY;

    if (position === 'before') {
      // Look for previous sibling
      adjacentElement = element.previousElementSibling;
    } else {
      // Look for next sibling
      adjacentElement = element.nextElementSibling;
    }

    // Determine if elements are in vertical or horizontal layout
    const isHorizontalLayout = adjacentElement && parent && Array.from(parent.children).some(child => {
      const childRect = child.getBoundingClientRect();
      const nextChild = child.nextElementSibling;
      if (nextChild) {
        const nextRect = nextChild.getBoundingClientRect();
        // Check if siblings are side-by-side (horizontal)
        return Math.abs(childRect.top - nextRect.top) < 10 && childRect.left !== nextRect.left;
      }
      return false;
    });

    // Create new divider element
    currentDropDivider = document.createElement('div');
    currentDropDivider.id = 'wb-drop-divider';
    currentDropDivider.setAttribute('data-editor-inject', 'drop-divider');
    
    if (isHorizontalLayout && adjacentElement) {
      // Vertical divider (elements side-by-side)
      const adjacentRect = adjacentElement.getBoundingClientRect();
      
      let leftEdge, rightEdge;
      if (position === 'before') {
        // Divider between adjacentElement (on left) and element (on right)
        leftEdge = adjacentRect.right;
        rightEdge = rect.left;
      } else {
        // Divider between element (on left) and adjacentElement (on right)
        leftEdge = rect.right;
        rightEdge = adjacentRect.left;
      }
      
      // Center divider in the gap
      const gapCenter = (leftEdge + rightEdge) / 2;
      
      currentDropDivider.style.cssText = `
        position: fixed;
        left: ${gapCenter - 1}px;
        top: ${Math.min(rect.top, adjacentRect.top)}px;
        width: 2px;
        height: ${Math.max(rect.height, adjacentRect.height)}px;
        background: #007acc;
        pointer-events: none;
        z-index: 9998;
      `;
    } else {
      // Horizontal divider (elements stacked vertically)
      let topEdge, bottomEdge;
      
      if (adjacentElement) {
        const adjacentRect = adjacentElement.getBoundingClientRect();
        
        if (position === 'before') {
          // Divider between adjacentElement (above) and element (below)
          topEdge = adjacentRect.bottom;
          bottomEdge = rect.top;
        } else {
          // Divider between element (above) and adjacentElement (below)
          topEdge = rect.bottom;
          bottomEdge = adjacentRect.top;
        }
      } else {
        // No adjacent element, use element edge
        topEdge = position === 'before' ? rect.top : rect.bottom;
        bottomEdge = topEdge;
      }
      
      // Center divider in the gap
      const gapCenter = (topEdge + bottomEdge) / 2;
      
      currentDropDivider.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${gapCenter - 1}px;
        width: ${rect.width}px;
        height: 2px;
        background: #007acc;
        pointer-events: none;
        z-index: 9998;
      `;
    }

    // Insert divider into body (for fixed positioning to work)
    document.body.appendChild(currentDropDivider);
  }

  // === Mouse move handler for drag positioning ===
  document.body.addEventListener('mousemove', (e) => {
    if (!isDraggingElement && !isDraggingFromElements) return;
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    const target = e.target;
    if (target === statusBar || target.closest('[data-editor-inject]')) return;
    
    let element = target.closest('.wb-hoverable');
    if (!element) element = document.body;
    
    const elementRect = element.getBoundingClientRect();
    const isContainer = ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'BODY'].includes(element.tagName);
    
    // Check if we're hovering over a gap between children
    const children = Array.from(element.children).filter(child => child.classList && child.classList.contains('wb-hoverable'));
    
    if (children.length > 0 && isContainer) {
      let targetElement = null;
      let targetPosition = 'inside';
      
      // Determine if children are arranged horizontally or vertically
      let isHorizontalLayout = false;
      if (children.length > 1) {
        const child1Rect = children[0].getBoundingClientRect();
        const child2Rect = children[1].getBoundingClientRect();
        isHorizontalLayout = Math.abs(child1Rect.top - child2Rect.top) < 10 && child1Rect.left !== child2Rect.left;
      }
      
      // Find which gap or element position the cursor is in
      for (let i = 0; i < children.length; i++) {
        const childRect = children[i].getBoundingClientRect();
        
        if (isHorizontalLayout) {
          // Horizontal layout: check Y position and X position relative to children
          if (mouseY >= childRect.top && mouseY <= childRect.bottom) {
            if (i === 0 && mouseX < childRect.left) {
              // Before first element
              targetElement = children[i];
              targetPosition = 'before';
              break;
            } else if (i === children.length - 1 && mouseX > childRect.right) {
              // After last element
              targetElement = children[i];
              targetPosition = 'after';
              break;
            } else if (i < children.length - 1) {
              const nextRect = children[i + 1].getBoundingClientRect();
              if (mouseX >= childRect.right && mouseX <= nextRect.left) {
                // In gap between this and next element
                targetElement = children[i];
                targetPosition = 'after';
                break;
              } else if (mouseX >= childRect.left && mouseX < childRect.right) {
                // Over this element
                targetElement = children[i];
                targetPosition = mouseX < childRect.left + childRect.width / 2 ? 'before' : 'after';
                break;
              }
            } else if (mouseX >= childRect.left && mouseX < childRect.right) {
              // Over last element
              targetElement = children[i];
              targetPosition = mouseX < childRect.left + childRect.width / 2 ? 'before' : 'after';
              break;
            }
          }
        } else {
          // Vertical layout: check Y position relative to children
          if (i === 0 && mouseY < childRect.top) {
            // Before first element
            targetElement = children[i];
            targetPosition = 'before';
            break;
          } else if (i === children.length - 1 && mouseY > childRect.bottom) {
            // After last element
            targetElement = children[i];
            targetPosition = 'after';
            break;
          } else if (i < children.length - 1) {
            const nextRect = children[i + 1].getBoundingClientRect();
            if (mouseY >= childRect.bottom && mouseY <= nextRect.top) {
              // In gap between this and next element
              targetElement = children[i];
              targetPosition = 'after';
              break;
            } else if (mouseY >= childRect.top && mouseY < childRect.bottom) {
              // Over this element
              targetElement = children[i];
              targetPosition = mouseY < childRect.top + childRect.height / 2 ? 'before' : 'after';
              break;
            }
          } else if (mouseY >= childRect.top && mouseY < childRect.bottom) {
            // Over last element
            targetElement = children[i];
            targetPosition = mouseY < childRect.top + childRect.height / 2 ? 'before' : 'after';
            break;
          }
        }
      }
      
      // If we found a target element within container, show drop indicator
      if (targetElement) {
        showDropIndicator(targetElement, targetPosition);
        showDropDivider(targetElement, targetPosition);
        return;
      }
      
      // If container is empty or cursor outside all children, drop inside
      showDropIndicator(element, 'inside');
      showDropDivider(element, 'inside');
      return;
    }
    
    // For non-container elements, use before/after based on vertical center
    const elementMiddle = elementRect.top + elementRect.height / 2;
    if (mouseY < elementMiddle) {
      showDropIndicator(element, 'before');
      showDropDivider(element, 'before');
    } else {
      showDropIndicator(element, 'after');
      showDropDivider(element, 'after');
    }
  });

  // === Mouse leave handler - cancel drag from elements panel ===
  document.body.addEventListener('mouseleave', (e) => {
    // If dragging from elements panel and cursor left editor
    if (isDraggingFromElements && ghostElement) {
      
      // Notify editor to end drag
      vscode.postMessage({
        type: 'stopDragFromElements'
      });
      
      // Clean up
      if (ghostMoveHandler) {
        document.removeEventListener('mousemove', ghostMoveHandler);
        ghostMoveHandler = null;
      }
      
      const ghostById = document.getElementById('wb-ghost-element');
      if (ghostById && ghostById.parentNode) {
        ghostById.remove();
      }
      
      hideDropIndicator();
      isDraggingFromElements = false;
      draggedFromElementsSnippet = '';
      dropTarget = null;
      dropPosition = 'after';
      ghostElement = null;
      hasMovedToEditor = false;
      
      showStatus('Drag cancelled');
    }
  });

  // === Mouse up handler for drop ===
  document.body.addEventListener('mouseup', (e) => {
    // Handle elements panel insertion
    if (isDraggingFromElements && dropTarget && draggedFromElementsSnippet) {
      e.preventDefault();
      e.stopPropagation();
      
      // Insert the element at the drop target
      insertElementFromPanel(dropTarget, draggedFromElementsSnippet, dropPosition);
      
      // Clean up - remove ghost element by ID
      const ghostById = document.getElementById('wb-ghost-element');
      if (ghostById && ghostById.parentNode) {
        ghostById.remove();
      }
      
      // Remove mousemove listener
      if (ghostMoveHandler) {
        document.removeEventListener('mousemove', ghostMoveHandler);
        ghostMoveHandler = null;
      }
      
      hideDropIndicator();
      isDraggingFromElements = false;
      draggedFromElementsSnippet = '';
      dropTarget = null;
      dropPosition = 'after';
      ghostElement = null;
      hasMovedToEditor = false;
      
      showStatus('Element inserted');
      return;
    }
    
    // Handle element reordering
    if (!isDraggingElement) return;
    
    if (dragStartElement && dropTarget && dropTarget !== dragStartElement) {
      e.preventDefault();
      e.stopPropagation();
      
      const targetSelector = editorAdapter.getElementSelector(dropTarget);
      moveSelectedElement(targetSelector, dropPosition);
    }
    
    // Clean up - IMPORTANT: hideDropIndicator must be called to clean styling
    hideDropIndicator();
    isDraggingElement = false;
    dragStartElement = null;
    draggedElementHtml = null;
    
    if (selectedElement) {
      selectedElement.style.opacity = '';
      positionActionToolbar(selectedElement);
    }
    dragBtn.style.opacity = '';
    
    showStatus('Ready');
  });

  // === Select element ===
  function selectElement(element) {
    if (!element) return;

    if (selectedElement && selectedElement !== element) {
      try {
        selectedElement.classList.remove("wb-selected");
        selectedElement.style.opacity = '';
      } catch (e) {
        // Element might be detached
      }
    }

    try {
      element.classList.add("wb-selected");
      selectedElement = element;
    } catch (e) {
      return;
    }

    positionActionToolbar(element);
    sendPanelUpdates();
    showStatus(`Selected: <${element.tagName.toLowerCase()}>`);
  }

  /**
   * Send both layers and properties panel updates
   * Creates marked HTML (with data-layers-selected) for both panels
   * Sends two separate messages: updateLayersFromHtml and updatePropertiesFromHtml
   * Also sends selector so backend can find element without relying on DOM marker
   * Debounces to avoid excessive DOM cloning during rapid DOM changes
   */
  function sendPanelUpdates() {
    try {
      const iframeDoc =
        previewIframe.contentDocument || previewIframe.contentWindow.document;

      if (!iframeDoc || !iframeDoc.documentElement) {
        return;
      }

      // Get selectors for selected and hovered elements
      let selectedSelector = "";
      let hoveredSelector = "";
      if (selectedElement) {
        selectedSelector = editorAdapter.getElementSelector(selectedElement);
      }
      if (hoveredElement && hoveredElement !== selectedElement) {
        hoveredSelector = editorAdapter.getElementSelector(hoveredElement);
      }

      // Clone the iframe document before modifying it
      const clonedDoc = iframeDoc.documentElement.cloneNode(true);
      // Use adapter to mark elements and get HTML
      const html = previewAdapter.markElementsInClone(
        clonedDoc,
        selectedSelector,
        hoveredSelector
      );
      // Parse live DOM to JSON (preserves component state and props)
      const domJson = previewAdapter.parseDomToJson(iframeDoc);
      
      // Send to layers panel
      vscode.postMessage({
        type: "updateLayersFromHtml",
        html: html,
        domJson: domJson,
      });

      // Send to properties panel (only if element is selected)
      if (selectedSelector) {
        // For html-props components, extract runtime property values from actual DOM
        let properties = {};
        const actualElement = iframeDoc.querySelector(selectedSelector);
        if (actualElement) {
          const tag = actualElement.tagName.toLowerCase();
          // Custom element (has dash in tag) - extract its properties
          if (tag.includes('-') && actualElement) {
            // Get Own properties only (not inherited DOM stuff)
            const keys = Object.getOwnPropertyNames(actualElement);
            for (const key of keys) {
              // Skip private fields
              if (!key.startsWith('_')) {
                try {
                  const val = actualElement[key];
                  
                  let propertyValue = null;
                  let found = false;

                  // 1. If it's a function, try calling it (could be Signal or getter)
                  if (typeof val === 'function') {
                    try {
                      propertyValue = val.call(actualElement);
                      found = true;
                    } catch (e) {
                      // Ignore
                    }
                  } 
                  // 2. If it's an object with .get(), try that (Signal with .get())
                  else if (typeof val === 'object' && val !== null && typeof val.get === 'function') {
                    try {
                      propertyValue = val.get();
                      found = true;
                    } catch (e) {
                      // Ignore
                    }
                  }
                  // 3. Simple value
                  else if (val !== null && val !== undefined && typeof val !== 'object') {
                    propertyValue = val;
                    found = true;
                  }

                  if (found && propertyValue !== null && propertyValue !== undefined && typeof propertyValue !== 'function') {
                    properties[key] = String(propertyValue);
                  }
                } catch (e) {
                  // Ignore error accessing property
                }
              }
            }
          }
        }

        vscode.postMessage({
          type: "updatePropertiesFromHtml",
          html: html,
          domJson: domJson,
          properties: properties,
        });
      }
    } catch (e) {
      console.error("[sendPanelUpdates] Error:", e);
    }
  }

  // === Position toolbar near element ===
  function positionActionToolbar(element) {
    const rect = element.getBoundingClientRect();
    actionToolbar.style.left = `${rect.right - 40}px`;
    actionToolbar.style.top = `${rect.top - 36}px`;
    actionToolbar.style.display = "flex";
  }

  // === Hide toolbar ===
  function hideActionToolbar() {
    actionToolbar.style.display = "none";
  }

  /**
   * Send DOM structure as JSON to backend for source code update
   * Parses preview DOM and sends it as structured JSON instead of HTML string
   * This preserves element props and attributes without parsing ambiguity
   */
  function syncPreviewToSource() {
    const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
    if (!iframeDoc) return;

    try {
      // Parse live DOM directly (not cloned) to preserve component structure
      const domJson = previewAdapter.parseDomToJson(iframeDoc);
      console.log("[syncPreviewToSource] Sending JSON with", Array.isArray(domJson) ? domJson.length : "non-array", "items");
      vscode.postMessage({
        type: "updateSourceFromHtml",
        domJson: domJson,
      });
    } catch (error) {
      console.error("Error syncing preview to source:", error);
    }
  }

  // === Delete selected element ===
  function deleteSelectedElement() {
    if (!selectedElement) return;

    const tagName = selectedElement.tagName.toLowerCase();
    const selector = editorAdapter.getElementSelector(selectedElement);

    // Delete from both DOMs using adapters
    const editorDeleted = editorAdapter.deleteElement(selector);
    const previewDeleted = previewAdapter.deleteElement(selector);

    if (!editorDeleted && !previewDeleted) {
      showStatus('Failed to delete element');
      return;
    }

    selectedElement = null;
    hideActionToolbar();
    showStatus(`Deleted <${tagName}>`);

    // Sync to source code
    sendPanelUpdates();
    syncPreviewToSource();
  }

  // === Copy selected element ===
  function copySelectedElement() {
    if (!selectedElement) return;

    const selector = editorAdapter.getElementSelector(selectedElement);
    const outerHTML = editorAdapter.copyElement(selector);
    copiedElementHtml = outerHTML.replace(/\s+wb-[a-z-]*(?:="[^"]*")?/g, "");

    pasteBtn.disabled = false;
    pasteBtn.style.opacity = "1";
    pasteBtn.style.cursor = "pointer";

    showStatus(`Copied <${selectedElement.tagName.toLowerCase()}>`);
  }

  // === Paste copied element ===
  function pasteSelectedElement() {
    if (!copiedElementHtml || !selectedElement) return;

    const selector = editorAdapter.getElementSelector(selectedElement);
    const tagName = selectedElement.tagName.toLowerCase();

    // Paste to both DOMs using adapters
    const editorPasted = editorAdapter.pasteElement(copiedElementHtml, selector, "after");
    const previewPasted = previewAdapter.pasteElement(copiedElementHtml, selector, "after");

    if (!editorPasted || !previewPasted) {
      showStatus('Failed to paste element');
      return;
    }

    showStatus(`Pasted <${tagName}>`);
    sendPanelUpdates();

    // Sync to source code
    syncPreviewToSource();
  }

  // === Duplicate selected element ===
  function duplicateSelectedElement() {
    if (!selectedElement) return;

    const tagName = selectedElement.tagName.toLowerCase();
    const selector = editorAdapter.getElementSelector(selectedElement);

    // Duplicate in both DOMs using adapters
    const editorDuplicated = editorAdapter.duplicateElement(selector, "after");
    const previewDuplicated = previewAdapter.duplicateElement(selector, "after");

    if (!editorDuplicated || !previewDuplicated) {
      showStatus('Failed to duplicate element');
      return;
    }

    showStatus(`Duplicated <${tagName}>`);
    sendPanelUpdates();

    // Sync to source code
    syncPreviewToSource();
  }

  // === Move element ===
  function moveSelectedElement(targetSelector, position = 'after') {
    if (!selectedElement) return;

    const tagName = selectedElement.tagName.toLowerCase();
    const selector = editorAdapter.getElementSelector(selectedElement);
    const oldElement = selectedElement; // Save reference to remove selection styling
    
    // Store element data before move (since element reference becomes invalid after clone+remove)
    const elementData = editorAdapter.getElementData(selectedElement);

    // Move in both DOMs using adapters
    const editorMoved = editorAdapter.moveElement(selector, targetSelector, position);
    const previewMoved = previewAdapter.moveElement(selector, targetSelector, position);

    if (editorMoved || previewMoved) {
      // After move, cloned element is not interactive - register again
      makeElementsInteractive();
      
      // After move, find the moved element by tag + attributes (selector may have changed due to move)
      const movedElement = findElementByTagAndAttributes(tagName, elementData.attributes);
      
      // IMPORTANT: Always clear old selection styling before setting new one
      try {
        oldElement.classList.remove('wb-selected');
      } catch (e) {
        // Old element might be detached, that's OK
      }
      
      if (movedElement) {
        selectedElement = movedElement;
        selectElement(movedElement); // Re-select to update toolbar and panels
      } else {
        selectedElement = null;
        hideActionToolbar();
      }
      showStatus(`Moved <${tagName}>`);

      // Sync to source code
      syncPreviewToSource()
    } else {
      showStatus('Move failed: target not found');
    }
  }

  /**
   * Find element by tag and attributes (matching logic from old implementation)
   */
  function findElementByTagAndAttributes(tag, attributes) {
    const elements = document.querySelectorAll(tag);
    
    for (const element of elements) {
      let allMatch = true;
      
      // Check each attribute matches (ignore wb-* classes added by editor)
      for (const [key, value] of Object.entries(attributes)) {
        if (key === 'class') {
          // Compare classes without wb-* prefixes
          const elementClasses = Array.from(element.classList)
            .filter(c => !c.startsWith('wb-'))
            .sort()
            .join(' ');
          const expectedClasses = (value || '')
            .split(' ')
            .filter(c => c)
            .sort()
            .join(' ');
          if (elementClasses !== expectedClasses) {
            allMatch = false;
            break;
          }
        } else if (key !== 'text') {
          const attrValue = element.getAttribute(key);
          if (attrValue !== value) {
            allMatch = false;
            break;
          }
        }
      }
      
      if (allMatch) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Insert element from elements panel
   * Uses DOMAdapter for both Editor and Preview DOM consistency
   */
  function insertElementFromPanel(targetElement, htmlSnippet, position) {
    if (!targetElement || !htmlSnippet) return;

    try {
      // Get target selector first (before any DOM changes)
      const targetSelector = editorAdapter.getElementSelector(targetElement);

      // Insert into Editor DOM using adapter
      const editorInserted = editorAdapter.addElement(htmlSnippet, targetSelector, position);
      if (!editorInserted) {
        showStatus('Failed to insert into editor');
        return;
      }

      // Insert into Preview DOM using adapter
      const previewInserted = previewAdapter.addElement(htmlSnippet, targetSelector, position);
      if (!previewInserted) {
        showStatus('Failed to insert into preview');
        return;
      }

      // Find the newly inserted element in editor DOM
      const container = document.createElement('div');
      container.innerHTML = htmlSnippet;
      const newElement = container.firstElementChild;

      if (!newElement) {
        showStatus('Failed to parse element');
        return;
      }

      // Find and select the newly inserted element by its structure
      // (Query by tag and first attribute if available)
      let insertedElement = null;
      const newElements = document.querySelectorAll(newElement.tagName);
      
      // Find the last matching element (most likely to be our newly inserted one)
      if (newElements.length > 0) {
        insertedElement = newElements[newElements.length - 1];
      } else {
        insertedElement = document.querySelector(newElement.tagName);
      }

      if (insertedElement) {
        // Make all newly inserted elements and children interactive
        makeElementsInteractive();
        
        // Select the inserted element
        selectElement(insertedElement);
      }

      // Update panels with the new structure
      sendPanelUpdates();

      // Sync to source code
      syncPreviewToSource();

      showStatus(`Inserted <${newElement.tagName.toLowerCase()}>`);
    } catch (error) {
      console.error('Error inserting element:', error);
      showStatus(`Error: ${error.message}`);
    }
  }

  /**
   * Remove editor injections from HTML (inverse of setContent)
   */
  function removeEditorInjections(html) {
    let result = html;
    // Remove editor-inject attributes and scripts
    result = result.replace(/\s+data-editor-inject="[^"]*"/g, '');
    result = result.replace(/<script[^>]*data-editor-inject[^>]*>[\s\S]*?<\/script>/g, '');
    result = result.replace(/<link[^>]*data-editor-inject[^>]*>/g, '');
    return result;
  }

  // === Keyboard shortcuts ===
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedElement) {
        e.preventDefault();
        deleteSelectedElement();
      }
    } else if (e.key === "Escape") {
      if (selectedElement) {
        selectedElement.classList.remove("wb-selected");
        selectedElement = null;
        hideActionToolbar();
        showStatus("Deselected");
      }
    } else if (e.altKey) {
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePreview();
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (e.key === "c" && selectedElement) {
        e.preventDefault();
        copySelectedElement();
      } else if (e.key === "v" && copiedElementHtml && selectedElement) {
        e.preventDefault();
        pasteSelectedElement();
      } else if (e.key === "d" && selectedElement) {
        e.preventDefault();
        duplicateSelectedElement();
      }
    }
  });

  // === Deselect on empty space click ===
  document.body.addEventListener("click", (e) => {
    if (e.target === document.body) {
      if (selectedElement) {
        selectedElement.classList.remove("wb-selected");
        selectedElement = null;
        hideActionToolbar();
      }
    }
  });

  // === Handle hover to send to layers panel ===
  document.body.addEventListener("mouseover", (e) => {
    if (
      e.target === document.body ||
      !e.target.closest("[data-editor-inject]")
    ) {
      const el = e.target.closest("[data-editor-inject]") ? null : e.target;

      if (
        el &&
        el !== selectedElement &&
        el.tagName &&
        el.tagName.toUpperCase() !== "BODY" &&
        el.tagName.toUpperCase() !== "HTML"
      ) {
        hoveredElement = el;
        sendPanelUpdates();
      }
    }
  });

  document.body.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget || e.relatedTarget === document.body) {
      hoveredElement = null;
      sendPanelUpdates();
    }
  });

  // === Update toolbar position on scroll ===
  window.addEventListener("scroll", () => {
    if (selectedElement) {
      positionActionToolbar(selectedElement);
    }
  });

  window.addEventListener("message", (event) => {
    const message = event.data;

    switch (message.type) {
      case "init":
        if (message.customElementClassNames) {
          window.customElementClassNames = message.customElementClassNames;
        }

        if (message.selectedElement && message.selectedElement.cssPath) {
          setTimeout(() => {
            const element = document.querySelector(
              message.selectedElement.cssPath
            );
            if (element) {
              selectElement(element);
            }
          }, 50);
        }
        break;

      case "selectElement":
        if (message.cssPath) {
          const element = document.querySelector(message.cssPath);
          if (element) {
            selectElement(element);
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            showStatus("Element not found");
          }
        }
        break;

      case "startDragFromElements":
        // Elements panel started dragging element
        isDraggingFromElements = true;
        draggedFromElementsSnippet = message.html;
        
        // Set up mousemove handler to follow cursor
        ghostMoveHandler = (moveEvent) => {
          // Create ghost on first mousemove if not already created
          if (!hasMovedToEditor && draggedFromElementsSnippet) {
            hasMovedToEditor = true;
            
            const container = document.createElement('div');
            container.innerHTML = draggedFromElementsSnippet;
            ghostElement = container.firstElementChild;
            
            if (ghostElement) {
              ghostElement.id = 'wb-ghost-element';
              ghostElement.style.cssText = `
                position: fixed;
                z-index: 10000;
                pointer-events: none;
                opacity: 0.8;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                border: 2px solid #007acc;
                max-width: 300px;
                max-height: 200px;
              `;
              document.body.appendChild(ghostElement);
            }
          }
          
          // Update ghost position
          if (ghostElement) {
            ghostElement.style.left = (moveEvent.clientX - 50) + 'px';
            ghostElement.style.top = (moveEvent.clientY - 25) + 'px';
          }
        };
        
        document.addEventListener('mousemove', ghostMoveHandler);
        showStatus('Dragging element from panel... drop to insert');
        break;

      case "stopDragFromElements":
        // Elements panel ended dragging
        isDraggingFromElements = false;
        draggedFromElementsSnippet = '';
        
        // Remove mousemove listener
        if (ghostMoveHandler) {
          document.removeEventListener('mousemove', ghostMoveHandler);
          ghostMoveHandler = null;
        }
        
        // Remove ghost element if it exists (by ID to be sure)
        const ghostById = document.getElementById('wb-ghost-element');
        if (ghostById && ghostById.parentNode) {
          ghostById.remove();
        }
        ghostElement = null;
        hasMovedToEditor = false;
        
        // Clear drop indicator
        hideDropIndicator();
        break;

      case "duplicateElement":
        if (message.cssPath) {
          const element = document.querySelector(message.cssPath);
          if (element) {
            selectElement(element);
            duplicateSelectedElement();
          }
        }
        break;

      case "copyElement":
        if (message.cssPath) {
          const element = document.querySelector(message.cssPath);
          if (element) {
            selectElement(element);
            copySelectedElement();
          }
        }
        break;

      case "hoverElement":
        if (message.cssPath === null) {
          document.querySelectorAll(".wb-hover").forEach((el) => {
            el.classList.remove("wb-hover");
          });
        } else if (message.cssPath) {
          const elementToHover = document.querySelector(message.cssPath);
          document.querySelectorAll(".wb-hover").forEach((el) => {
            if (el !== elementToHover) {
              el.classList.remove("wb-hover");
            }
          });
          if (elementToHover && elementToHover !== selectedElement) {
            elementToHover.classList.add("wb-hover");
          }
        }
        break;

      case "moveElement": {
        const { sourceSelector, targetSelector, position } = message;
        
        if (!sourceSelector || !targetSelector) {
          showStatus("Error: Missing source or target selector");
          break;
        }
        
        // Find source element first and select it
        const sourceElement = document.querySelector(sourceSelector);
        if (sourceElement) {
          selectElement(sourceElement);
          // Now move it using the standard movement logic
          moveSelectedElement(targetSelector, position);
        } else {
          showStatus("Source element not found");
        }
        break;
      }

      case "updateProperty": {
        const { selector, propertyName, propertyValue } = message;

        if (!selector) {
          showStatus("Error: No element selector");
          break;
        }

        // Update in both DOMs using adapters
        const editorUpdated = editorAdapter.updateProperty(
          selector,
          propertyName,
          propertyValue
        );
        const previewUpdated = previewAdapter.updateProperty(
          selector,
          propertyName,
          propertyValue
        );
        syncPreviewToSource();

        if (editorUpdated || previewUpdated) {
          showStatus(`Updated ${propertyName}`);
        } else {
          showStatus(`Error: Element not found`);
        }
        break;
      }

      case "setCustomElementClassName":
        if (!window.customElementClassNames) {
          window.customElementClassNames = {};
        }
        window.customElementClassNames[message.tag] = message.className;
        break;

      case "setPreviewContent":
        if (message.html) {
          setPreviewContent(message.html);
        }
        break;
    }
  });

  // === Initialize ===
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeEditor);
  } else {
    initializeEditor();
  }

  function initializeEditor() {
    makeElementsInteractive();
    setupMutationObserver();
    showStatus("Visual Editor Ready");
    vscode.postMessage({ type: "ready" });
  }

  /**
   * Setup MutationObserver to watch for custom element rendering
   * When custom elements render their children, we need to make them interactive
   */
  function setupMutationObserver() {
    // Watch for DOM changes - particularly custom elements rendering
    const observer = new MutationObserver((mutations) => {
      let shouldRefreshInteractive = false;

      for (const mutation of mutations) {
        // If nodes were added and not just text, refresh interactive elements
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            // Element nodes might be custom elements or their children
            if (node.nodeType === 1) { // ELEMENT_NODE
              shouldRefreshInteractive = true;
              break;
            }
          }
        }

        if (shouldRefreshInteractive) break;
      }

      if (shouldRefreshInteractive) {
        // Debounce the refresh slightly to let custom elements fully render
        clearTimeout(mutationDebounce);
        mutationDebounce = setTimeout(() => {
          makeElementsInteractive();
        }, 50);
      }
    });

    // Configuration: watch for changes to child nodes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false,
    });

    return observer;
  }

  let mutationDebounce = null;
})();
