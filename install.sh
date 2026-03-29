#!/bin/bash
# ============================================================================
# Server Bootstrap Script (Minimal)
# Installiert nur was noetig ist bis das Dashboard auf Port 3005 laeuft.
# Alles weitere (PHP, MariaDB, Docker, Gitea, E-Mail, etc.) wird ueber
# Dashboard Rules installiert und verwaltet (Desired-State System).
#
# Unterstuetzt: Debian 12+ / Ubuntu 22.04+
# Usage: sudo bash install.sh
# ============================================================================

set -euo pipefail

# Spinner aufraumen bei Abbruch
cleanup() {
  if [ -n "${SPINNER_PID:-}" ]; then
    kill "$SPINNER_PID" 2>/dev/null || true
    wait "$SPINNER_PID" 2>/dev/null || true
  fi
  printf "\r\033[2K\033[?25h" >&2
}
trap cleanup EXIT

# ============================================================================
# KONFIGURATION — wird interaktiv abgefragt
# ============================================================================

DOMAIN=""
ADMIN_SUBDOMAIN=""
GIT_SUBDOMAIN=""
MAIL_HOSTNAME=""
WEBMAIL_SUBDOMAIN=""
SSH_PUBLIC_KEY=""
DASHBOARD_REPO="https://github.com/herbeckrobin/dashboard.git"
DASHBOARD_BRANCH="main"

# ============================================================================
# AB HIER NICHTS AENDERN
# ============================================================================

LOGFILE="/var/log/server-install.log"
STEP_NUM=0
TOTAL_STEPS=14

WEBHOOK_SECRET=""
MARIADB_ROOT_PASS=""
ROUNDCUBE_DB_PASS=""
CREDENTIALS_FILE="/root/.server-credentials"

save_credential() {
  local key="$1" value="$2"
  if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "# Server Credentials — generiert am $(date -Iseconds)" > "$CREDENTIALS_FILE"
    chmod 600 "$CREDENTIALS_FILE"
  fi
  echo "$key=$value" >> "$CREDENTIALS_FILE"
}

# --- Farben & Styles ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'
CHECK="✓"
CROSS="✗"
ARROW="▸"
SPINNER_CHARS='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

STEP_LABELS=(
  "DNS-Preflight-Check"
  "Base Packages installieren"
  "Deploy User einrichten"
  "Node.js 20 LTS installieren"
  "Bun installieren"
  "nginx installieren"
  "Certbot installieren"
  "Credentials generieren"
  "Dashboard installieren"
  "nginx Site einrichten"
  "SSL-Zertifikat holen"
  "Zusammenfassung"
)

# --- Helper-Funktionen ---

draw_progress() {
  local current=$STEP_NUM total=$TOTAL_STEPS width=30
  local filled=$(( current * width / total ))
  local empty=$(( width - filled ))
  local pct=$(( current * 100 / total ))
  local bar=""
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  echo -e "  ${DIM}${bar}${NC}  ${BOLD}${pct}%${NC}  ${DIM}(${current}/${total})${NC}"
}

SPINNER_PID=""
start_spinner() {
  local msg="$1"
  printf "\033[?25l" >&2
  (
    local i=0 len=${#SPINNER_CHARS}
    while true; do
      printf "\r  \033[0;36m%s\033[0m  %s" "${SPINNER_CHARS:$i:1}" "$msg" >&2
      i=$(( (i + 1) % len ))
      sleep 0.1
    done
  ) &
  SPINNER_PID=$!
  disown "$SPINNER_PID" 2>/dev/null
}

stop_spinner() {
  local status="$1" msg="$2"
  if [ -n "$SPINNER_PID" ]; then
    kill "$SPINNER_PID" 2>/dev/null
    wait "$SPINNER_PID" 2>/dev/null || true
    SPINNER_PID=""
  fi
  printf "\r\033[2K\033[?25h" >&2
  case "$status" in
    ok)   printf "  ${GREEN}${CHECK}${NC}  %s\n" "$msg" ;;
    warn) printf "  ${YELLOW}!${NC}  %s\n" "$msg" ;;
    fail) printf "  ${RED}${CROSS}${NC}  %s\n" "$msg" ;;
  esac
}

run_silent() {
  local msg="$1"; shift
  start_spinner "$msg"
  if "$@" >> "$LOGFILE" 2>&1; then
    stop_spinner "ok" "$msg"; return 0
  else
    stop_spinner "fail" "$msg"; return 1
  fi
}

info()    { echo -e "  ${DIM}${ARROW}${NC} $1"; echo "[INFO] $1" >> "$LOGFILE"; }
success() { echo -e "  ${GREEN}${CHECK}${NC}  $1"; echo "[OK] $1" >> "$LOGFILE"; }
warn()    { echo -e "  ${YELLOW}!${NC}  $1"; echo "[WARN] $1" >> "$LOGFILE"; }
error()   { echo -e "\n  ${RED}${CROSS}  $1${NC}"; echo "[ERROR] $1" >> "$LOGFILE"; exit 1; }

