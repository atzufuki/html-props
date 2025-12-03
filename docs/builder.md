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
```
