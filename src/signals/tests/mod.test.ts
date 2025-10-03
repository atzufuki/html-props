import { assert, assertEquals } from '@std/assert';
import { batch, computed, effect, readonly, signal, untracked } from '../mod.ts';

Deno.test('signal: get/set', () => {
  const count = signal(0);
  assert(count() === 0, 'Initial value failed');
  count.set(5);
  assert(count() === 5, 'Set/get failed');
});

Deno.test('signal: update method', () => {
  const count = signal(1);
  count.update((v) => v + 1);
  assert(count() === 2, 'Update should increment value');
  count.update((v) => v * 10);
  assert(count() === 20, 'Update should multiply value');
});

Deno.test('effect: runs on signal change', () => {
  const count = signal(0);
  let triggered = 0;
  effect(() => {
    count();
    triggered++;
  });
  count.set(1);
  count.set(2);
  assert(triggered === 3, 'Effect did not run correct number of times');
});

Deno.test('effect: runs once with multiple deps', () => {
  const count = signal(0);
  const doubleCount = computed(() => count() * 2);
  let triggered = 0;
  effect(() => {
    count();
    doubleCount();
    triggered++;
  });
  count.set(1);
  assert(triggered === 2, 'Effect did not run correct number of times');
});

Deno.test('effect: cleanup removes effect from subscribers', () => {
  const s = signal(0);
  let runs = 0;
  const dispose = effect(() => {
    s();
    runs++;
  });
  assert(runs === 1, 'Effect should run initially');
  dispose();
  s.set(1);
  assert(runs === 1, 'Effect should not run after cleanup');
});

Deno.test('effect: cleanup function is called before re-run and on dispose', () => {
  const s = signal(0);
  let cleanups = 0;
  let runs = 0;
  const dispose = effect(() => {
    s();
    runs++;
    return () => {
      cleanups++;
    };
  });
  // First run, no cleanup yet
  assertEquals(runs, 1, 'Effect should run initially');
  assertEquals(cleanups, 0, 'Cleanup should not run initially');
  // Trigger re-run
  s.set(1);
  assertEquals(runs, 2, 'Effect should run again after signal change');
  assertEquals(cleanups, 1, 'Cleanup should run before re-run');
  // Dispose effect
  dispose();
  assertEquals(cleanups, 2, 'Cleanup should run on dispose');
});

Deno.test('computed: updates when dependencies change', () => {
  const a = signal(2);
  const b = signal(3);
  const sum = computed(() => a() + b());
  assert(sum() === 5, 'Initial computed value failed');
  a.set(5);
  assert(sum() === 8, 'Computed did not update');
});

Deno.test('batch: effects run once after batch', () => {
  const a = signal(1);
  const b = signal(2);
  let runs = 0;
  effect(() => {
    a();
    b();
    runs++;
  });
  batch(() => {
    a.set(10);
    b.set(20);
    b.set(30);
  });
  assert(runs === 2, 'Effect ran more than once during batch');
});

Deno.test('untracked: does not track dependencies', () => {
  const a = signal(1);
  let runs = 0;
  effect(() => {
    // This access is untracked
    untracked(() => a());
    runs++;
  });
  a.set(2);
  assert(runs === 1, 'Effect should not re-run when untracked signal changes');

  // Also works with direct signal
  assert(untracked(a) === 2, 'untracked(signal) should return signal value');
});

Deno.test('readonly: cannot set', () => {
  const s = signal(1);
  const r = readonly(s);
  assert(r() === 1, 'Readonly did not return value');
  // @ts-expect-error
  assert(typeof r.set !== 'function', 'Readonly should not have set');
});
