const SIGNAL_BRAND = Symbol('signal');

/**
 * A reactive value container. Call as a function to get the value, or use .set() to update it.
 * @template T
 */
export type Signal<T> = (() => T) & {
  /**
   * Sets the signal to a new value.
   * @param {T} v - The new value.
   * @returns {void}
   */
  set: (v: T) => void;
  /**
   * @return The current value of the signal.
   */
  get: () => T;
  /**
   * Updates the signal based on its previous value.
   * @param {(prev: T) => T} fn - A function that takes the previous value and returns the new value.
   * @returns {void}
   */
  update: (fn: (prev: T) => T) => void;
};

/**
 * A read-only signal. Call as a function to get the value, but cannot set.
 * @template T
 */
export type ReadonlySignal<T> = (() => T) & {
  /**
   * @return The current value of the signal.
   */
  get: () => T;
};

type RunningEffect = {
  execute: () => void;
  dependencies: Set<Set<() => void>>;
  cleanup?: (() => void) | void;
  disposed?: boolean;
};

const context: RunningEffect[] = [];
const pendingEffects = new Set<() => void>();
let isBatching = false;

function subscribe(running: RunningEffect, subscriptions: Set<() => void>) {
  subscriptions.add(running.execute);
  running.dependencies.add(subscriptions);
}

/**
 * Creates a reactive signal.
 * @template T
 * @param {T} initialValue - The initial value of the signal.
 * @returns {Signal<T>} The created signal.
 */
export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscriptions = new Set<() => void>();

  const get = (): T => {
    const running = context[context.length - 1];
    if (running) subscribe(running, subscriptions);
    return value;
  };

  const notify = () => {
    for (const sub of [...subscriptions]) {
      if (isBatching) {
        pendingEffects.add(sub);
      } else {
        sub();
      }
    }
  };

  const set = (nextValue: T): void => {
    value = nextValue;
    notify();
  };

  const update = (fn: (prev: T) => T): void => {
    set(fn(value));
  };

  const fn = get as Signal<T>;
  fn.set = set;
  fn.get = get;
  fn.update = update;

  try {
    (fn as any)[SIGNAL_BRAND] = true;
  } catch {
    // Ignore if Symbol cannot be added
  }

  return fn;
}

function cleanup(running: RunningEffect): void {
  for (const dep of running.dependencies) {
    dep.delete(running.execute);
  }
  running.dependencies.clear();
  if (typeof running.cleanup === 'function') {
    try {
      running.cleanup();
    } catch (e) {
      // Optionally log error
    }
    running.cleanup = undefined;
  }
}

/**
 *  Creates a reactive effect that runs when its dependencies change.
 * @param {() => void} fn - The effect function.
 * @returns {() => void} A cleanup function to stop the effect.
 */
export function effect(fn: () => void): () => void {
  let running: RunningEffect;
  const execute = () => {
    if (running.disposed) return;
    cleanup(running);
    context.push(running);
    try {
      const result = fn();
      if (typeof result === 'function') {
        running.cleanup = result;
      }
    } finally {
      context.pop();
    }
  };

  running = {
    execute,
    dependencies: new Set<Set<() => void>>(),
    cleanup: undefined,
    disposed: false,
  };

  execute();

  const dispose = () => {
    if (!running.disposed) {
      running.disposed = true;
      cleanup(running);
    }
  };
  // Optionally add Symbol.dispose for integration
  try {
    (dispose as any)[Symbol.dispose] = dispose;
  } catch {}
  return dispose;
}

/**
 * Creates a derived signal that automatically updates when its dependencies change.
 * @template T
 * @param {() => T} fn - The computation function.
 * @returns {Signal<T>} The computed signal.
 */
export function computed<T>(fn: () => T): Signal<T> {
  // Create signal with a dummy value, will be set by effect immediately
  const s = signal<T>(undefined as unknown as T);
  effect(() => s.set(fn()));
  return s;
}

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
  const prevContext = context.pop(); // Remove current effect from context
  try {
    if (typeof fnOrSignal === 'function' && (fnOrSignal as any)[SIGNAL_BRAND]) {
      // It's a signal
      return fnOrSignal();
    } else if (typeof fnOrSignal === 'function') {
      // It's a callback
      return (fnOrSignal as () => T)();
    }
    throw new TypeError('untracked expects a function or signal');
  } finally {
    if (prevContext !== undefined) context.push(prevContext); // Restore effect context
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
