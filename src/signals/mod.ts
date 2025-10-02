/**
 * A reactive value container. Call as a function to get the value, or use .set() to update it.
 * @template T
 */
export type Signal<T> = (() => T) & {
  set: (v: T) => void;
  get: () => T;
  update: (fn: (prev: T) => T) => void;
};

/**
 * A read-only signal. Call as a function to get the value, but cannot set.
 * @template T
 */
export type ReadonlySignal<T> = () => T;

/**
 * A mutable reference container, similar to React's ref.
 * @template T
 */
export type Reference<T> = { current: T };
type EffectCleanup = () => void;
type StopHandle = { stop: () => void };

let currentEffect: (() => void) | null = null;
const effectStack: Array<() => void> = [];

/**
 * Creates a reactive signal.
 * @template T
 * @param {T} initialValue - The initial value of the signal.
 * @returns {Signal<T>} The signal function.
 */
export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<() => void>();
  const fn = function () {
    if (currentEffect) subscribers.add(currentEffect);
    return value;
  } as Signal<T>;
  fn.get = () => fn();
  fn.set = (v: T) => {
    if (v !== value) {
      value = v;
      if (isBatching) {
        subscribers.forEach((fn) => pendingEffects.add(fn));
      } else {
        subscribers.forEach((fn) => fn());
      }
    }
  };
  fn.update = (cb: (prev: T) => T) => {
    fn.set(cb(value));
  };
  return fn;
}

/**
 * Runs a function whenever any accessed signals change. Returns a handle to stop the effect.
 * @param {() => void} fn - The effect function to run on dependency change.
 * @returns {StopHandle} Handle to stop the effect.
 */
export function effect(fn: () => void): StopHandle {
  let stopped = false;
  const runner = () => {
    if (stopped) return;
    cleanup();
    effectStack.push(runner);
    currentEffect = runner;
    try {
      fn();
    } finally {
      effectStack.pop();
      currentEffect = effectStack[effectStack.length - 1] || null;
    }
  };
  let cleanup: EffectCleanup = () => {};
  runner();
  return {
    stop() {
      stopped = true;
      cleanup();
    },
  };
}

/**
 * Creates a derived signal that automatically updates when its dependencies change.
 * @template T
 * @param {() => T} fn - The computation function.
 * @returns {Signal<T>} The computed signal.
 */
export function computed<T>(fn: () => T): Signal<T> {
  const s = signal<T>(fn());
  effect(() => s.set(fn()));
  return s;
}

let isBatching = false;
const pendingEffects = new Set<() => void>();
/**
 * Batches multiple signal updates, so effects run only once after all updates.
 * @param {() => void} fn - The function containing batched updates.
 */
export function batch(fn: () => void): void {
  const prevBatching = isBatching;
  isBatching = true;
  try {
    fn();
  } finally {
    isBatching = prevBatching;
    if (!isBatching) {
      const toRun = Array.from(pendingEffects);
      pendingEffects.clear();
      toRun.forEach((fn) => fn());
    }
  }
}

/**
 * Runs a function or accesses a signal without tracking dependencies.
 * @template T
 * @param {(() => T) | Signal<T>} fnOrSignal - A callback or a signal.
 * @returns {T} The result of the callback or the signal value.
 */
export function untracked<T>(fnOrSignal: (() => T) | Signal<T>): T {
  const prev = currentEffect;
  currentEffect = null;
  try {
    if (typeof fnOrSignal === 'function' && 'set' in fnOrSignal) {
      // It's a signal
      return fnOrSignal();
    } else if (typeof fnOrSignal === 'function') {
      // It's a callback
      return (fnOrSignal as () => T)();
    }
    throw new TypeError('untracked expects a function or signal');
  } finally {
    currentEffect = prev;
  }
}

/**
 * Returns a read-only version of a signal.
 * @template T
 * @param {Signal<T>} sig - The signal to make read-only.
 * @returns {ReadonlySignal<T>} The read-only signal.
 */
export function readonly<T>(sig: Signal<T>): ReadonlySignal<T> {
  const fn = () => sig();
  fn.get = () => sig.get();
  return fn;
}
