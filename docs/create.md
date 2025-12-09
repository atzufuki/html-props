# Create HTML Props

The `@html-props/create` package is a CLI tool to quickly scaffold new `html-props` projects. It sets up a complete
development environment with Deno, HMR (Hot Module Replacement), and a basic project structure.

## Usage

To create a new project, run the following command in your terminal:

```bash
deno run jsr:@html-props/create@^1.0.0-beta <project-name>
```

Replace `<project-name>` with the desired name for your project directory.

### Example

```bash
deno run jsr:@html-props/create@^1.0.0-beta my-awesome-app
cd my-awesome-app
deno task dev
```

## What it Generates

The CLI creates a directory with the following structure:

```
my-awesome-app/
├── deno.json           # Deno configuration and tasks
├── dev_server.ts       # Development server with HMR
├── hmr_client.ts       # HMR client logic
├── public/             # Static assets
│   ├── index.html
│   └── ...
└── src/                # Source code
    ├── main.ts         # Entry point
    ├── App.ts          # Root component
    └── ...
```

### Key Features of the Template

- **Hot Module Replacement (HMR)**: Changes to your code automatically update the browser without a full reload.
- **TypeScript Support**: Fully typed out of the box.
- **No Build Step Required**: Uses Deno's native capabilities for development.
- **Bundling**: Includes a `deno task bundle` command for production builds.
