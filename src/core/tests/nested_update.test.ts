import { assertEquals } from "jsr:@std/assert";
import { HTMLPropsMixin } from "../mixin.ts";
import { prop } from "../prop.ts";

import { Window } from "happy-dom";

// Setup environment with happy-dom
if (!globalThis.document) {
  const happyWindow = new Window();

  // deno-lint-ignore no-explicit-any
  const w = happyWindow as any;

  Object.assign(globalThis, {
    window: happyWindow,
    document: w.document,
    customElements: w.customElements,
    HTMLElement: w.HTMLElement,
    Node: w.Node,
    CustomEvent: w.CustomEvent,
    MutationObserver: w.MutationObserver,
  });
}

// =============================================================================
// Test: Child component updating parent prop in mountedCallback
// =============================================================================
// This test simulates the issue where:
// 1. Parent component renders and creates child component
// 2. Child's mountedCallback is called DURING parent's render/forceUpdate
// 3. Child tries to update parent's prop (e.g., scaffold.loading = true)
// 4. Parent's requestUpdate is called, but updateScheduled is still true
// 5. BUG: The update is skipped entirely, parent never re-renders with new prop value

Deno.test("Nested update: child updating parent prop in mountedCallback should trigger parent re-render", async () => {
  let parentRenderCount = 0;
  let childMountedCalled = false;
  let requestUpdateCalledDuringMount = false;
  let requestUpdateWasBlocked = false;

  // Parent component (like Scaffold)
  class ParentComponent extends HTMLPropsMixin(HTMLElement, {
    loading: prop(false),
  }) {
    render() {
      parentRenderCount++;
      const div = document.createElement("div");
      div.dataset.key = "parent-content";
      div.textContent = `Loading: ${this.loading}`;

      // Create child component
      const child = new ChildComponent();
      child.parent = this;
      div.appendChild(child);

      return div;
    }
  }
  customElements.define("parent-component-nested-test", ParentComponent);

  // Child component (like AssetsPage)
  class ChildComponent extends HTMLPropsMixin(HTMLElement, {
    parent: prop<ParentComponent | null>(null),
  }) {
    mountedCallback() {
      childMountedCalled = true;
      // This simulates: this.app.scaffold.loading = true
      if (this.parent) {
        // Get parent's render count before setting prop
        const beforeCount = parentRenderCount;

        this.parent.loading = true;

        // Explicitly call requestUpdate (like the user did)
        this.parent.requestUpdate();
        requestUpdateCalledDuringMount = true;

        // Check if parent render count changed (it shouldn't during sync call due to updateScheduled)
        if (parentRenderCount === beforeCount) {
          requestUpdateWasBlocked = true;
        }
      }
    }

    render() {
      return document.createTextNode("Child content");
    }
  }
  customElements.define("child-component-nested-test", ChildComponent);

  const parent = new ParentComponent();
  document.body.appendChild(parent);

  // Initial render should have happened
  assertEquals(
    parentRenderCount,
    1,
    "Parent should have rendered once initially",
  );

  // mountedCallback is now called in a microtask, so we need to wait for it
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

  assertEquals(
    childMountedCalled,
    true,
    "Child mountedCallback should have been called",
  );
  assertEquals(
    requestUpdateCalledDuringMount,
    true,
    "requestUpdate should have been called during mount",
  );

  // This is the BUG: requestUpdate was blocked because updateScheduled was true
  // The fix should make this false (requestUpdate should schedule a deferred update)
  console.log("requestUpdateWasBlocked:", requestUpdateWasBlocked);
  console.log(
    "Parent render count before second microtask:",
    parentRenderCount,
  );

  // Wait for another microtask to allow pending updates to process
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

  console.log("Parent render count after microtask:", parentRenderCount);

  // Parent should have re-rendered with loading=true
  // Note: May be 2 or more renders because:
  // 1. Initial forceUpdate
  // 2. Re-render from child setting loading=true
  // 3. Possibly another from explicit requestUpdate() call
  assertEquals(
    parentRenderCount >= 2,
    true,
    "Parent should have re-rendered after child set loading=true (via deferred update)",
  );
  assertEquals(
    parent.loading,
    true,
    "Parent loading prop should be true",
  );

  // Verify the rendered content reflects the new state
  const content = parent.querySelector("[data-key='parent-content']");
  assertEquals(
    content?.textContent?.startsWith("Loading: true"),
    true,
    "Parent should display loading state",
  );

  document.body.removeChild(parent);
});

