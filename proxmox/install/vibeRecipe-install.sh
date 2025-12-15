#!/usr/bin/env bash

# VibeRecipe LXC Installation Script
# This script runs inside the LXC container to install VibeRecipe
# Copyright (c) 2024
# License: MIT

# =============================================================================
# Configuration
# =============================================================================
# IMPORTANT: Update this URL to point to your repository
REPO_URL="https://github.com/YOURUSER/recipeextractor.git"
REPO_RAW="https://raw.githubusercontent.com/YOURUSER/recipeextractor/main"
APP_DIR="/opt/vibeRecipe"
APP_PORT="3000"

# =============================================================================
# Source Functions
# =============================================================================
if [[ -f "/tmp/install.func" ]]; then
  source /tmp/install.func
else
  source <(curl -fsSL "${REPO_RAW}/proxmox/misc/install.func")
fi

# =============================================================================
# Main Installation
# =============================================================================

# Initial setup
setting_up_container
network_check
update_os

# Install dependencies
msg_info "Installing Dependencies"
apt-get install -y \
  curl \
  git \
  build-essential >/dev/null 2>&1
msg_ok "Installed Dependencies"

# Install Node.js
NODE_VERSION="20" setup_nodejs

# Clone and build VibeRecipe
msg_info "Cloning VibeRecipe"
git clone --depth 1 "${REPO_URL}" "${APP_DIR}" >/dev/null 2>&1
msg_ok "Cloned VibeRecipe"

msg_info "Installing Node.js dependencies (this may take a while)"
cd "${APP_DIR}"
npm ci >/dev/null 2>&1
msg_ok "Installed Node.js dependencies"

msg_info "Building VibeRecipe for production"
npm run build >/dev/null 2>&1
msg_ok "Built VibeRecipe"

# Get version from package.json
VIBERECIPE_VERSION=$(node -p "require('${APP_DIR}/package.json').version" 2>/dev/null || echo "1.0.0")
echo "${VIBERECIPE_VERSION}" > "${APP_DIR}/.version"

# Create systemd service
create_service \
  "vibeRecipe" \
  "VibeRecipe - AI Recipe Extractor" \
  "${APP_DIR}" \
  "/usr/bin/node ${APP_DIR}/.next/standalone/server.js"

# Setup nginx reverse proxy
APP_PORT="${APP_PORT}" setup_nginx

# Configure MOTD
APP_NAME="VibeRecipe" motd_ssh

# Create update script
cat <<'EOF' >/usr/bin/update
#!/bin/bash
echo "Updating VibeRecipe..."

cd /opt/vibeRecipe

# Stop service
systemctl stop vibeRecipe

# Pull latest changes
git pull

# Reinstall and rebuild
npm ci
npm run build

# Restart service
systemctl start vibeRecipe

echo "VibeRecipe updated successfully!"
EOF
chmod +x /usr/bin/update

# Cleanup
cleanup_lxc

# =============================================================================
# Installation Complete
# =============================================================================
IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "\033[1;32m═══════════════════════════════════════════════════════════════\033[0m"
echo -e "\033[1;32m  VibeRecipe Installation Complete!\033[0m"
echo -e "\033[1;32m═══════════════════════════════════════════════════════════════\033[0m"
echo ""
echo -e "  \033[33mAccess URL:\033[0m     \033[36mhttp://${IP}\033[0m"
echo -e "  \033[33mInternal Port:\033[0m  \033[36m${APP_PORT}\033[0m"
echo -e "  \033[33mInstall Dir:\033[0m    \033[36m${APP_DIR}\033[0m"
echo ""
echo -e "  \033[33mTo update:\033[0m      Run \033[1mupdate\033[0m command"
echo ""
echo -e "\033[1;32m═══════════════════════════════════════════════════════════════\033[0m"
