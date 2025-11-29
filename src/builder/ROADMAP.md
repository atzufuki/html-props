# HTML Props Builder Extension - Roadmap

## Vision

A visual HTML page builder for VSCode that combines the power of code editing
with the simplicity of drag & drop. Build complete web applications using
standard HTML elements and custom web components.

---

## ✅ Phase 1: Foundation (COMPLETED)

### 1.1 Project Setup ✅

- [x] VSCode extension scaffolding with TypeScript
- [x] Build system (esbuild)
- [x] Project structure and configuration
- [x] Documentation framework

### 1.2 Elements Sidebar ✅

- [x] Activity bar icon and sidebar panel
- [x] Built-in HTML elements listing (div, h1, h2, p, button, input, img, a)
- [x] Tree view with collapsible categories
- [x] Element descriptions and tag names
- [x] Refresh command

### 1.3 Custom Elements Support ✅

- [x] VSCode settings for custom element directories
- [x] File system watcher for JS/TS files
- [x] Custom element scanner (`customElements.define()` detection)
- [x] Dynamic tree view categories per design system
- [x] Multiple custom element directories support

### 1.4 Visual Editor Foundation ✅

- [x] Custom text editor provider for .html files
- [x] Webview-based visual editor
- [x] HTML rendering with styles
- [x] Two-way sync (text ↔ visual)
- [x] Element selection by clicking
- [x] Hover effects on elements
- [x] Clean UI (no unnecessary toolbars)
- [x] Floating status indicator
- [x] Auto-open visual editor when HTML Props Builder sidebar opens
- [x] Auto-close visual editor and restore text mode when sidebar closes
- [x] Seamless workflow: sidebar visibility controls editor mode

---

## ✅ Phase 2: Drag & Drop (COMPLETED)

### 2.1 Text Editor Integration ✅

- [x] Enable drag from sidebar tree items
- [x] Implement `DocumentDropEditProvider` for HTML files
- [x] Generate HTML snippets for built-in elements
- [x] Generate HTML snippets for custom elements
- [x] Handle drop position (cursor, selection, between lines)
- [x] Smart indentation and formatting

### 2.2 Visual Editor Drag & Drop ✅

