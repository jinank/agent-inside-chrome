#!/bin/bash

# OAuth Native Messaging Host Uninstall Script

set -e

echo "=== RethinkSoft in Chrome - OAuth Native Host Uninstaller ==="
echo ""

# Determine OS and remove manifest
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    MANIFEST_PATH="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.rethinksoft_in_chrome.oauth_host.json"

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    MANIFEST_PATH="$HOME/.config/google-chrome/NativeMessagingHosts/com.rethinksoft_in_chrome.oauth_host.json"

else
    echo "âš ï¸  Unsupported OS: $OSTYPE"
    echo "Please manually remove the manifest from your system."
    exit 1
fi

if [ -f "$MANIFEST_PATH" ]; then
    rm "$MANIFEST_PATH"
    echo "âœ“ Removed: $MANIFEST_PATH"
else
    echo "âš ï¸  Manifest not found at: $MANIFEST_PATH"
fi

echo ""
echo "=== Uninstall Complete! ==="
