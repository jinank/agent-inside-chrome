#!/usr/bin/env node
/**
 * LLM Browser CLI
 *
 * Command-line interface for browser automation.
 * Sends tasks to the Chrome extension via WebSocket relay.
 *
 * Usage:
 *   rethinksoft-browser start "task" --url https://example.com
 *   rethinksoft-browser status [session_id]
 *   rethinksoft-browser message <session_id> "message"
 *   rethinksoft-browser logs <session_id> [--follow]
 *   rethinksoft-browser stop <session_id> [--remove]
 *   rethinksoft-browser screenshot <session_id>
 */
export {};
