import { createPublicTools, type PublicSnapshot, type PublicTool } from './publicTools';

export type BrowserModelContext = {
  registerTool: (tool: PublicTool, options?: { signal: AbortSignal }) => void | Promise<void>;
  unregisterTool?: (name: string) => void | Promise<void>;
};

/** Current draft uses document.modelContext; earlier Chrome trials used navigator. */
export function findModelContext(documentObject?: object, navigatorObject?: object): BrowserModelContext | undefined {
  for (const owner of [documentObject, navigatorObject]) {
    const context = (owner as { modelContext?: BrowserModelContext } | undefined)?.modelContext;
    if (context && typeof context.registerTool === 'function') return context;
  }
  return undefined;
}

export function registerWebMcp(context: BrowserModelContext | undefined, readSnapshot: () => PublicSnapshot) {
  const controller = new AbortController();
  const owned = new Set<string>();
  const remove = (name: string) => {
    if (!context?.unregisterTool) return;
    try { void Promise.resolve(context.unregisterTool(name)).catch(() => {}); } catch { /* Older browser trials may already have removed it. */ }
  };
  const ready = Promise.all(context ? createPublicTools(readSnapshot).map(async tool => {
    try {
      const registration = context.registerTool(tool, { signal: controller.signal });
      // Older implementations register synchronously; record ownership before
      // React can dispose the effect and mount it again in development.
      if (registration) await registration;
      if (controller.signal.aborted) remove(tool.name);
      else owned.add(tool.name);
    } catch { /* Unsupported policy/API or a duplicate must not interrupt the visitor interface. */ }
  }) : []).then(() => [...owned]);
  return {
    ready,
    dispose() {
      controller.abort();
      for (const name of owned) remove(name);
      owned.clear();
    },
  };
}
