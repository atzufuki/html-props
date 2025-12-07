# HTML Props Builder

Visual HTML page building tool for VS Code.

The Builder allows you to construct web pages visually while maintaining full control over the underlying code. It
bridges the gap between design and development by directly manipulating your source files.

## Features

- **Visual Editing**: WYSIWYG interface that writes standard HTML.
- **Code Generation**: Supports editing both static HTML files and the render methods of your `.ts`/`.js` web
  components.
- **Drag & Drop Composition**: Drag elements from the panel into the editor.
- **Property Editing**: Update element attributes in real-time via the Properties panel.
- **Resource Management**: Manage your component libraries and custom elements.

## Getting Started

To open the visual editor:

1. Right-click on any `.html` or `.ts` file in the explorer.
2. Select "Open With...".
3. Choose "HTML Props Builder Visual Editor".

## Resource Management

The Resources panel lets you manage your component libraries. Actions here directly affect your project configuration.

### Adding Resource Directories

Click the "+" button in the Resources panel to select a folder containing your components. **Technical Effect**: This
updates your VS Code workspace settings (`settings.json`) to include the new path.

### Creating Components

Use the category menu (three dots) in the Resources panel to "Create Resource". The wizard guides you through defining
the tag name, properties, and base element. **Technical Effect**: Generates a new TypeScript file with the component
class definition.

## Visual Editing & Code Generation

The visual editor is a WYSIWYG interface that writes standard HTML. It supports editing both static HTML files and the
render methods of your `.ts`/`.js` web components.

### Drag & Drop Composition

Dragging an element from the panel into the editor inserts the corresponding tag into your document. **Technical
Effect**: Inserts the HTML tag at the cursor position or drop target. For `.ts`/`.js` components, it updates the render
method code.

### Property Editing

Selecting an element populates the Properties panel. Changing values here updates the element attributes in real-time.
**Technical Effect**: Updates HTML attributes. For HTMLProps components, these attributes map to reactive props.

## Interface Panels

- **Elements**: Built-in HTML tags.
- **Resources**: Your custom components (configured via settings.json).
- **Layers**: DOM tree view for reordering.
- **Properties**: Attribute editor.

## Development

### Requirements

- Node.js 22.x or newer
- VSCode 1.95.0 or newer

### Installation and Launch

```bash
# Install dependencies
npm install

# Compile project
npm run compile

# Development mode (watch)
npm run watch

# Launch extension
# Press F5 or Run > Start Debugging
```

### Structure

```
src/
├── extension.ts              # Extension entry point
├── views/
│   └── ElementsTreeDataProvider.ts  # Sidebar tree view
└── elements/                 # (coming soon) Element definitions

media/
└── icon.svg                  # Activity bar icon
```

## Technologies

- **TypeScript** - Primary language
- **esbuild** - Bundler
- **VSCode Extension API** - Extension framework

## License

MIT
