import { assertEquals, assertExists } from 'jsr:@std/assert';
import { setup } from './setup.ts';

Deno.test('Landing page - LiveDemo renders and survives resize', async () => {
  await setup();

  const { LandingPage } = await import('../views/LandingPage.ts');
  const landingPage = new LandingPage();
  document.body.appendChild(landingPage);

  // Wait for initialization
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 1. Check that LiveDemo exists
  const liveDemo = landingPage.querySelector('live-demo');
  assertExists(liveDemo, 'LiveDemo component should exist');

  // 2. Check that LiveDemo has children (editor + preview)
  const liveDemoChildren = Array.from(liveDemo!.childNodes).filter(
    (n) => n.nodeType === Node.ELEMENT_NODE,
  );
  console.log('LiveDemo children before resize:', liveDemoChildren.length);
  liveDemoChildren.forEach((child, i) => {
    console.log(`  Child ${i}:`, (child as Element).tagName);
  });

  assertEquals(
    liveDemoChildren.length >= 1,
    true,
    'LiveDemo should have at least 1 child (grid wrapper)',
  );

  // 3. Find preview content (CounterApp)
  const findCounterApp = (root: Element) => {
    const all = root.querySelectorAll('*');
    for (const el of Array.from(all)) {
      if (el.tagName.startsWith('LIVE-COUNTER-APP-')) {
        return el;
      }
    }
    return null;
  };

  const counterAppBefore = findCounterApp(liveDemo!);
  assertExists(counterAppBefore, 'CounterApp should exist before resize');
  console.log('CounterApp found before resize:', counterAppBefore.tagName);

  // 4. Simulate window resize
  console.log('\n🔄 Simulating window resize...');
  const resizeEvent = new Event('resize');
  window.dispatchEvent(resizeEvent);

  // Wait for effects to run
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 5. Check that LiveDemo still has children
  const liveDemoChildrenAfter = Array.from(liveDemo!.childNodes).filter(
    (n) => n.nodeType === Node.ELEMENT_NODE,
  );
  console.log('\nLiveDemo children after resize:', liveDemoChildrenAfter.length);
  liveDemoChildrenAfter.forEach((child, i) => {
    console.log(`  Child ${i}:`, (child as Element).tagName);
    // Show nested structure - go deeper
    const showNested = (el: Element, depth: number) => {
      const indent = '  '.repeat(depth);
      const children = Array.from(el.childNodes).filter(
        (n) => n.nodeType === Node.ELEMENT_NODE,
      );
      children.forEach((c, j) => {
        const elem = c as Element;
        console.log(`${indent}[${j}]:`, elem.tagName);
        if (depth < 4) showNested(elem, depth + 1);
      });
    };
    showNested(child as Element, 2);
  });

  assertEquals(
    liveDemoChildrenAfter.length >= 1,
    true,
    'LiveDemo should still have children after resize',
  );

  // 6. Check that CounterApp still exists
  const counterAppAfter = findCounterApp(liveDemo!);
  assertExists(counterAppAfter, 'CounterApp should still exist after resize');
  console.log('CounterApp found after resize:', counterAppAfter.tagName);

  // 7. Verify CounterApp content
  const counterText = counterAppAfter.textContent;
  assertEquals(
    counterText?.includes('Count is:'),
    true,
    'CounterApp should still show count',
  );

  console.log('\n✅ All checks passed - LiveDemo survives resize!');
});

Deno.test('Landing page - Feature cards survive resize', async () => {
  await setup();

  const { LandingPage } = await import('../views/LandingPage.ts');
  const landingPage = new LandingPage();
  document.body.appendChild(landingPage);

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Find feature cards
  const featureCardsBefore = landingPage.querySelectorAll('feature-card');
  console.log('Feature cards before resize:', featureCardsBefore.length);
  assertEquals(
    featureCardsBefore.length > 0,
    true,
    'Should have feature cards before resize',
  );

  // Simulate resize
  const resizeEvent = new Event('resize');
  window.dispatchEvent(resizeEvent);

  await new Promise((resolve) => setTimeout(resolve, 100));

  // Check feature cards after resize
  const featureCardsAfter = landingPage.querySelectorAll('feature-card');
  console.log('Feature cards after resize:', featureCardsAfter.length);

  assertEquals(
    featureCardsAfter.length,
    featureCardsBefore.length,
    'Feature cards count should remain the same after resize',
  );

  console.log('✅ Feature cards survived resize!');
});

Deno.test('Landing page - LiveDemo increment button works after resize', async () => {
  await setup();

  const { LandingPage } = await import('../views/LandingPage.ts');
  const landingPage = new LandingPage();
  document.body.appendChild(landingPage);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const liveDemo = landingPage.querySelector('live-demo');
  assertExists(liveDemo);

  // Simulate resize first
  console.log('Resizing window...');
  const resizeEvent = new Event('resize');
  window.dispatchEvent(resizeEvent);
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Find CounterApp
  const findCounterApp = (root: Element) => {
    const all = root.querySelectorAll('*');
    for (const el of Array.from(all)) {
      if (el.tagName.startsWith('LIVE-COUNTER-APP-')) {
        return el;
      }
    }
    return null;
  };

  const counterApp = findCounterApp(liveDemo!);
  assertExists(counterApp, 'CounterApp should exist after resize');

  // Find button
  const button = counterApp!.querySelector('button');
  assertExists(button, 'Increment button should exist');

  // Check initial count
  const initialText = counterApp!.textContent;
  console.log('Initial CounterApp text:', initialText);

  // Click button
  console.log('Clicking increment button...');
  button!.click();

  await new Promise((resolve) => setTimeout(resolve, 50));

  // Check updated count
  const updatedText = counterApp!.textContent;
  console.log('Updated CounterApp text:', updatedText);

  assertEquals(
    updatedText?.includes('Count is: 1'),
    true,
    'Count should increment after resize',
  );

  console.log('✅ Button works after resize!');
});
