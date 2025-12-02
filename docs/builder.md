# Builder

Visual HTML page building tool for VS Code.

![HTML Props Builder Interface](builder_1.png)

The Builder allows you to construct web pages visually while maintaining full control over the underlying code. It
bridges the gap between design and development by directly manipulating your source files.

## Getting Started

To open the visual editor:

- Right-click on any .html or .ts file in the explorer
- Select "Open With..."
- Choose "HTML Props Builder Visual Editor"

## Resource Management

The Resources panel lets you manage your component libraries. Actions here directly affect your project configuration.

### Adding Resource Directories

Click the "+" button in the Resources panel to select a folder containing your components.

Technical Effect: This updates your VS Code workspace settings (settings.json) to include the new path:

```json
{
  "webBuilder.resourceDirectories": [
    {
      "name": "My Components",
      "path": "./src/components"
    }
  ]
}
```

### Creating Components

Use the category menu (three dots) in the Resources panel to "Create Resource". The wizard guides you through defining
the tag name, properties, and base element.

Technical Effect: Generates a new TypeScript file with the component class definition:

```typescript
// Generated file: src/components/MyButton.ts
class MyButton extends HTMLPropsMixin(HTMLElement, {
  label: { type: String, default: '' },
}) {
  // ...
}
MyButton.define('my-button');
```

### Supported Resource Types

- **Custom Components (.ts/.js)**: Scanned via regex for `customElements.define()` or `HTMLProps`.
- **HTML Templates (.html)**: Static files treated as insertable templates.

## Visual Editing & Code Generation

The visual editor is a WYSIWYG interface that writes standard HTML. It supports editing both static HTML files and the
render methods of your .ts/.js web components.

### Drag & Drop Composition

Dragging an element from the panel into the editor inserts the corresponding tag into your document.

Technical Effect: Inserts the HTML tag at the cursor position or drop target. For .ts/.js components, it updates the
render method code.

```typescript
<!-- HTML File -->
<div class="container">
  <my-button></my-button>
</div>

// TypeScript Component (html-props)
new Div({
  className: 'container',
  content: [
    new MyButton({})
  ]
})
```

### Property Editing

Selecting an element populates the Properties panel. Changing values here updates the element attributes in real-time.

Technical Effect: Updates HTML attributes. For HTMLProps components, these attributes map to reactive props.

```typescript
<!-- HTML File -->
<my-counter count="5"></my-counter>

// TypeScript Component (html-props)
new MyCounter({
  count: 5
})
```

### Interface Panels

- Elements: Built-in HTML tags.
- Resources: Your custom components (configured via settings.json).
- Layers: DOM tree view for reordering.
- Properties: Attribute editor.
