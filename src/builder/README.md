# HTML Props Builder Extension

Visual HTML page building tool for VSCode. Create web applications with a drag &
drop interface using standardized HTML elements and custom web components.

## Features

- 📦 **Built-in HTML Elements** - Ready-to-use collection of HTML5 elements
- 🎨 **Visual Builder** (coming soon) - Drag & drop interface
- 🔧 **Custom Elements** (coming soon) - Create and use your own web components
- 💾 **HTML Generation** (coming soon) - Save your created pages as HTML files

## Usage

1. Open the HTML Props Builder panel from the left sidebar (activity bar)
2. Browse built-in HTML elements
3. In future versions: drag elements to the visual builder

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

## Roadmap

- [x] Sidebar panel for built-in elements
- [ ] Visual drag & drop builder
- [ ] Custom element creation
- [ ] HTML code generation
- [ ] Real-time preview

## License

MIT