step() {
  STEP_NUM=$((STEP_NUM + 1))
  echo "" >> "$LOGFILE"; echo "[$STEP_NUM/$TOTAL_STEPS] $1" >> "$LOGFILE"
  echo ""; draw_progress; echo ""
  echo -e "  ${BOLD}${BLUE}${ARROW}${NC} ${BOLD}$1${NC}"; echo ""
}

gen_password() { openssl rand -base64 24 | tr -d '/+=' | head -c 24; }

print_banner() {
  echo ""
  echo -e "${BOLD}${CYAN}"
  cat << 'BANNER'
   ╔═══════════════════════════════════════════════╗
   ║                                               ║
   ║        ┌─┐┌─┐┬─┐┬  ┬┌─┐┬─┐                  ║
   ║        └─┐├┤ ├┬┘└┐┌┘├┤ ├┬┘                  ║
   ║        └─┘└─┘┴└─ └┘ └─┘┴└─                  ║
   ║        B O O T S T R A P                      ║
   ║                                               ║
   ╚═══════════════════════════════════════════════╝
BANNER
  echo -e "${NC}"
  echo -e "  ${DIM}Minimales Setup — Dashboard uebernimmt den Rest${NC}"
  echo -e "  ${DIM}$(date '+%Y-%m-%d %H:%M')${NC}"
  echo ""
}

check_root() {
  if [ "$(id -u)" -ne 0 ]; then
    error "Dieses Script muss als root ausgefuehrt werden: sudo bash install.sh"
  fi
}

OS_ID=""
OS_VERSION=""
OS_CODENAME=""

detect_os() {
  [ -f /etc/os-release ] || error "Kann /etc/os-release nicht finden. Nur Debian/Ubuntu wird unterstuetzt."
  . /etc/os-release
  OS_ID="$ID"; OS_VERSION="${VERSION_ID%%.*}"; OS_CODENAME="${VERSION_CODENAME:-}"
  case "$OS_ID" in
    debian) [ "$OS_VERSION" -lt 12 ] && error "Mindestens Debian 12 erforderlich."; info "Erkannt: Debian $VERSION_ID ($OS_CODENAME)" ;;
    ubuntu) [ "$OS_VERSION" -lt 22 ] && error "Mindestens Ubuntu 22.04 erforderlich."; info "Erkannt: Ubuntu $VERSION_ID ($OS_CODENAME)" ;;
    *) error "OS '$OS_ID' wird nicht unterstuetzt. Nur Debian 12+ und Ubuntu 22.04+." ;;
  esac
}

interactive_setup() {
  echo -e "  ${BOLD}Konfiguration${NC}"
  echo -e "  ${DIM}─────────────────────────────────────────────${NC}"
  echo ""

  while [ -z "$DOMAIN" ]; do
    echo -ne "  ${CYAN}${ARROW}${NC} Domain ${DIM}(z.B. example.de)${NC}: "
    read -r DOMAIN
  done

  local default_admin="admin.${DOMAIN}" default_git="git.${DOMAIN}" default_mail="mail.${DOMAIN}" default_webmail="webmail.${DOMAIN}"

  echo -ne "  ${CYAN}${ARROW}${NC} Admin-Subdomain ${DIM}[${default_admin}]${NC}: "
  read -r ADMIN_SUBDOMAIN; ADMIN_SUBDOMAIN="${ADMIN_SUBDOMAIN:-$default_admin}"

  echo -ne "  ${CYAN}${ARROW}${NC} Git-Subdomain ${DIM}[${default_git}]${NC}: "
  read -r GIT_SUBDOMAIN; GIT_SUBDOMAIN="${GIT_SUBDOMAIN:-$default_git}"

  echo -ne "  ${CYAN}${ARROW}${NC} Mail-Hostname ${DIM}[${default_mail}]${NC}: "
  read -r MAIL_HOSTNAME; MAIL_HOSTNAME="${MAIL_HOSTNAME:-$default_mail}"

  echo -ne "  ${CYAN}${ARROW}${NC} Webmail-Subdomain ${DIM}[${default_webmail}]${NC}: "
  read -r WEBMAIL_SUBDOMAIN; WEBMAIL_SUBDOMAIN="${WEBMAIL_SUBDOMAIN:-$default_webmail}"

  echo ""
  while [ -z "$SSH_PUBLIC_KEY" ]; do
    echo -e "  ${CYAN}${ARROW}${NC} SSH Public Key ${DIM}(ssh-ed25519 oder ssh-rsa)${NC}"
    echo -ne "    "; read -r SSH_PUBLIC_KEY
    if [[ ! "$SSH_PUBLIC_KEY" =~ ^ssh- ]]; then
      echo -e "    ${RED}${CROSS} Ungueltig — muss mit 'ssh-' beginnen${NC}"
      SSH_PUBLIC_KEY=""
    fi
  done

  echo ""
  echo -e "  ${BOLD}Zusammenfassung${NC}"
  echo -e "  ${DIM}─────────────────────────────────────────────${NC}"
  echo -e "  Domain          ${GREEN}${DOMAIN}${NC}"
  echo -e "  Admin           ${GREEN}${ADMIN_SUBDOMAIN}${NC}"
  echo -e "  Git             ${GREEN}${GIT_SUBDOMAIN}${NC}"
  echo -e "  Mail            ${GREEN}${MAIL_HOSTNAME}${NC}"
  echo -e "  Webmail         ${GREEN}${WEBMAIL_SUBDOMAIN}${NC}"
  echo -e "  SSH Key         ${GREEN}${SSH_PUBLIC_KEY:0:40}...${NC}"
  echo ""
  echo -ne "  ${YELLOW}${ARROW}${NC} Weiter mit diesen Einstellungen? ${DIM}[J/n]${NC} "
  read -r confirm
  [[ "$confirm" =~ ^[nN] ]] && error "Abgebrochen. Script erneut starten."
  echo ""
}

