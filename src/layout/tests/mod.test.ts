import { assertEquals } from 'jsr:@std/assert';
import { Window } from 'happy-dom';

let Row: any;
let Column: any;
let Center: any;
let Stack: any;
let Container: any;
let MediaQuery: any;
let Responsive: any;
let LayoutBuilder: any;

// @ts-ignore: Deno.test.beforeAll is available in Deno 2+
Deno.test.beforeAll(async () => {
  // Setup environment with happy-dom
  if (!globalThis.document) {
    const happyWindow = new Window();

    // deno-lint-ignore no-explicit-any
    const w = happyWindow as any;

    // Mock ResizeObserver
    class ResizeObserver {
      callback: any;
      constructor(callback: any) {
        this.callback = callback;
      }
      observe(target: any) {
        (globalThis as any).__resizeObservers = (globalThis as any).__resizeObservers || [];
        (globalThis as any).__resizeObservers.push({ target, callback: this.callback });
      }
      disconnect() {}
      unobserve() {}
    }

    Object.assign(globalThis, {
      window: happyWindow,
      document: w.document,
      customElements: w.customElements,
      HTMLElement: w.HTMLElement,
      Node: w.Node,
      CustomEvent: w.CustomEvent,
      MutationObserver: w.MutationObserver,
      ResizeObserver,
    });

    // Helper to trigger resize observer
    (globalThis as any).triggerResize = (target: any, rect: any) => {
      const observers = (globalThis as any).__resizeObservers || [];
      for (const obs of observers) {
        if (obs.target === target) {
          obs.callback([{ contentRect: rect, target }]);
        }
      }
    };

    // Ensure innerWidth/Height are writable for tests
    Object.defineProperty(happyWindow, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(happyWindow, 'innerHeight', { value: 768, writable: true });
  }

  const mod = await import('../mod.ts');
  Row = mod.Row;
  Column = mod.Column;
  Center = mod.Center;
  Stack = mod.Stack;
  Container = mod.Container;
  MediaQuery = mod.MediaQuery;
  Responsive = mod.Responsive;
  LayoutBuilder = mod.LayoutBuilder;
});

Deno.test('Row applies flex styles', () => {
  const row = new Row({
    mainAxisAlignment: 'center',
    gap: '10px',
  });
  document.body.appendChild(row);

  assertEquals(row.style.display, 'flex');
  assertEquals(row.style.flexDirection, 'row');
  assertEquals(row.style.justifyContent, 'center');
  assertEquals(row.style.gap, '10px');
});

Deno.test('Column applies flex styles', () => {
  const col = new Column({
    crossAxisAlignment: 'center',
  });
  document.body.appendChild(col);

  assertEquals(col.style.display, 'flex');
  assertEquals(col.style.flexDirection, 'column');
  assertEquals(col.style.alignItems, 'center');
});

Deno.test('Center applies centering styles', () => {
  const center = new Center();
  document.body.appendChild(center);

  assertEquals(center.style.display, 'flex');
  assertEquals(center.style.justifyContent, 'center');
  assertEquals(center.style.alignItems, 'center');
});

Deno.test('Stack applies grid styles', () => {
  const stack = new Stack({
    alignment: 'center',
  });
  document.body.appendChild(stack);

  assertEquals(stack.style.display, 'grid');
  assertEquals(stack.style.gridTemplateAreas, '"stack"');
  assertEquals(stack.style.placeItems, 'center center');
});

Deno.test('Container applies styles', () => {
  const container = new Container({
    width: '100px',
    height: '100px',
    color: 'red',
    padding: '10px',
  });
  document.body.appendChild(container);

  assertEquals(container.style.width, '100px');
  assertEquals(container.style.height, '100px');
  assertEquals(container.style.backgroundColor, 'red');
  assertEquals(container.style.padding, '10px');
});

Deno.test('MediaQuery updates on resize', () => {
  // Reset to desktop
  (window as any).innerWidth = 1024;
  window.dispatchEvent(new CustomEvent('resize'));

  assertEquals(MediaQuery.isDesktop(), true);
  assertEquals(MediaQuery.isMobile(), false);

  // Change to mobile
  (window as any).innerWidth = 500;
  window.dispatchEvent(new CustomEvent('resize'));

  assertEquals(MediaQuery.isDesktop(), false);
  assertEquals(MediaQuery.isMobile(), true);
});

Deno.test('Responsive renders correct child', () => {
  const mobile = document.createElement('div');
  mobile.id = 'mobile';
  const desktop = document.createElement('div');
  desktop.id = 'desktop';

  const responsive = new Responsive({
    mobile,
    desktop,
  });

  document.body.appendChild(responsive);

  // Set to mobile
  (window as any).innerWidth = 500;
  window.dispatchEvent(new CustomEvent('resize'));

  assertEquals(responsive.firstElementChild?.id, 'mobile');

  // Set to desktop
  (window as any).innerWidth = 1200;
  window.dispatchEvent(new CustomEvent('resize'));

  assertEquals(responsive.firstElementChild?.id, 'desktop');

  responsive.remove();
});

Deno.test('LayoutBuilder provides constraints', () => {
  let constraints: any = null;
  const builder = new LayoutBuilder({
    builder: (c: any) => {
      constraints = c;
      return document.createElement('div');
    },
  });

  document.body.appendChild(builder);

  // Trigger resize observer
  (globalThis as any).triggerResize(builder, { width: 500, height: 300 });

  assertEquals(constraints?.width, 500);
  assertEquals(constraints?.height, 300);

  builder.remove();
});
