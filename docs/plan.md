# Mobile Responsiveness Plan for Landing App (Layout Component Approach)

This document outlines the steps to make the HTML Props landing app responsive using declarative layout components,
inspired by Flutter, rather than global CSS classes.

## 1. New Layout Components (`src/layout/`)

We will introduce new primitives to the `@html-props/layout` package to handle responsiveness.

### 1.1 `MediaQuery` (`src/layout/media_query.ts`)

A singleton service that exposes reactive signals for the viewport state.

- **Signals**: `width`, `height`, `devicePixelRatio`.
- **Computed Signals**: `isMobile` (< 768px), `isTablet` (< 1024px), `isDesktop` (>= 1024px).
- **Usage**: `MediaQuery.of(context).isMobile()` (or just `MediaQuery.isMobile()` since we don't have context).

### 1.2 `Responsive` (`src/layout/responsive.ts`)

A component that renders different children based on the current breakpoint.

- **Props**:
  - `mobile`: Node (required/optional fallback)
  - `tablet`: Node (optional)
  - `desktop`: Node (optional)
- **Behavior**: Listens to `MediaQuery` and renders the appropriate child.

### 1.3 `LayoutBuilder` (`src/layout/layout_builder.ts`)

A component that provides the parent's constraints to its builder function, allowing for component-level responsiveness
(not just screen-level).

- **Props**: `builder: (constraints: { width: number, height: number }) => Node`
- **Implementation**: Uses `ResizeObserver` on the host element.

## 2. Refactoring Landing App

We will replace hardcoded layouts with these new responsive components.

### 2.1 Navigation Bar (`src/landing/components/NavBar.ts`)

- Use `Responsive` or `LayoutBuilder` to switch layouts:
  - **Desktop**: `Row` with logo and links.
  - **Mobile**: `Row` with logo and hamburger menu.
- Implement a `Drawer` or `Overlay` for the mobile menu content (might need a new `Overlay` component in `layout` or
  `built-ins`).

### 2.2 Documentation Sidebar (`src/landing/components/Sidebar.ts`)

- **DocsPage Layout**:
  - **Desktop**: `Row([Sidebar, Content])`
  - **Mobile**: `Column([Content])` (Sidebar hidden or moved to drawer).
- Use `Responsive` component in `DocsPage.ts` to handle this structure change.

### 2.3 Landing Page Sections (`src/landing/views/LandingPage.ts`)

- **Hero Section**:
  - Use `Responsive` to switch between `Row` (side-by-side text/image) and `Column` (stacked) if applicable.
  - Or use `LayoutBuilder` to stack buttons when width is narrow.
- **Feature Grid**:
  - The existing `Grid` component is already responsive via CSS Grid (`repeat(auto-fit, ...)`), but we can fine-tune the
    `minmax` values.

## 3. Implementation Plan

1. **Create `src/layout/media_query.ts`**: Implement the signals and listeners.
2. **Create `src/layout/responsive.ts`**: Implement the switching logic.
3. **Create `src/layout/layout_builder.ts`**: Implement `ResizeObserver` logic.
4. **Export new components** in `src/layout/mod.ts`.
5. **Refactor `NavBar.ts`**: Implement responsive switching.
6. **Refactor `DocsPage.ts`**: Implement responsive sidebar layout.
7. **Refactor `LandingPage.ts`**: Adjust Hero and other sections.

## 4. Future Considerations

- **`Drawer` Component**: A standard drawer for mobile navigation.
- **`Wrap` Component**: Like `Row` but wraps to new lines (flex-wrap).
