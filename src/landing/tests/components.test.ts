import { assertEquals } from 'jsr:@std/assert';
import { setup, teardown } from './setup.ts';
import { effect, signal } from '@html-props/signals';

// @ts-ignore: Deno.test.beforeAll is available in Deno 2+
Deno.test.beforeAll(() => {
  setup();
});

// @ts-ignore: Deno.test.afterAll is available in Deno 2+
Deno.test.afterAll(() => {
  teardown();
});

Deno.test('Signals work as expected', () => {
  const count = signal(0);
  let runCount = 0;

  effect(() => {
    count();
    runCount++;
  });

  assertEquals(runCount, 1);

  count.set(1);
  assertEquals(runCount, 2);
});

Deno.test('Signal updates trigger effects', () => {
  const name = signal('initial');
  const values: string[] = [];

  effect(() => {
    values.push(name());
  });

  assertEquals(values, ['initial']);

  name.set('updated');
  assertEquals(values, ['initial', 'updated']);

  name.set('final');
  assertEquals(values, ['initial', 'updated', 'final']);
});
