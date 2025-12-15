#!/usr/bin/env bash

# VibeRecipe LXC Container Script
# Run from Proxmox shell: bash -c "$(curl -fsSL https://raw.githubusercontent.com/YOURUSER/viberecipe/refs/heads/main/proxmox/ct/vibeRecipe.sh)"
# Copyright (c) 2024
# License: MIT

# =============================================================================
# Configuration
# =============================================================================
# IMPORTANT: Update this URL to point to your repository
REPO_RAW="https://raw.githubusercontent.com/ClemensSchartmueller/viberecipe/refs/heads/main"

# Application Settings
APP="VibeRecipe"
var_tags="recipes;ai;nextjs"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-1024}"
var_disk="${var_disk:-4}"
var_os="${var_os:-debian}"
var_version="${var_version:-12}"
var_unprivileged="${var_unprivileged:-1}"

# =============================================================================
# Colors
# =============================================================================
RD="\033[01;31m"
YW="\033[33m"
GN="\033[1;32m"
CL="\033[m"
BL="\033[36m"
BOLD="\033[1m"
CM="${GN}✓${CL}"
CROSS="${RD}✗${CL}"
INFO="${YW}ℹ${CL}"
TAB="  "

# =============================================================================
# Header
# =============================================================================
header_info() {
  clear
  cat <<"EOF"
 __     ___ _          ____           _            
 \ \   / (_) |__   ___| __ ) ___  ___(_)_ __   ___ 
  \ \ / /| | '_ \ / _ \  _ \/ _ \/ __| | '_ \ / _ \
   \ V / | | |_) |  __/ |_) |  __/ (__| | |_) |  __/
    \_/  |_|_.__/ \___|____/ \___|\___|_| .__/ \___|
                                        |_|        
EOF
  echo -e "${TAB}${GN}AI-Powered Recipe Extractor${CL}"
  echo ""
}

# =============================================================================
# Detect Environment
# =============================================================================
header_info

# Check if running on Proxmox
if ! command -v pveversion &>/dev/null; then
  echo -e "${CROSS}${RD} This script must be run on a Proxmox VE host.${CL}"
  echo -e "${INFO} For standalone installation, use the install script directly."
  exit 1
fi

# Check Proxmox version (with fallback methods)
PVE_VERSION=""

# Method 1: Try pveversion
if command -v pveversion &>/dev/null; then
  PVE_VERSION=$(pveversion 2>/dev/null | head -n1 | sed 's/.*pve-manager\///' | cut -d'/' -f1)
fi

# Method 2: Fallback to dpkg
if [[ -z "$PVE_VERSION" ]]; then
  PVE_VERSION=$(dpkg -l pve-manager 2>/dev/null | grep pve-manager | awk '{print $3}' | cut -d'-' -f1)
fi

# Method 3: Fallback to /etc/pve/.version
if [[ -z "$PVE_VERSION" ]] && [[ -f /etc/pve/.version ]]; then
  PVE_VERSION=$(cat /etc/pve/.version)
fi

PVE_MAJOR="${PVE_VERSION%%.*}"
if [[ -z "$PVE_MAJOR" ]] || [[ "$PVE_MAJOR" -lt 8 ]]; then
  echo -e "${CROSS}${RD} Proxmox VE 8.0 or higher is required. Detected: ${PVE_VERSION:-unknown}${CL}"
  exit 1
fi

echo -e "${CM} Proxmox VE ${PVE_VERSION} detected"

# =============================================================================
# User Configuration
# =============================================================================
echo ""
echo -e "${BOLD}Container Configuration${CL}"
echo -e "${TAB}Default values shown in brackets. Press Enter to accept."
echo ""