# DNS-Status
DNS_OK_ADMIN=false
DNS_OK_WEBMAIL=false

check_dns() {
  step "DNS-Preflight-Check"

  if ! command -v dig &>/dev/null; then
    run_silent "dnsutils installieren" apt-get install -y -qq dnsutils
  fi

  local server_ip
  server_ip=$(curl -4 -s --max-time 5 ifconfig.me 2>/dev/null || echo "")
  if [ -z "$server_ip" ]; then
    warn "Server-IP nicht ermittelbar — DNS-Check uebersprungen"
    return 0
  fi
  info "Server-IP: $server_ip"

  local resolved
  resolved=$(dig +short "$ADMIN_SUBDOMAIN" A 2>/dev/null | head -1)
  if [ "$resolved" = "$server_ip" ]; then
    success "$ADMIN_SUBDOMAIN → $resolved"
    DNS_OK_ADMIN=true
  elif [ -n "$resolved" ]; then
    warn "$ADMIN_SUBDOMAIN → $resolved ${DIM}(erwartet: $server_ip)${NC}"
  else
    warn "$ADMIN_SUBDOMAIN → nicht aufloesbar"
  fi

  resolved=$(dig +short "$WEBMAIL_SUBDOMAIN" A 2>/dev/null | head -1)
  if [ "$resolved" = "$server_ip" ]; then
    success "$WEBMAIL_SUBDOMAIN → $resolved"
    DNS_OK_WEBMAIL=true
  elif [ -n "$resolved" ]; then
    warn "$WEBMAIL_SUBDOMAIN → $resolved ${DIM}(erwartet: $server_ip)${NC}"
  else
    warn "$WEBMAIL_SUBDOMAIN → nicht aufloesbar"
  fi
}

# ============================================================================
# INSTALLATIONSSCHRITTE
# ============================================================================

install_base_packages() {
  step "Base Packages installieren"
  export DEBIAN_FRONTEND=noninteractive
  run_silent "apt update" apt-get update -qq
  run_silent "System-Upgrade" apt-get upgrade -y -qq

  local asound_pkg="libasound2"
  [[ "$OS_ID" == "ubuntu" ]] && [ "$OS_VERSION" -ge 24 ] && asound_pkg="libasound2t64"

  run_silent "Pakete installieren" apt-get install -y -qq \
    git curl wget unzip apache2-utils software-properties-common \
    gnupg2 ca-certificates lsb-release apt-transport-https \
    jq rsync \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libxshmfence1 libxfixes3 libx11-xcb1 \
    libxcb1 libx11-6 libxext6 libxrender1 libxtst6 libxi6 \
    libfontconfig1 libfreetype6 libxcursor1 libxss1 \
    fonts-liberation "$asound_pkg"
  success "Base Packages installiert"
}

setup_deploy_user() {
  step "Deploy User einrichten"

  if id deploy &>/dev/null; then
    info "User 'deploy' existiert bereits"
  else
    useradd -m -s /bin/bash deploy
    success "User 'deploy' erstellt"
  fi

  # Home-Dir muss 755 sein damit nginx auf /home/deploy/apps/ zugreifen kann
  chmod 755 /home/deploy

  mkdir -p /home/deploy/.ssh
  echo "$SSH_PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys
  sort -u /home/deploy/.ssh/authorized_keys -o /home/deploy/.ssh/authorized_keys
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh

  mkdir -p /root/.ssh
  echo "$SSH_PUBLIC_KEY" >> /root/.ssh/authorized_keys
  sort -u /root/.ssh/authorized_keys -o /root/.ssh/authorized_keys
  chmod 700 /root/.ssh
  chmod 600 /root/.ssh/authorized_keys

  cat > /etc/sudoers.d/deploy-full << 'SUDOERS'
deploy ALL=(ALL) NOPASSWD: ALL
SUDOERS
  chmod 440 /etc/sudoers.d/deploy-full
  success "Deploy User eingerichtet mit NOPASSWD sudo (wird am Ende eingeschraenkt)"
}