- [x] Injection-based architecture (editor code injected into user's HTML)
- [x] Ghost element with HTML preview during drag
- [x] Visual drop zones between elements
- [x] Drop zone highlighting and hover states (before/after/inside)
- [x] HTML tag matching for precise insertion
- [x] Element selection and hover effects
- [x] Floating status indicator

### 2.3 Element Management ✅

- [x] Element action toolbar on selection (5 buttons: move, copy, paste,
      duplicate, delete)
- [x] Drag selected element to reorder/move within visual editor
- [x] Delete selected element (keyboard shortcut + toolbar button)
- [x] Automatic document formatting after edits
- [x] Undo/redo support (via VSCode document history)
- [x] Copy/paste elements (Ctrl+C / Ctrl+V)
- [x] Duplicate element command (Ctrl+D)
- [x] VSCode theme integration (Codicons + CSS variables)
- [x] Toolbar styling matches editor widgets

---

## 📋 Phase 3: Element Editing (IN PROGRESS)

### 3.1 Properties Panel ✅

- [x] Show selected element properties
- [x] Edit element attributes (id, class, etc.)
- [x] Edit text content
- [x] Common property quick-access (tag, id, class, text)
- [x] Live preview of changes
- [x] VSCode native TreeView (no webview needed)
- [x] Click-to-edit with input boxes
- [x] Real-time DOM and source updates

### 3.2 Enhanced Properties Panel ✅

- [x] Attribute schema system for HTML elements (40+ elements with type
      definitions)
- [x] Show all available attributes (not just existing)
- [x] Type-aware attribute editing:
  - [x] QuickPick for enum attributes (e.g., button type: button|submit|reset)
  - [x] QuickPick for boolean attributes (true/false)
  - [x] InputBox with validation for number attributes
  - [x] InputBox with validation for URL attributes
  - [x] InputBox for string attributes
- [x] Hierarchical category structure (Basic, Custom, Element-Specific, Common,
      Global)
- [x] Custom element `observedAttributes` parsing
- [x] TypeScript union type inference for custom element enums
- [x] Boolean attribute HTML handling (present/absent, no value)
- [x] HTML parser (node-html-parser) for robust element finding

### 3.3 Layers Panel (DOM Tree Navigation) ✅

- [x] VSCode TreeView showing full DOM hierarchy
- [x] Parse HTML with node-html-parser and build tree structure
- [x] Show element type and key attributes (id, class)
- [x] Custom element icons and visual distinction
- [x] Click to select element (sync Layers → Visual Editor)
- [x] Sync selection: Visual Editor → Layers panel (bidirectional navigation)
- [x] Expand/collapse nodes to navigate structure
- [x] Right-click context menu (delete, duplicate, copy)
- [x] Update on document changes (real-time sync)
- [x] **WebView-based Layers Panel (default implementation)** ✅
  - [x] Full hover highlighting (mouse over layer → highlight element in editor)
  - [x] Custom tree rendering with VSCode theme integration
  - [x] Message-based communication with Visual Editor
  - [x] Ready-signal pattern for reliable data loading
  - [x] Context menus, keyboard nav, selection sync
  - [x] Proper serialization of LayerItem data for WebView
  - [x] CSS.escape() for safe attribute handling in selectors
  - [x] Automatic parent expansion when selecting nested elements
  - [x] TreeView implementation removed (WebView is now sole implementation)
- [x] Drag & drop to reorder elements in tree
  - [x] Draggable tree items with visual feedback
  - [x] Drop indicators (before/after/inside)
  - [x] Position-based drop zones (top/middle/bottom)
  - [x] Dual DOM Architecture (Visual DOM + Clean DOM)
  - [x] CSS nth-of-type selectors for element identification
  - [x] DOM manipulation using node-html-parser
  - [x] Complete HTML re-serialization after moves
  - [x] VSCode theme-integrated drop styling

**Implementation Note:** WebView-based panel provides full hover support and
bidirectional navigation. When clicking elements in the visual editor, the
layers panel automatically scrolls to and highlights the corresponding layer,
expanding parent elements as needed. Drag & drop uses a Dual DOM Architecture
where a Clean DOM (parsed from source) is used for element identification via
CSS selectors, while the Visual DOM displays the editor. The extension performs
DOM manipulation on the parsed tree and re-serializes the entire HTML document,
ensuring accurate element positioning.

### 3.4 Custom Element Creation ✅

- [x] "Create Component" command (Ctrl+Shift+C)
- [x] Multi-step QuickPick wizard: tag name, class name, component type, base
      element, properties, file location
- [x] TypeScript file generation with proper imports and structure
- [x] Generate component scaffolds using
      [html-props](https://github.com/atzufuki/html-props) (supports rich props:
      objects, arrays, functions, and
      [signals](https://github.com/atzufuki/html-props/tree/main/src/signals)
      for reactive properties)
- [x] Alternative: Generate vanilla web component boilerplate (attribute-based
      only)
- [x] Generate empty render() method - user builds DOM hierarchy manually after
      creation
- [x] Auto-generate observedAttributes from properties with kebab-case
      conversion
- [x] mapAttributeToSignal helper function generation
- [x] Support for extending built-in elements (HTMLButtonElement,
      HTMLInputElement, etc.)
- [x] Component.define() call with extends option support
- [x] Create component file in custom elements directory
- [x] Auto-open created component file in HTML Props Builder visual editor
- [ ] Auto-reload Elements panel to show new component

### 3.5 HTML Props Component Support ✅

- [x] HtmlPropsAdapter with TypeScript AST manipulation
- [x] Parse TypeScript files with html-props components (detect HTMLProps mixin)
- [x] Detect render() method and parse DOM structure (new html.Div() syntax)
- [x] Content property syntax support: { content: 'text' } or { content: [...] }
- [x] Full CRUD operations: insert, delete, move, update elements
- [x] Code generation with signals and proper TypeScript types
- [x] Visual editor rendering via DevServer and esbuild bundling
- [x] Import maps for JSR dependencies (@html-props/core)
- [x] Layers panel integration for TypeScript components
- [x] **Drag & drop elements into render() method** ✅
  - [x] Tag+attributes messaging from webview to backend
  - [x] handleInsertElementByAttributes method
  - [x] Manual AST node creation with ts.factory
  - [x] Recursive insertion into nested content arrays
  - [x] Proper string literal preservation in generated code
- [x] **Properties panel support for TypeScript components** ✅
  - [x] Detect adapter type (HTML attributes vs HTML Props props)
  - [x] Parse element props from AST (ObjectLiteralExpression)
  - [x] Parse custom element props from external files
  - [x] Signal property detection and type inference
  - [x] Categorize props: Basic, Signals, Event Handlers, Custom
  - [x] UI categories with icons (⚡ signals, 🔧 events)
  - [x] Signal props styled with orange color
  - [x] **Type-aware prop editing via WebView** ✅
    - [x] Toggle switches for boolean properties
    - [x] Dropdown selects for enum properties
    - [x] Number steppers for numeric properties
    - [x] Color pickers with swatches
    - [x] Text/textarea inputs for strings
    - [x] JSON editors for objects/arrays
    - [x] Function code editors with syntax highlighting
  - [x] **Update props via AST transformation** ✅
    - [x] `updateElementProperty()` method in HtmlPropsAdapter
    - [x] AST traversal to find target element (new html.Div() expressions)
    - [x] Property updates in ObjectLiteralExpression
    - [x] Type-safe value creation (string literals, numbers, booleans)
    - [x] Full document re-serialization after updates
    - [x] 13 comprehensive tests covering all property types
    - [x] WebView → Backend → AST → File → Preview pipeline
- [ ] Live preview with signal reactivity (requires runtime bundling)

### 3.6 Direct Text Editing

- [ ] Double-click text element to edit inline (in visual editor)
- [ ] Handle standard HTML text content (p, h1-h6, span, button, etc.)
- [ ] Detect custom element text patterns (label attribute, slot content)
- [ ] ESC to cancel, Enter/click outside to save
- [ ] Live preview while typing
- [ ] Fallback to properties panel for complex cases

### 3.6 Multi-Technology Support ✅

**Goal:** Extend HTML Props Builder to support multiple component technologies
beyond HTML

#### Code Style Adapter Architecture ✅

- [x] **Adapter Interface (ICodeStyleAdapter)** - Abstract contract for all code
      styles
  - [x] Parsing and serialization (parse(), serialize())
  - [x] Element operations (insert, delete, move, update)
  - [x] Code generation (generateSnippet(), generateComponent())
  - [x] Rendering for preview (renderPreview())
  - [x] Element discovery (getBuiltinElements())
  - [x] Metadata extraction (getElementMetadata(), getAllElements())
- [x] **AdapterManager** - Central registry and selection logic
  - [x] Adapter registration (built-in and user-defined)
  - [x] File-based adapter selection (by extension)
  - [x] Priority system for multiple adapters per extension
  - [x] Adapter caching for performance
- [x] **HtmlAdapter** - Built-in HTML adapter (reference implementation)
  - [x] node-html-parser integration
  - [x] Full ICodeStyleAdapter implementation
  - [x] 40+ built-in HTML elements with attributes
  - [x] HTML snippet generation
- [x] **Backend Component Migration**
  - [x] VisualHtmlEditorProvider → uses adapter for all HTML operations
  - [x] ElementsTreeDataProvider → dynamic element list from adapter
  - [x] LayersTreeDataProvider → adapter.parse() and ElementMetadata
  - [x] CodeDropEditProvider (HtmlDropEditProvider) → adapter.generateSnippet()
  - [x] PropertiesTreeDataProvider → already abstracted (no changes needed)
- [x] **Architecture Documentation**
  - [x] ARCHITECTURE.md with adapter system overview
  - [x] Phase 1 and Phase 2 implementation complete
  - [x] ~405 lines of HTML-specific code removed
  - [x] All core operations now code-style agnostic

**Implementation Status:** ✅ COMPLETE

- Phase 1: Adapter infrastructure (ICodeStyleAdapter, AdapterManager,
  HtmlAdapter)
- Phase 2: Full backend integration (all operations use adapters)
- Phase 3: Second code style (html-props, React, etc.) - NEXT

#### Planned Technology Support

- [x] **HTML Files** - Standard HTML documents (current implementation via
      HtmlAdapter)
- [x] **HTML Props Components** - Mixin-based web components with signals
      (HtmlPropsAdapter implemented, rendering pending)
- [ ] **LitElement** - Lit framework components
- [ ] **React** - React functional components (JSX/TSX)
- [ ] **Preact** - Lightweight React alternative
- [ ] **Custom Technologies** - User-defined component systems (future)

#### Core Requirements

- [ ] Technology detection from file extension/content
- [ ] Visual editor rendering for all supported technologies
- [ ] Unified editing operations (insert, delete, move, update) across
      technologies
- [ ] Technology-specific code generation (different syntax for each)
- [ ] Parser abstraction layer (HTML parser, AST parsers for TS/JSX)
- [ ] Render method builders for each technology
- [ ] Live preview with technology-specific rendering

#### HTML Props Implementation ✅ COMPLETE

- [x] HtmlPropsAdapter with TypeScript AST manipulation (ts.createSourceFile,
      ts.factory)
- [x] Parse TypeScript files with html-props components (detect HTMLProps mixin)
- [x] Detect render() method and parse DOM structure (new html.Div() syntax)
- [x] Content property syntax support: { content: 'text' } or { content: [...] }
- [x] Full CRUD operations: insert, delete, move, update elements
- [x] Code generation with signals and proper TypeScript types
- [x] Custom Element Creation wizard integration
- [x] Visual editor for html-props component files (.ts) via DevServer rendering
- [x] Drag & drop elements into render() method with AST transformation
- [ ] Signal binding detection and editing in Properties panel
- [ ] Live preview with signal reactivity

#### Technology Plugin System (Future)

- [ ] Plugin API for custom technology support
- [ ] Technology registration (file patterns, parsers, renderers)
- [ ] Code generation templates per technology
- [ ] Visual editor adapters
- [ ] User-contributed technology packages

**Vision:** HTML Props Builder becomes a universal visual editor for any
component-based web technology, not just HTML. Users can visually build React
components, LitElements, html-props components, or their own custom frameworks
using the same familiar drag & drop interface.

### 3.7 WebView-Based Panels (UX Enhancement) ✅

**Goal:** Migrate Elements and Properties panels from TreeView to WebView for
enhanced UX

#### Elements Panel WebView ✅

- [x] Custom search/filter with fuzzy matching
- [x] Element preview on hover (rendered sample)
- [x] Drag handles and visual feedback
- [x] Category icons and custom styling
- [x] Recent/favorites section (via badges)
- [x] Keyboard navigation (arrow keys, Enter to insert)
- [x] Element descriptions with syntax highlighting
- [x] VSCode theme integration

#### Properties Panel WebView ✅

- [x] Custom-styled property editors (not limited by TreeView)
- [x] Inline color picker for color attributes
- [x] Visual boolean toggles (switch UI)
- [x] Number inputs with increment/decrement buttons
- [x] Enum dropdowns with icons
- [x] Multi-value inputs (e.g., class list with chips)
- [x] Property search/filter (within sections)
- [x] Property grouping with collapsible sections
- [x] Live preview of style changes
- [x] Copy/paste property values (via class chips)
- [x] Reset to default value button
- [x] Property documentation tooltips
- [x] **Bug fix**: Properties panel now loads correctly on element selection

**Configuration:**

- [x] `webBuilder.useTreeViewPanels` setting to toggle between TreeView and
      WebView
- [x] Default: WebView panels (richer UX)
- [x] TreeView panels available for lighter performance

**Benefits:**

- Richer, more intuitive UI components ✅
- Better visual hierarchy and grouping ✅
- Consistent styling with Layers panel ✅
- More interactive controls (sliders, color pickers, etc.) ✅
- Custom keyboard shortcuts ✅
- Better performance for large property lists ✅

**Implementation Notes:**

- PropertiesWebviewViewProvider now properly syncs with
  PropertiesTreeDataProvider
- Debug logging added for troubleshooting property updates
- Proper data flow: updateElement → TreeDataProvider → categorization → WebView
  serialization

---

## 🎨 Phase 4: Code Quality & Refactoring (COMPLETED ✅)

### 4.1 Parser Migration ✅

- [x] Migrate handleUpdateElement to use node-html-parser
- [x] Migrate handleDeleteElement to use parser
- [x] Migrate handleMoveElement to use parser
- [x] Migrate handleInsertElement to use parser
- [x] Remove duplicate findElementInTree method
- [x] DOM-based element manipulation (no string manipulation)
- [x] Full HTML re-serialization workflow
- [x] All HTML element matching now uses robust parser-based approach

### 4.2 Error Handling & Validation ✅

- [x] User-friendly error messages with element context
- [x] Input validation (element tags, positions, property names)
- [x] Try-catch blocks with graceful error recovery
- [x] Specific error messages for each operation type
- [x] HTML validation helper (_validateHtml)
- [x] Document state recovery with undo support

### 4.3 Unit Testing ✅

- [x] Extension activation and command registration tests
- [x] ElementsTreeDataProvider tests (built-in elements, categorization, HTML
      snippets)
- [x] LayersTreeDataProvider tests (HTML parsing, tree building, layer
      selection)
- [x] PropertiesTreeDataProvider tests (property categorization, attribute
      types, value management)
- [x] VisualHtmlEditorProvider DOM manipulation tests (insert, delete, move,
      update)
- [x] Test documentation (src/test/README.md)
- [x] Comprehensive test coverage for all major features

### 4.4 Codebase Quality Improvements ✅

**Goal:** Systematic code quality analysis and fixes (November 17, 2024)

#### Analysis Phase ✅

- [x] Created CODEBASE_ISSUES_ANALYSIS.md documenting all findings
- [x] Analyzed 5 issue categories: type safety, unsafe assertions, console
      logging, missing interfaces, architecture
- [x] Prioritized fixes by severity (HIGH → MEDIUM → LOW)
- [x] Estimated effort and impact for each category

#### Issue #2: Unsafe Type Assertions (HIGH) ✅

- [x] Added optional methods to `ICodeStyleAdapter` interface:
  - [x] `setCurrentFilePath?()` for adapter context
  - [x] `getCustomElementProperties?()` for property extraction
- [x] Replaced all 6 `as any` casts with proper type guards
- [x] Files: ICodeStyleAdapter.ts, VisualHtmlEditorProvider.ts (4 instances),
      HtmlDropEditProvider.ts (1 instance)
- [x] All 58 tests passing after fixes

#### Issue #3: Debug Console Logging (MEDIUM) ✅

- [x] Passed `outputChannel` to 5 providers via constructor:
  - [x] ElementsTreeDataProvider
  - [x] ElementsWebviewViewProvider
  - [x] LayersTreeDataProvider
  - [x] LayersWebviewViewProvider
  - [x] PropertiesWebviewViewProvider
- [x] Replaced 20+ console.log/warn/error statements
- [x] Standardized format: `[ProviderName]` or `[WARN]/[ERROR]` prefix
- [x] Files: 5 provider files updated
- [x] All 58 tests passing after fixes

#### Issue #4: Type Safety (MEDIUM) ✅

- [x] Created `src/types/interfaces.ts` with shared type definitions:
  - [x] `ElementData` - element selection and manipulation
  - [x] `PropertyData` - property values with types
  - [x] `PropertiesData` - element properties for Properties Panel
  - [x] `LayerData` - layer items from Layers panel
  - [x] `InsertElementData` - element insertion data
  - [x] `WebviewMessage` - discriminated union for type-safe messaging
- [x] Replaced `any` types in command handlers (extension.ts):
  - [x] insertElementCommand: `any` → `InsertElementData`
  - [x] deleteLayerElementCommand: `any` → `LayerData`
  - [x] duplicateLayerElementCommand: `any` → `LayerData`
  - [x] copyLayerElementCommand: `any` → `LayerData`
- [x] Updated VisualHtmlEditorProvider method signatures:
  - [x] IPropertiesProvider interface: inline types → `ElementData`,
        `PropertiesData`
  - [x] 7 method signatures updated with proper types
- [x] Files: src/types/interfaces.ts (new), extension.ts,
      VisualHtmlEditorProvider.ts
- [x] All 58 tests passing after fixes

**Results:**

- ✅ All HIGH and MEDIUM severity issues resolved
- ✅ 700+ lines of improved type safety
- ✅ Proper logging infrastructure in place
- ✅ No unsafe type assertions remaining
- ✅ Single source of truth for data shapes
- ✅ Full IDE autocomplete and compile-time checking
- ✅ Codebase health grade: **A+** ⭐

---

## 🚀 Phase 5: Advanced Layout & Styling (FUTURE)

### 5.1 CSS Visual Editor

- [ ] Inline style editor for common properties
- [ ] Color picker for background, text color
- [ ] Spacing controls (margin, padding) with visual feedback
- [ ] Typography controls (font-size, weight, family)
- [ ] Display mode selector (block, flex, grid, inline-block)

### 5.2 Auto-Layout Helpers (Optional)

- [ ] Quick Flexbox setup (row/column, alignment)
- [ ] Quick Grid setup (columns, gap)
- [ ] Alignment guides in visual editor
- [ ] Spacing visualization overlay
- [ ] Image picker for `<img>` elements
- [ ] Icon library integration
- [ ] Asset preview in sidebar

### 5.3 Asset Management (Optional)

- [ ] Image picker for `<img>` elements
- [ ] Icon library integration
- [ ] Asset preview in sidebar

### 5.4 Templates & Snippets (Optional)

- [ ] Common layout templates (header, footer, card, etc.)
- [ ] User-defined component templates
- [ ] Template library
- [ ] Export/import templates

---

## 🔧 Phase 6: Developer Experience (PLANNED)

### 6.1 Code Quality

- [ ] Preserve code formatting and comments
- [ ] Smart indentation
- [ ] Script tag awareness (don't break JS)
- [ ] Style tag awareness (don't break CSS)
- [ ] HTML validation

### 6.2 Custom Element Development

- [ ] Jump to custom element definition
- [ ] Scaffold new custom element with wizard
- [ ] observedAttributes helper
- [ ] Shadow DOM support in visual editor
- [ ] Slot content editing

### 6.3 Export & Preview

- [ ] Preview in external browser
- [ ] Export standalone HTML
- [ ] Generate complete boilerplate (doctype, meta tags)
- [ ] Minification options

---

## 🚀 Phase 7: Advanced Features (FUTURE)

### 6.1 Collaboration & Sharing

- [ ] Component sharing between projects
- [ ] Design system marketplace
- [ ] Import components from URL/npm

### 6.2 Framework Integration (Optional)

- [ ] React component export
- [ ] Vue component export
- [ ] Svelte component export

### 6.3 Accessibility & Performance

- [ ] A11y validation and warnings
- [ ] ARIA attribute suggestions
- [ ] Semantic HTML recommendations
- [ ] Keyboard navigation testing
- [ ] Performance hints (lazy loading, image optimization)

---

## 📊 Current Status

**Completed:** 222 tasks (+19 from HTML Props editing features)\
**In Progress:** 1 task (live signal reactivity)\
**Planned:** 40+ tasks

**Current Focus:** Phase 3.5 - HTML Props Component Support **COMPLETE!**

**Recently Completed:**

- ✅ **Phase 3.5 - HTML Props Properties Panel Editing complete!**
  - Type-aware property editing via rich WebView UI
  - AST transformation for property updates (updateElementProperty)
  - Full props editing pipeline: WebView → Backend → AST → File → Preview
  - 13 comprehensive tests for all property types (string, number, boolean,
    etc.)
  - Toggle switches, dropdowns, number steppers, color pickers
  - Real-time preview updates after property changes
- ✅ **Phase 4.4 - Codebase Quality Improvements complete!**
  - Systematic analysis of code quality issues (CODEBASE_ISSUES_ANALYSIS.md)
  - Fixed unsafe type assertions (6 instances)
  - Replaced console logging with outputChannel (20+ statements)
  - Created shared type interfaces (src/types/interfaces.ts)
  - Replaced all 'any' types in command handlers and methods (11 locations)
  - All 58 tests passing, codebase health grade: A+ ⭐
- ✅ **Phase 3.4 - Custom Element Creation Wizard complete!**
  - Multi-step QuickPick wizard (6 steps)
  - html-props and vanilla component generation
  - TypeScript code generation with signals
  - Auto-open in visual editor
  - Keyboard shortcut (Ctrl+Shift+C)
- ✅ **Phase 3.6 - HtmlPropsAdapter complete!**
  - Full TypeScript AST manipulation (1040 lines)
  - Content property syntax support
  - CRUD operations with AST transformers
  - 33 comprehensive tests (all passing)
- ✅ **Phase 3.6 - Code Style Adapter Architecture complete!**
  - Adapter interface (ICodeStyleAdapter) with 15 methods
  - AdapterManager with priority-based selection
  - HtmlAdapter reference implementation
  - Full backend migration (VisualHtmlEditorProvider, ElementsTreeDataProvider,
    LayersTreeDataProvider, CodeDropEditProvider)
  - ~405 lines of HTML-specific code removed
  - All operations now code-style agnostic
- ✅ Phase 4.3 - Unit Testing complete! Comprehensive test suite covering all
  major features
- ✅ Phase 3.6 - WebView-Based Panels complete!
- ✅ Elements Panel WebView with search, drag handles, and rich UI
- ✅ Properties Panel WebView with color pickers, toggles, number steppers
- ✅ Configuration option to toggle between TreeView and WebView panels
- ✅ Phase 3.3 - Layers Panel Drag & Drop complete!
- ✅ Dual DOM Architecture implementation (Visual + Clean DOM)
- ✅ CSS selector-based element identification
- ✅ DOM manipulation with full HTML re-serialization
- ✅ Phase 4 - Code Quality & Refactoring complete!
- ✅ Phase 4.2 - Error Handling & Validation (comprehensive error recovery)
- ✅ Phase 4.1 - Parser Migration complete (all HTML manipulation uses
  node-html-parser)

**Next Priorities:**

1. **Live Signal Reactivity** - Real-time preview updates when editing Signal
   properties (requires runtime bundling)
2. **Auto-reload Elements Panel** - Refresh Elements panel when new components
   created (15-30 min quick win)
3. **Direct Text Editing** - Double-click to edit text inline (major UX
   improvement)
4. **CSS Visual Editor** - Layout and styling tools with visual feedback
5. **LitElement Support** - Second code style adapter for broader framework
   support

---

## Contributing

This roadmap is subject to change based on user feedback and technical
constraints. Feature requests and suggestions are welcome!

---

## Version History

- **v0.0.1** - Initial release with sidebar and visual editor foundation
- **v0.1.0** - Drag & drop support (upcoming)
- **v0.2.0** - Element editing (planned)
- **v0.3.0** - Layout tools (planned)
- **v1.0.0** - Full feature set (planned)