# Get container ID
while true; do
  read -p "Container ID [next available]: " CT_ID
  if [[ -z "${CT_ID}" ]]; then
    CT_ID=$(pvesh get /cluster/nextid)
    break
  elif [[ "${CT_ID}" =~ ^[0-9]+$ ]] && [[ "${CT_ID}" -ge 100 ]]; then
    if pct status "${CT_ID}" &>/dev/null; then
      echo -e "${CROSS}${RD} Container ${CT_ID} already exists${CL}"
    else
      break
    fi
  else
    echo -e "${CROSS}${RD} Invalid ID. Must be a number >= 100${CL}"
  fi
done
echo -e "${CM} Using Container ID: ${BL}${CT_ID}${CL}"

# Get hostname
read -p "Hostname [vibeRecipe]: " CT_HOSTNAME
CT_HOSTNAME="${CT_HOSTNAME:-vibeRecipe}"

# Get root password
echo -e "${INFO} Set root password for SSH access"
while true; do
  read -s -p "Root Password: " CT_PASSWORD
  echo
  read -s -p "Confirm Password: " CT_PASSWORD_CONFIRM
  echo
  if [[ "${CT_PASSWORD}" == "${CT_PASSWORD_CONFIRM}" ]]; then
    if [[ -n "${CT_PASSWORD}" ]]; then
      break
    else
      echo -e "${CROSS}${RD} Password cannot be empty${CL}"
    fi
  else
    echo -e "${CROSS}${RD} Passwords do not match, try again${CL}"
  fi
done
echo -e "${CM} Password set"