Deno.test("Nested update: multiple children updating parent should all be reflected", async () => {
  let parentRenderCount = 0;

  class MultiUpdateParent extends HTMLPropsMixin(HTMLElement, {
    counter: prop(0),
  }) {
    render() {
      parentRenderCount++;
      const div = document.createElement("div");
      div.dataset.key = "multi-parent";
      div.textContent = `Counter: ${this.counter}`;

      // Create multiple children that each increment counter
      for (let i = 0; i < 3; i++) {
        const child = new IncrementChild();
        child.parent = this;
        child.dataset.key = `child-${i}`;
        div.appendChild(child);
      }

      return div;
    }
  }
  customElements.define("multi-update-parent-test", MultiUpdateParent);

  class IncrementChild extends HTMLPropsMixin(HTMLElement, {
    parent: prop<MultiUpdateParent | null>(null),
  }) {
    mountedCallback() {
      if (this.parent) {
        this.parent.counter = this.parent.counter + 1;
      }
    }

    render() {
      return null;
    }
  }
  customElements.define("increment-child-test", IncrementChild);

  const parent = new MultiUpdateParent();
  document.body.appendChild(parent);

  // Wait for all microtasks to process
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

  // Counter should have been incremented by all 3 children
  assertEquals(
    parent.counter,
    3,
    "Counter should be 3 after all children incremented it",
  );

  document.body.removeChild(parent);
});

Deno.test("Nested update: deeply nested child updating ancestor should work", async () => {
  let grandparentRenderCount = 0;

  class GrandparentComponent extends HTMLPropsMixin(HTMLElement, {
    status: prop("initial"),
  }) {
    render() {
      grandparentRenderCount++;
      const div = document.createElement("div");
      div.dataset.key = "grandparent";
      div.textContent = `Status: ${this.status}`;

      const middleChild = new MiddleComponent();
      middleChild.grandparent = this;
      div.appendChild(middleChild);

      return div;
    }
  }
  customElements.define("grandparent-component-test", GrandparentComponent);

  class MiddleComponent extends HTMLPropsMixin(HTMLElement, {
    grandparent: prop<GrandparentComponent | null>(null),
  }) {
    render() {
      const div = document.createElement("div");
      div.dataset.key = "middle";

      const deepChild = new DeepChildComponent();
      deepChild.grandparent = this.grandparent;
      div.appendChild(deepChild);

      return div;
    }
  }
  customElements.define("middle-component-test", MiddleComponent);

  class DeepChildComponent extends HTMLPropsMixin(HTMLElement, {
    grandparent: prop<GrandparentComponent | null>(null),
  }) {
    mountedCallback() {
      if (this.grandparent) {
        this.grandparent.status = "updated-by-deep-child";
      }
    }

    render() {
      return document.createTextNode("Deep child");
    }
  }
  customElements.define("deep-child-component-test", DeepChildComponent);

  const grandparent = new GrandparentComponent();
  document.body.appendChild(grandparent);

  assertEquals(
    grandparentRenderCount,
    1,
    "Grandparent should render once initially",
  );

  // Wait for microtask to process the deferred update
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

  assertEquals(
    grandparent.status,
    "updated-by-deep-child",
    "Status should be updated by deep child",
  );
  assertEquals(
    grandparentRenderCount,
    2,
    "Grandparent should have re-rendered",
  );

  document.body.removeChild(grandparent);
});

Deno.test("Nested update: sibling component updating shared parent should work", async () => {
  let parentRenderCount = 0;

  class SharedParent extends HTMLPropsMixin(HTMLElement, {
    message: prop(""),
  }) {
    render() {
      parentRenderCount++;
      const div = document.createElement("div");
      div.dataset.key = "shared-parent";
      div.textContent = this.message;

      // Two sibling children
      const child1 = new SiblingChild();
      child1.parent = this;
      child1.contribution = "Hello";
      div.appendChild(child1);

      const child2 = new SiblingChild();
      child2.parent = this;
      child2.contribution = " World";
      div.appendChild(child2);

      return div;
    }
  }
  customElements.define("shared-parent-test", SharedParent);

  class SiblingChild extends HTMLPropsMixin(HTMLElement, {
    parent: prop<SharedParent | null>(null),
    contribution: prop(""),
  }) {
    mountedCallback() {
      if (this.parent) {
        this.parent.message = this.parent.message + this.contribution;
      }
    }

    render() {
      return null;
    }
  }
  customElements.define("sibling-child-test", SiblingChild);

  const parent = new SharedParent();
  document.body.appendChild(parent);

  // Wait for updates
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
  await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

  assertEquals(
    parent.message,
    "Hello World",
    "Message should be concatenated from both children",
  );

  document.body.removeChild(parent);
});
