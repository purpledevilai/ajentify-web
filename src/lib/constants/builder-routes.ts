/** Placeholder id for route prefetching. Builder pages are dynamic
 *  (`[agent_id]` / `[tool_id]`) but every id shares the same page module,
 *  so prefetching once on the index page warms the chunk for all items. */
export const AGENT_BUILDER_PREFETCH_HREF = "/app/agents/_";
export const TOOL_BUILDER_PREFETCH_HREF = "/app/tools/_";