# Get storage
mapfile -t STORAGE_ARRAY < <(pvesm status -content rootdir | awk 'NR>1 {print $1}')
STORAGE_COUNT=${#STORAGE_ARRAY[@]}

if [[ "${STORAGE_COUNT}" -eq 0 ]]; then
  echo -e "${CROSS}${RD} No storage found with rootdir content type${CL}"
  exit 1
elif [[ "${STORAGE_COUNT}" -eq 1 ]]; then
  STORAGE="${STORAGE_ARRAY[0]}"
  echo -e "${CM} Using only available storage: ${BL}${STORAGE}${CL}"
else
  echo -e "${INFO} Available storage:"
  for i in "${!STORAGE_ARRAY[@]}"; do
    echo "  $((i+1))) ${STORAGE_ARRAY[i]}"
  done
  
  # Default to first storage
  DEFAULT_STORAGE="${STORAGE_ARRAY[0]}"
  read -p "Enter storage number or name [${DEFAULT_STORAGE}]: " STORAGE_INPUT
  STORAGE_INPUT="${STORAGE_INPUT:-1}"
  
  # Check if input is a number
  if [[ "${STORAGE_INPUT}" =~ ^[0-9]+$ ]]; then
    INDEX=$((STORAGE_INPUT - 1))
    if [[ "${INDEX}" -ge 0 ]] && [[ "${INDEX}" -lt "${STORAGE_COUNT}" ]]; then
      STORAGE="${STORAGE_ARRAY[INDEX]}"
    else
      echo -e "${CROSS}${RD} Invalid selection: ${STORAGE_INPUT}. Please enter 1-${STORAGE_COUNT}${CL}"
      exit 1
    fi
  else
    # User entered a name, verify it exists
    FOUND=false
    for s in "${STORAGE_ARRAY[@]}"; do
      if [[ "$s" == "${STORAGE_INPUT}" ]]; then
        STORAGE="${STORAGE_INPUT}"
        FOUND=true
        break
      fi
    done
    if [[ "${FOUND}" == false ]]; then
      echo -e "${CROSS}${RD} Storage '${STORAGE_INPUT}' not found${CL}"
      exit 1
    fi
  fi
  echo -e "${CM} Using Storage: ${BL}${STORAGE}${CL}"
fi

# Resources
read -p "CPU cores [${var_cpu}]: " CT_CPU
CT_CPU="${CT_CPU:-${var_cpu}}"

read -p "RAM in MB [${var_ram}]: " CT_RAM
CT_RAM="${CT_RAM:-${var_ram}}"

read -p "Disk in GB [${var_disk}]: " CT_DISK
CT_DISK="${CT_DISK:-${var_disk}}"

# =============================================================================
# Download Template
# =============================================================================
echo ""
msg_info() {
  echo -e "${INFO} ${YW}$1...${CL}"
}
msg_ok() {
  echo -e "${CM} ${GN}$1${CL}"
}

TEMPLATE_STORAGE="local"
TEMPLATE="debian-12-standard_12.7-1_amd64.tar.zst"

if [[ ! -f "/var/lib/vz/template/cache/${TEMPLATE}" ]]; then
  msg_info "Downloading Debian 12 template"
  pveam update >/dev/null 2>&1
  pveam download "${TEMPLATE_STORAGE}" "${TEMPLATE}" >/dev/null 2>&1
  msg_ok "Downloaded template"
else
  msg_ok "Template already exists"
fi

# =============================================================================
# Create Container
# =============================================================================
msg_info "Creating LXC container ${CT_ID}"

if ! pct create "${CT_ID}" "${TEMPLATE_STORAGE}:vztmpl/${TEMPLATE}" \
  --hostname "${CT_HOSTNAME}" \
  --rootfs "${STORAGE}:${CT_DISK}" \
  --cores "${CT_CPU}" \
  --memory "${CT_RAM}" \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged "${var_unprivileged}" \
  --features nesting=1 \
  --onboot 1 \
  --start 0; then
  echo -e "${CROSS}${RD} Failed to create container${CL}"
  exit 1
fi

# Verify container was created
sleep 2
if ! pct status "${CT_ID}" &>/dev/null; then
  echo -e "${CROSS}${RD} Container ${CT_ID} was not created properly${CL}"
  exit 1
fi

msg_ok "Created container ${CT_ID}"

# =============================================================================
# Start and Install
# =============================================================================
msg_info "Starting container"

if ! pct start "${CT_ID}"; then
  echo -e "${CROSS}${RD} Failed to start container${CL}"
  exit 1
fi

# Wait for container to fully start and get network
echo -e "${INFO} Waiting for container to initialize..."
sleep 10

# Set root password
msg_info "Setting root password"
pct exec "${CT_ID}" -- bash -c "echo 'root:${CT_PASSWORD}' | chpasswd"
msg_ok "Root password configured"

# Verify container is running
if [[ "$(pct status ${CT_ID} 2>/dev/null | awk '{print $2}')" != "running" ]]; then
  echo -e "${CROSS}${RD} Container failed to start${CL}"
  exit 1
fi
msg_ok "Started container"

msg_info "Running installation script (this may take several minutes)"
pct exec "${CT_ID}" -- bash -c "$(curl -fsSL ${REPO_RAW}/deploy/proxmox/install/vibeRecipe-install.sh)"

# =============================================================================
# Complete
# =============================================================================
# Wait a moment for network to settle
sleep 2
CT_IP=$(pct exec "${CT_ID}" -- hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo -e "${GN}═══════════════════════════════════════════════════════════════${CL}"
echo -e "${GN}  ${APP} LXC Created Successfully!${CL}"
echo -e "${GN}═══════════════════════════════════════════════════════════════${CL}"
echo ""
echo -e "  ${YW}Container ID:${CL}   ${BL}${CT_ID}${CL}"
echo -e "  ${YW}Hostname:${CL}       ${BL}${CT_HOSTNAME}${CL}"
echo -e "  ${YW}IP Address:${CL}     ${BL}${CT_IP}${CL}"
echo -e "  ${YW}Access URL:${CL}     ${BL}http://${CT_IP}${CL}"
echo ""
echo -e "  ${YW}Resources:${CL}      ${CT_CPU} CPU, ${CT_RAM}MB RAM, ${CT_DISK}GB Disk"
echo ""
echo -e "${GN}═══════════════════════════════════════════════════════════════${CL}"
