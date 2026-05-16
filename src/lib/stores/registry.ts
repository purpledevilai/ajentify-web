type Resetable = { reset: () => void };

const registry = new Set<Resetable>();

export function registerStore<T extends Resetable>(s: T): T {
  registry.add(s);
  return s;
}

/**
 * Reset every registered store. Called by org-switch and logout flows.
 * `authStore` and `orgStore` intentionally do NOT register themselves here —
 * those reset their own state explicitly in logout / org-switch handlers.
 */
export function resetAllStores() {
  for (const s of registry) s.reset();
}
