#!/bin/bash

# RethinkSoft in Chrome - Native Host Installer
# Run with: curl -fsSL https://raw.githubusercontent.com/hanzili/rethinksoft-in-chrome/main/install.sh | bash

set -e

REPO_URL="https://raw.githubusercontent.com/hanzili/rethinksoft-in-chrome/main"
INSTALL_DIR="$HOME/.rethinksoft-in-chrome"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"
echo "â•‘  RethinkSoft in Chrome - Native Host Installer                 â•‘"
echo "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}âœ— Node.js is not installed${NC}"
    echo "  Please install from https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}âœ“${NC} Node.js found: $(node --version)"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    OS_NAME="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    OS_NAME="Linux"
else
    echo -e "${RED}âœ— Unsupported OS: $OSTYPE${NC}"
    exit 1
fi
echo -e "${GREEN}âœ“${NC} Detected OS: $OS_NAME"

# Create install directory
mkdir -p "$INSTALL_DIR"
echo -e "${GREEN}âœ“${NC} Created $INSTALL_DIR"

# Download oauth-server.cjs
echo "Downloading native host..."
curl -fsSL "$REPO_URL/native-host/oauth-server.cjs" -o "$INSTALL_DIR/oauth-server.cjs"
chmod +x "$INSTALL_DIR/oauth-server.cjs"
echo -e "${GREEN}âœ“${NC} Downloaded oauth-server.cjs"

# Get the full path to node (Chrome doesn't use shell, so we need explicit path)
NODE_PATH=$(which node)
echo -e "${GREEN}âœ“${NC} Node path: $NODE_PATH"

# Create wrapper script (Chrome Native Messaging needs bash shebang, not env node)
WRAPPER_SCRIPT="$INSTALL_DIR/native-host-wrapper.sh"
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
exec "$NODE_PATH" "$INSTALL_DIR/oauth-server.cjs" "\$@"
EOF
chmod +x "$WRAPPER_SCRIPT"
echo -e "${GREEN}âœ“${NC} Created wrapper script"

# Extension IDs
CHROME_STORE_ID="iklpkemlmbhemkiojndpbhoakgikpmcd"  # Production (Chrome Web Store)
DEV_ID="dnajlkacmnpfmilkeialficajdgkkkfo"          # Development (replace with your own if different)

# Create manifest directory
mkdir -p "$MANIFEST_DIR"

# Create manifest pointing to wrapper script (not .cjs directly)
MANIFEST_FILE="$MANIFEST_DIR/com.rethinksoft_in_chrome.oauth_host.json"
cat > "$MANIFEST_FILE" << EOF
{
  "name": "com.rethinksoft_in_chrome.oauth_host",
  "description": "OAuth local server for RethinkSoft in Chrome extension",
  "path": "$WRAPPER_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$CHROME_STORE_ID/",
    "chrome-extension://$DEV_ID/"
  ]
}
EOF

echo -e "${GREEN}âœ“${NC} Configured for both production and development extensions"

echo -e "${GREEN}âœ“${NC} Created manifest at: $MANIFEST_FILE"

# Test
echo ""
echo "Testing native host..."
if node "$INSTALL_DIR/oauth-server.cjs" <<< '{"type":"ping"}' 2>/dev/null | grep -q "pong"; then
    echo -e "${GREEN}âœ“${NC} Native host test passed"
else
    echo -e "${YELLOW}âš ${NC}  Test inconclusive (may still work)"
fi

echo ""
echo "â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—"
echo "â•‘  âœ“ Installation Complete!                              â•‘"
echo "â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•"
echo ""
echo "Next steps:"
echo "  1. Reload the extension at chrome://extensions"
echo "  2. Open extension settings â†’ Connect Claude Code or Codex"
echo ""
echo "To uninstall:"
echo "  rm -rf $INSTALL_DIR"
echo "  rm \"$MANIFEST_FILE\""
echo ""
