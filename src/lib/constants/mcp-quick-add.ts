/**
 * MCP servers we've verified end-to-end and surface as one-click presets on
 * the "New MCP connection" page. Add an entry here when a new server has been
 * confirmed working (OAuth discovery + tools/list + a real tool call).
 *
 * Google Workspace URLs: https://developers.google.com/workspace/guides/configure-mcp-servers
 * Logos: official product marks via Wikimedia Commons (public/logos).
 */
export interface McpQuickAddPreset {
  id: string;
  /** Pre-filled connection name. */
  name: string;
  /** Pre-filled MCP URL. */
  mcpUrl: string;
  /** One-liner shown on the card. */
  description: string;
  /** Vendor group label, used as the card's eyebrow. */
  vendor: string;
  /** Official product mark, served from /public/logos. */
  logo: string;
}

export const MCP_QUICK_ADD_PRESETS: McpQuickAddPreset[] = [
  {
    id: "gmail",
    name: "Gmail",
    mcpUrl: "https://gmailmcp.googleapis.com/mcp/v1",
    description: "Search and read mail, draft replies, manage labels.",
    vendor: "Google Workspace",
    logo: "/logos/gmail.svg",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    mcpUrl: "https://calendarmcp.googleapis.com/mcp/v1",
    description: "List calendars, find events, check availability.",
    vendor: "Google Workspace",
    logo: "/logos/google-calendar.svg",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    mcpUrl: "https://drivemcp.googleapis.com/mcp/v1",
    description: "Search, read, and organise files in Drive.",
    vendor: "Google Workspace",
    logo: "/logos/google-drive.svg",
  },
  {
    id: "google-docs",
    name: "Google Docs",
    mcpUrl: "https://docsmcp.googleapis.com/mcp/v1",
    description: "Read and write documents.",
    vendor: "Google Workspace",
    logo: "/logos/google-docs.svg",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    mcpUrl: "https://sheetsmcp.googleapis.com/mcp/v1",
    description: "Read and update spreadsheets.",
    vendor: "Google Workspace",
    logo: "/logos/google-sheets.svg",
  },
];