harden_sudoers() {
  step "Sudo-Rechte einschraenken (Least Privilege)"

  cat > /tmp/deploy-sudoers << 'SUDOERS'
# Dashboard deploy-User — eingeschraenkte sudo-Rechte
# Erstellt durch install.sh, verwaltet durch Dashboard Rules

# Paketmanager
deploy ALL=(ALL) NOPASSWD: /usr/bin/apt-get update, /usr/bin/apt-get update *, /usr/bin/apt-get install *, /usr/bin/apt-get upgrade *

# Systemd Services
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl start *, /usr/bin/systemctl stop *, /usr/bin/systemctl restart *, /usr/bin/systemctl reload *, /usr/bin/systemctl enable *, /usr/bin/systemctl is-active *

# nginx
deploy ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/mv /tmp/nginx-* /etc/nginx/sites-available/*, /usr/bin/ln -sf /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*, /usr/bin/rm -f /etc/nginx/sites-enabled/*, /usr/bin/rm -f /etc/nginx/sites-available/*, /usr/bin/rm -f /etc/nginx/sites-enabled/* /etc/nginx/sites-available/*, /usr/bin/sed -i * /etc/nginx/*, /usr/bin/cat /etc/nginx/sites-available/*

# SSL/Certbot
deploy ALL=(ALL) NOPASSWD: /usr/bin/certbot *

# htpasswd
deploy ALL=(ALL) NOPASSWD: /usr/bin/mkdir -p /etc/nginx/htpasswd, /usr/bin/mv /tmp/htpasswd-* /etc/nginx/htpasswd/*, /usr/bin/rm -f /etc/nginx/htpasswd/*

# Firewall
deploy ALL=(ALL) NOPASSWD: /usr/sbin/ufw *, /usr/sbin/ufw status *

# Fail2ban
deploy ALL=(ALL) NOPASSWD: /usr/bin/fail2ban-client *

# Crontab
deploy ALL=(ALL) NOPASSWD: /usr/bin/crontab *

# Docker
deploy ALL=(ALL) NOPASSWD: /usr/bin/docker *, /usr/bin/docker-compose *, /usr/bin/docker compose *

# SSH Config (nur sed fuer sshd_config)
deploy ALL=(ALL) NOPASSWD: /usr/bin/sed -i * /etc/ssh/sshd_config, /usr/bin/grep * /etc/ssh/sshd_config

# Dateiverwaltung (eingeschraenkt auf Server-Pfade)
deploy ALL=(ALL) NOPASSWD: /usr/bin/chown * /home/deploy/*, /usr/bin/chmod * /home/deploy/*, /usr/bin/chown * /var/*, /usr/bin/chmod * /var/*, /usr/bin/mkdir -p /opt/*, /usr/bin/mv /tmp/* /opt/*, /usr/bin/mv /tmp/* /etc/*, /usr/bin/mv /tmp/* /usr/share/keyrings/*

# DKIM / Rspamd
deploy ALL=(ALL) NOPASSWD: /usr/bin/openssl genrsa *, /usr/bin/openssl rsa *, /usr/bin/chown _rspamd\:_rspamd *, /usr/bin/chmod 640 /var/lib/rspamd/dkim/*, /usr/bin/systemctl reload rspamd

# Mail (Postfix/Dovecot)
deploy ALL=(ALL) NOPASSWD: /usr/sbin/postconf *, /usr/sbin/postmap *, /usr/bin/touch /etc/postfix/*, /usr/bin/touch /etc/dovecot/*, /usr/sbin/htpasswd *
deploy ALL=(ALL) NOPASSWD: /usr/bin/rm -f /var/lib/dovecot/sieve/vacation/*, /usr/bin/mkdir -p /var/lib/dovecot/sieve/vacation, /usr/bin/mv /tmp/sieve-vacation.sieve /var/lib/dovecot/sieve/vacation/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/chown -R vmail\:vmail /var/lib/dovecot/sieve/vacation
deploy ALL=(root) NOPASSWD: /usr/bin/sievec /var/lib/dovecot/sieve/vacation/*
deploy ALL=(vmail) NOPASSWD: /usr/bin/sievec /var/lib/dovecot/sieve/vacation/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/ln -sf /var/lib/dovecot/sieve/vacation/* /var/lib/dovecot/sieve/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/mv /tmp/postfix-virtual-* /etc/postfix/virtual/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/chown root\:root /etc/postfix/virtual/*
deploy ALL=(ALL) NOPASSWD: /usr/sbin/postmap /etc/postfix/virtual/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/mv /tmp/dovecot-passwd /etc/dovecot/users/passwd
deploy ALL=(ALL) NOPASSWD: /usr/bin/chmod 640 /etc/dovecot/users/passwd
deploy ALL=(ALL) NOPASSWD: /usr/bin/chown root\:dovecot /etc/dovecot/users/passwd
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload postfix, /usr/bin/systemctl reload dovecot, /usr/bin/doveadm reload
deploy ALL=(ALL) NOPASSWD: /usr/sbin/postqueue *, /usr/sbin/postsuper *

# User-Management (fuer vmail)
deploy ALL=(ALL) NOPASSWD: /usr/sbin/groupadd *, /usr/sbin/useradd *

# Apps-Verzeichnis
deploy ALL=(ALL) NOPASSWD: /usr/bin/rm -rf /home/deploy/apps/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/chown -R www-data\:www-data /home/deploy/apps/*/wp-content/uploads
deploy ALL=(ALL) NOPASSWD: /usr/bin/chown -R deploy\:www-data /home/deploy/apps/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/chmod -R g+w /home/deploy/apps/*
deploy ALL=(ALL) NOPASSWD: /usr/bin/find /home/deploy/apps/* -type d -exec chmod g+s {} +

# MariaDB
deploy ALL=(ALL) NOPASSWD: /usr/bin/mysql *, /usr/bin/mariadb, /usr/bin/mariadb *

# debconf
deploy ALL=(ALL) NOPASSWD: /usr/bin/debconf-set-selections

# Find (fuer Permissions)
deploy ALL=(ALL) NOPASSWD: /usr/bin/find /home/deploy/*

# Dashboard Service
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart admin-dashboard
deploy ALL=(ALL) NOPASSWD: /usr/bin/du -sb /var/vmail/*

# Sudoers (fuer Audit)
deploy ALL=(ALL) NOPASSWD: /usr/bin/grep * /etc/sudoers*, /usr/sbin/visudo -c *

# Systemd daemon-reload
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl daemon-reload

# Fail2ban Config
deploy ALL=(ALL) NOPASSWD: /usr/bin/sed -i * /etc/fail2ban/*, /usr/bin/tee -a /etc/fail2ban/*

# PHP Config
deploy ALL=(ALL) NOPASSWD: /usr/bin/sed -i * /etc/php/*

# Gitea Docker Config
deploy ALL=(ALL) NOPASSWD: /usr/bin/sed -i * /opt/gitea/*
SUDOERS

  # Syntax pruefen bevor wir die Datei aktivieren
  if visudo -c -f /tmp/deploy-sudoers >> "$LOGFILE" 2>&1; then
    mv /tmp/deploy-sudoers /etc/sudoers.d/deploy
    chown root:root /etc/sudoers.d/deploy
    chmod 440 /etc/sudoers.d/deploy
    rm -f /etc/sudoers.d/deploy-full
    success "Sudo-Rechte eingeschraenkt (deploy-full entfernt)"
  else
    warn "Sudoers-Syntax fehlerhaft — deploy-full bleibt bestehen (Dashboard Rule wird es korrigieren)"
    rm -f /tmp/deploy-sudoers
  fi
}

install_nodejs() {
  step "Node.js 20 LTS installieren"
  if command -v node &>/dev/null; then
    info "Bereits installiert: $(node --version)"
  else
    run_silent "NodeSource-Repo hinzufuegen" bash -c 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -'
    run_silent "Node.js installieren" apt-get install -y -qq nodejs
    success "Node.js $(node --version) installiert"
  fi
}

install_bun() {
  step "Bun installieren"
  if su - deploy -c "command -v bun" &>/dev/null; then
    info "Bereits installiert: $(su - deploy -c 'bun --version')"
  else
    run_silent "Bun installieren" su - deploy -c 'curl -fsSL https://bun.sh/install | bash'
    success "Bun installiert"
  fi
}

install_nginx() {
  step "nginx installieren"
  if dpkg -l nginx &>/dev/null 2>&1; then
    info "Bereits installiert"
  else
    run_silent "nginx installieren" apt-get install -y -qq nginx
    systemctl enable nginx >> "$LOGFILE" 2>&1
  fi

  local nginx_conf="/etc/nginx/nginx.conf"
  if ! grep -q 'server_tokens off' "$nginx_conf"; then
    sed -i '/http {/a \\tserver_tokens off;' "$nginx_conf"
  fi

  mkdir -p /etc/nginx/snippets
  cat > /etc/nginx/snippets/security-headers.conf << 'NGINX'
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
NGINX

  mkdir -p /etc/nginx/htpasswd
  nginx -t >> "$LOGFILE" 2>&1
  systemctl reload nginx >> "$LOGFILE" 2>&1
  success "nginx konfiguriert (Security Headers, server_tokens off)"
}

install_certbot() {
  step "Certbot installieren"
  if command -v certbot &>/dev/null; then
    info "Bereits installiert"
  else
    run_silent "Certbot + nginx-Plugin installieren" apt-get install -y -qq certbot python3-certbot-nginx
    success "Certbot installiert"
  fi
}

gen_credentials() {
  step "Credentials generieren"
  WEBHOOK_SECRET=$(openssl rand -hex 32)
  save_credential "WEBHOOK_SECRET" "$WEBHOOK_SECRET"
  MARIADB_ROOT_PASS=$(gen_password)
  save_credential "MARIADB_ROOT_PASSWORD" "$MARIADB_ROOT_PASS"
  success "Credentials generiert und in $CREDENTIALS_FILE gespeichert"
}

setup_dashboard() {
  step "Dashboard installieren"

  local dashboard_dir="/home/deploy/apps/admin-dashboard"
  mkdir -p "$dashboard_dir"
  mkdir -p /home/deploy/apps
  mkdir -p /home/deploy/cache

  if [ -d "$dashboard_dir/.git" ]; then
    info "Repo vorhanden, aktualisiere..."
    git -C "$dashboard_dir" fetch origin >> "$LOGFILE" 2>&1
    git -C "$dashboard_dir" reset --hard "origin/$DASHBOARD_BRANCH" >> "$LOGFILE" 2>&1
  else
    run_silent "Dashboard-Repo klonen" git clone -b "$DASHBOARD_BRANCH" "$DASHBOARD_REPO" "$dashboard_dir"
  fi

  mkdir -p "$dashboard_dir/data/deploy-logs"
  mkdir -p "$dashboard_dir/data/email"

  [ -f "$dashboard_dir/data/projects.json" ] || echo '{"projects":[]}' > "$dashboard_dir/data/projects.json"
  [ -f "$dashboard_dir/data/auth.json" ] || echo '{}' > "$dashboard_dir/data/auth.json"
  [ -f "$dashboard_dir/data/config.json" ] || echo '{}' > "$dashboard_dir/data/config.json"
  [ -f "$dashboard_dir/data/deploy-history.json" ] || echo '{"deploys":[]}' > "$dashboard_dir/data/deploy-history.json"
  [ -f "$dashboard_dir/data/groups.json" ] || echo '{"groups":[]}' > "$dashboard_dir/data/groups.json"
  [ -f "$dashboard_dir/data/email/domains.json" ] || echo '[]' > "$dashboard_dir/data/email/domains.json"
  [ -f "$dashboard_dir/data/email/accounts.json" ] || echo '[]' > "$dashboard_dir/data/email/accounts.json"
  [ -f "$dashboard_dir/data/email/aliases.json" ] || echo '[]' > "$dashboard_dir/data/email/aliases.json"

  # Domain-Konfiguration in config.json schreiben
  local config_file="$dashboard_dir/data/config.json"
  local webmail_url="https://webmail.${DOMAIN}"
  local node_cmd="node"
  command -v node &>/dev/null || node_cmd="/home/deploy/.bun/bin/bun"
  $node_cmd -e "
    const fs = require('fs');
    const f = '$config_file';
    let c = {};
    try { c = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
    Object.assign(c, {
      serverDomain: '$DOMAIN',
      gitDomain: '$GIT_SUBDOMAIN',
      mailDomain: '$MAIL_HOSTNAME',
      adminDomain: '$ADMIN_SUBDOMAIN',
      webmailUrl: '$webmail_url'
    });
    fs.writeFileSync(f, JSON.stringify(c, null, 2));
  "
  info "Domain-Config geschrieben"

  echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}" > "$dashboard_dir/.env"
  chmod 600 "$dashboard_dir/.env"
  chmod 600 "$dashboard_dir/data/projects.json" "$dashboard_dir/data/auth.json" "$dashboard_dir/data/config.json"
  chown -R deploy:deploy /home/deploy/apps
  chown -R deploy:deploy /home/deploy/cache

  run_silent "Dependencies installieren (bun install)" su - deploy -c "cd $dashboard_dir && export PATH=\$HOME/.bun/bin:\$PATH && bun install 2>&1"
  run_silent "Dashboard bauen (bun run build)" su - deploy -c "cd $dashboard_dir && export PATH=\$HOME/.bun/bin:\$PATH && bun run build 2>&1"

  cat > /etc/systemd/system/admin-dashboard.service << SERVICE
[Unit]
Description=Admin Dashboard
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=$dashboard_dir
ExecStart=/home/deploy/.bun/bin/bun run start
Restart=always
Environment=NODE_ENV=production
Environment=PATH=/home/deploy/.bun/bin:/usr/local/bin:/usr/bin:/bin
EnvironmentFile=$dashboard_dir/.env

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload >> "$LOGFILE" 2>&1
  systemctl enable admin-dashboard >> "$LOGFILE" 2>&1
  systemctl start admin-dashboard >> "$LOGFILE" 2>&1
  success "Dashboard laeuft auf Port 3005"
}

setup_nginx_admin() {
  step "nginx Site einrichten (Admin Dashboard)"

  cat > "/etc/nginx/sites-available/$ADMIN_SUBDOMAIN" << NGINX
server {
    listen 80;
    server_name $ADMIN_SUBDOMAIN;

    include snippets/security-headers.conf;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

  ln -sf "/etc/nginx/sites-available/$ADMIN_SUBDOMAIN" "/etc/nginx/sites-enabled/"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t >> "$LOGFILE" 2>&1
  systemctl reload nginx >> "$LOGFILE" 2>&1
  success "nginx Site aktiv ($ADMIN_SUBDOMAIN)"
}

setup_ssl_admin() {
  step "SSL-Zertifikat holen"
  if [ "$DNS_OK_ADMIN" = true ]; then
    run_silent "SSL: $ADMIN_SUBDOMAIN" certbot --nginx -d "$ADMIN_SUBDOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
      warn "SSL fuer $ADMIN_SUBDOMAIN fehlgeschlagen — wird per Cron nachgeholt"
    }
  else
    warn "SSL uebersprungen (DNS nicht bereit) — wird per Dashboard Rules nachgeholt"
  fi
}

install_webmail() {
  step "Webmail (Roundcube) installieren"

  local rc_version="1.6.9"
  local rc_dir="/var/www/roundcube"

  ROUNDCUBE_DB_PASS=$(gen_password)
  save_credential "ROUNDCUBE_DB_PASSWORD" "$ROUNDCUBE_DB_PASS"

  # PHP 8.2
  if ! command -v php &>/dev/null; then
    run_silent "PHP 8.2 installieren" apt-get install -y -qq \
      php8.2-fpm php8.2-cli php8.2-mysql php8.2-xml php8.2-mbstring \
      php8.2-intl php8.2-zip php8.2-gd php8.2-curl php8.2-opcache
    systemctl enable php8.2-fpm >> "$LOGFILE" 2>&1
    systemctl start php8.2-fpm >> "$LOGFILE" 2>&1
    success "PHP 8.2 installiert"
  else
    info "PHP bereits installiert: $(php --version | head -1)"
  fi

  # MariaDB
  if ! command -v mysql &>/dev/null; then
    run_silent "MariaDB installieren" apt-get install -y -qq mariadb-server
    systemctl enable mariadb >> "$LOGFILE" 2>&1
    systemctl start mariadb >> "$LOGFILE" 2>&1
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MARIADB_ROOT_PASS}';" 2>/dev/null || true
    mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    success "MariaDB installiert"
  else
    info "MariaDB bereits installiert"
  fi

  # Roundcube Datenbank anlegen (unix-socket auth fuer root)
  mysql -e "CREATE DATABASE IF NOT EXISTS roundcube CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
  mysql -e "CREATE USER IF NOT EXISTS 'roundcube'@'localhost' IDENTIFIED BY '${ROUNDCUBE_DB_PASS}';" 2>/dev/null || true
  mysql -e "GRANT ALL PRIVILEGES ON roundcube.* TO 'roundcube'@'localhost';" 2>/dev/null || true
  mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true

  # Roundcube herunterladen
  if [ -f "$rc_dir/index.php" ]; then
    info "Roundcube bereits installiert (${rc_dir})"
  else
    run_silent "Roundcube ${rc_version} herunterladen" wget -q \
      "https://github.com/roundcube/roundcubemail/releases/download/${rc_version}/roundcubemail-${rc_version}-complete.tar.gz" \
      -O /tmp/roundcube.tar.gz
    run_silent "Roundcube entpacken" bash -c \
      "cd /tmp && tar xzf roundcube.tar.gz && mv roundcubemail-${rc_version} ${rc_dir}"
    rm -f /tmp/roundcube.tar.gz
    success "Roundcube ${rc_version} entpackt"
  fi

  # config.inc.php schreiben
  local des_key
  des_key=$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)
  cat > "$rc_dir/config/config.inc.php" << CONFIG
<?php
\$config['db_dsnw'] = 'mysql://roundcube:${ROUNDCUBE_DB_PASS}@localhost/roundcube';
\$config['imap_host'] = 'ssl://${MAIL_HOSTNAME}:993';
\$config['smtp_host'] = 'tls://${MAIL_HOSTNAME}:587';
\$config['smtp_user'] = '%u';
\$config['smtp_pass'] = '%p';
\$config['product_name'] = 'Webmail';
\$config['des_key'] = '${des_key}';
\$config['plugins'] = ['archive', 'zipdownload', 'managesieve'];
\$config['skin'] = 'elastic';
\$config['language'] = 'de_DE';
\$config['managesieve_host'] = 'localhost';
\$config['managesieve_port'] = 4190;
\$config['support_url'] = '';
\$config['ip_check'] = true;
\$config['enable_installer'] = false;
\$config['log_driver'] = 'syslog';
CONFIG

  # DB-Schema initialisieren (nur beim ersten Mal)
  if ! mysql roundcube -e "SELECT 1 FROM users LIMIT 1;" &>/dev/null 2>&1; then
    run_silent "Roundcube DB-Schema initialisieren" \
      mysql -u roundcube -p"${ROUNDCUBE_DB_PASS}" roundcube < "$rc_dir/SQL/mysql.initial.sql"
  fi

  # Berechtigungen
  chown -R www-data:www-data "$rc_dir"
  chmod 750 "$rc_dir/config" "$rc_dir/temp" "$rc_dir/logs"

  # nginx vhost
  cat > "/etc/nginx/sites-available/$WEBMAIL_SUBDOMAIN" << NGINX
server {
    listen 80;
    server_name $WEBMAIL_SUBDOMAIN;
    root $rc_dir;
    index index.php;

    include snippets/security-headers.conf;

    location / {
        try_files \$uri \$uri/ /index.php?\$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
    }

    location ~ /\.(ht|git|svn) { deny all; }
    location ~ ^/(config|temp|logs)/ { deny all; }
    location ~ ^/SQL { deny all; }
    location ~ ^/INSTALL { deny all; }
    location ~ ^/CHANGELOG { deny all; }

    client_max_body_size 25M;
}
NGINX

  ln -sf "/etc/nginx/sites-available/$WEBMAIL_SUBDOMAIN" "/etc/nginx/sites-enabled/"
  nginx -t >> "$LOGFILE" 2>&1
  systemctl reload nginx >> "$LOGFILE" 2>&1

  # SSL
  if [ "$DNS_OK_WEBMAIL" = true ]; then
    run_silent "SSL: $WEBMAIL_SUBDOMAIN" certbot --nginx -d "$WEBMAIL_SUBDOMAIN" \
      --non-interactive --agree-tos --register-unsafely-without-email || {
      warn "SSL fuer $WEBMAIL_SUBDOMAIN fehlgeschlagen — wird per Cron nachgeholt"
    }
  else
    warn "SSL uebersprungen (DNS nicht bereit) — wird per Dashboard Rules nachgeholt"
  fi

  success "Roundcube ${rc_version} installiert (${WEBMAIL_SUBDOMAIN})"
}

print_summary() {
  step "Zusammenfassung"

  local duration=$SECONDS
  local mins=$((duration / 60))
  local secs=$((duration % 60))

  echo ""
  echo -e "  ${GREEN}╔═══════════════════════════════════════════════╗${NC}"
  echo -e "  ${GREEN}║                                               ║${NC}"
  echo -e "  ${GREEN}║   ${BOLD}${CHECK}  Bootstrap erfolgreich!${NC}${GREEN}                ║${NC}"
  echo -e "  ${GREEN}║      ${DIM}Dauer: ${mins}m ${secs}s${NC}${GREEN}                           ║${NC}"
  echo -e "  ${GREEN}║                                               ║${NC}"
  echo -e "  ${GREEN}╚═══════════════════════════════════════════════╝${NC}"
  echo ""

  echo -e "  ${BOLD}Dashboard${NC}"
  echo -e "  ${DIM}─────────────────────────────────────────────${NC}"
  echo -e "  URL             ${CYAN}https://$ADMIN_SUBDOMAIN${NC}"
  echo ""

  echo -e "  ${BOLD}Webmail${NC}"
  echo -e "  ${DIM}─────────────────────────────────────────────${NC}"
  echo -e "  URL             ${CYAN}https://$WEBMAIL_SUBDOMAIN${NC}"
  echo ""

  echo -e "  ${BOLD}Credentials${NC}"
  echo -e "  ${DIM}─────────────────────────────────────────────${NC}"
  echo -e "  MariaDB         ${YELLOW}$MARIADB_ROOT_PASS${NC}"
  echo -e "  Roundcube DB    ${YELLOW}$ROUNDCUBE_DB_PASS${NC}"
  echo -e "  Webhook         ${YELLOW}${WEBHOOK_SECRET:0:20}...${NC}"
  echo -e "  ${DIM}Gespeichert: /root/.server-credentials${NC}"
  echo ""

  echo -e "  ${BOLD}Naechste Schritte${NC}"
  echo -e "  ${DIM}─────────────────────────────────────────────${NC}"
  echo ""
  echo -e "  ${BOLD}1.${NC} Dashboard aufrufen: ${CYAN}https://$ADMIN_SUBDOMAIN${NC}"
  echo -e "     ${DIM}Beim ersten Aufruf wird ein Admin-Passwort gesetzt${NC}"
  echo ""
  echo -e "  ${BOLD}2.${NC} Dashboard Rules: ${CYAN}/rules${NC}"
  echo -e "     ${DIM}Audit starten → fehlende Komponenten erkennen${NC}"
  echo -e "     ${DIM}\"Alle beheben\" → PHP, MariaDB, Docker, Gitea,${NC}"
  echo -e "     ${DIM}E-Mail, Firewall, Backup, etc. automatisch installieren${NC}"
  echo ""
  echo -e "  ${DIM}Logfile: $LOGFILE${NC}"
  echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  echo "" > "$LOGFILE"
  SECONDS=0

  print_banner
  check_root
  detect_os

  echo ""
  interactive_setup
  check_dns
  install_base_packages
  setup_deploy_user
  install_nodejs
  install_bun
  install_nginx
  install_certbot
  gen_credentials
  setup_dashboard
  setup_nginx_admin
  setup_ssl_admin
  install_webmail
  harden_sudoers
  print_summary
}

main "$@"
