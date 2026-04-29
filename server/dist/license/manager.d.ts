/**
 * License Manager for MCP Server
 *
 * Mirrors the extension's license-manager.js but uses filesystem storage
 * instead of chrome.storage.local. Same constants, same LemonSqueezy API.
 *
 * Free: 100 tasks total
 * Pro: Unlimited ($29 one-time via LemonSqueezy)
 *
 * License key sources (checked in order):
 * 1. RETHINKSOFT_IN_CHROME_LICENSE_KEY env var (HANZI_IN_CHROME_LICENSE_KEY also accepted for backwards compatibility)
 * 2. ~/.rethinksoft-in-chrome/mcp-license.json (persisted from previous activation)
 *
 * Storage:
 *   ~/.rethinksoft-in-chrome/mcp-license.json â€” { key, valid, instanceId, validatedAt }
 *   ~/.rethinksoft-in-chrome/mcp-usage.json   â€” { count }
 */
/**
 * Check if user can run a task, and increment the counter.
 */
export declare function checkAndIncrementUsage(): Promise<{
    allowed: boolean;
    remaining: number | null;
    message: string;
}>;
/**
 * Activate a license key via LemonSqueezy Validate API.
 */
export declare function activateLicense(key: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Get current license status for diagnostics.
 */
export declare function getLicenseStatus(): {
    isPro: boolean;
    tasksUsed: number;
    taskLimit: number | null;
    message: string;
};
