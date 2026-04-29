#!/bin/bash

# Native Bridge Installation Script
# Installs the native messaging host for RethinkSoft in Chrome extension
# (Enables IPC between MCP server and Chrome extension)

set -e

echo "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"
echo "â•‘  RethinkSoft in Chrome - Native Bridge Installer              â•‘"
echo "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NATIVE_BRIDGE="$SCRIPT_DIR/native-bridge.cjs"
WRAPPER_SCRIPT="$SCRIPT_DIR/native-host-wrapper.sh"

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}âœ— Node.js is not installed${NC}"
    echo "  Please install Node.js from https://nodejs.org"
    echo "  Download the LTS version (recommended)"
    exit 1
fi

echo -e "${GREEN}âœ“${NC} Node.js found: $(node --version)"

# Get the full path to node (Chrome doesn't use shell, so we need explicit path)
NODE_PATH=$(which node)
echo -e "${GREEN}âœ“${NC} Node path: $NODE_PATH"

# Make the native bridge executable
chmod +x "$NATIVE_BRIDGE"
echo -e "${GREEN}âœ“${NC} Made native-bridge.cjs executable"

# Create/update wrapper script with correct node path
# (Chrome Native Messaging needs bash shebang, not #!/usr/bin/env node)
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
exec "$NODE_PATH" "$NATIVE_BRIDGE" "\$@"
EOF
chmod +x "$WRAPPER_SCRIPT"
echo -e "${GREEN}âœ“${NC} Created wrapper script with node path"

# Determine OS and set manifest directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    OS_NAME="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    OS_NAME="Linux"
else
    echo -e "${RED}âœ— Unsupported OS: $OSTYPE${NC}"
    echo "  Supported: macOS, Linux"
    echo "  For Windows, manual installation required"
    exit 1
fi

echo -e "${GREEN}âœ“${NC} Detected OS: $OS_NAME"
echo -e "${GREEN}âœ“${NC} Manifest directory: $MANIFEST_DIR"

# Create manifest directory if it doesn't exist
mkdir -p "$MANIFEST_DIR"

# Extension IDs
CHROME_STORE_ID="iklpkemlmbhemkiojndpbhoakgikpmcd"  # Production (Chrome Web Store)
DEV_ID="dnajlkacmnpfmilkeialficajdgkkkfo"          # Development (replace with your own if different)

# Create manifest with both production and development IDs
MANIFEST_FILE="$MANIFEST_DIR/com.rethinksoft_in_chrome.oauth_host.json"

echo ""
echo "Creating manifest file..."
cat > "$MANIFEST_FILE" << EOF
{
  "name": "com.rethinksoft_in_chrome.oauth_host",
  "description": "Native bridge for RethinkSoft in Chrome extension (IPC between MCP server and extension)",
  "path": "$WRAPPER_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$CHROME_STORE_ID/",
    "chrome-extension://$DEV_ID/"
  ]
}
EOF

echo -e "${GREEN}âœ“${NC} Configured for both production and development extensions"

if [ -f "$MANIFEST_FILE" ]; then
    echo -e "${GREEN}âœ“${NC} Created manifest at: $MANIFEST_FILE"
else
    echo -e "${RED}âœ— Failed to create manifest file${NC}"
    exit 1
fi

# Verify manifest is valid JSON
if command -v python3 &> /dev/null; then
    if python3 -m json.tool "$MANIFEST_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}âœ“${NC} Manifest is valid JSON"
    else
        echo -e "${RED}âœ— Manifest JSON is invalid${NC}"
        exit 1
    fi
fi

# Test if the server can run
echo ""
echo "Testing OAuth server..."
if node "$NATIVE_BRIDGE" <<< '{"type":"ping"}' 2>/dev/null | grep -q "pong"; then
    echo -e "${GREEN}âœ“${NC} OAuth server test passed"
else
    echo -e "${YELLOW}âš ${NC}  OAuth server test inconclusive (may still work)"
fi

echo ""
echo "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"
echo "â•‘  âœ“ Installation Complete!                              â•‘"
echo "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"
echo ""
echo "Next steps:"
echo "  1. Go to chrome://extensions"
echo "  2. Click the reload button (â†») on 'RethinkSoft in Chrome'"
echo "  3. Open the extension and try OAuth login"
echo ""
echo "Troubleshooting:"
echo "  â€¢ If OAuth fails, run: ./test-setup.sh"
echo "  â€¢ To uninstall: ./uninstall.sh"
echo "  â€¢ To reinstall: ./uninstall.sh && ./install.sh"
echo ""
echo "Manifest location:"
echo "  $MANIFEST_FILE"
echo ""
