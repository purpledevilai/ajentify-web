import { z } from "zod";

export const ViewDocsInput = z.object({
  path: z
    .string()
    .default("/docs")
    .describe(
      "Docs path under api.ajentify.com. Defaults to '/docs' (the index). Examples: '/docs/POST/context', '/docs/web-chat-quickstart', '/docs/POST/agent'.",
    ),
});
