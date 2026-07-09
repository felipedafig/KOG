#!/usr/bin/env bash
# One-time VPS provisioning for the KOG site (Ubuntu/Debian, run as root).
#
#   Usage (from the repo root on your local machine):
#     ssh root@YOUR_VPS 'DOMAIN=demo.example.com bash -s' < deploy/setup-vps.sh
#
# Installs Caddy (official repo), creates /var/www/kog, writes the site config
# and opens the firewall. Automatic HTTPS via Let's Encrypt as soon as DOMAIN's
# DNS A record points at this machine. Idempotent — safe to re-run.
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=demo.example.com bash setup-vps.sh}"

echo "==> Installing Caddy"
apt-get update -qq
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq
apt-get install -y -qq caddy

echo "==> Preparing web root"
mkdir -p /var/www/kog

echo "==> Writing /etc/caddy/Caddyfile (domain: $DOMAIN)"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
	root * /var/www/kog
	encode zstd gzip
	file_server

	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	@static path /assets/*
	header @static Cache-Control "public, max-age=604800"

	@app path *.html *.js /
	header @app Cache-Control "no-cache"
}
EOF

echo "==> Opening firewall (if ufw is active)"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp
  ufw allow 443/tcp
fi

systemctl enable --now caddy
systemctl reload caddy

echo "==> Done. Now deploy the site content with: ./deploy/deploy.sh root@$(hostname -I | awk '{print $1}')"
echo "    Then open https://$DOMAIN"
