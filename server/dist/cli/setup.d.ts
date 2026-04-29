/**
 * `rethinksoft-browser setup` â€” auto-detect AI agents and inject MCP config.
 *
 * Scans the machine for Claude Code, Cursor, Windsurf, and Claude Desktop,
 * then merges the RethinkSoft MCP server entry into each agent's config file.
 */
export declare function runSetup(options?: {
    only?: string;
    yes?: boolean;
}): Promise<void>;
