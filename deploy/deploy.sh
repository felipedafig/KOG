#!/usr/bin/env bash
# Deploy / redeploy the KOG site to the VPS. Run from the repo root (Git Bash on
# Windows works — needs only ssh + tar, no rsync).
#
#   Usage: ./deploy/deploy.sh root@YOUR_VPS
#
# Streams kog-website/ over ssh and swaps it into /var/www/kog atomically
# (old version kept at /var/www/kog.old for instant rollback).
set -euo pipefail

HOST="${1:?Usage: ./deploy/deploy.sh user@host}"

cd "$(dirname "$0")/.."
[ -d kog-website ] || { echo "kog-website/ not found — run from the repo root"; exit 1; }

echo "==> Uploading kog-website/ to $HOST"
tar -czf - -C kog-website . | ssh "$HOST" '
  set -e
  tmp=$(mktemp -d)
  tar -xzf - -C "$tmp"
  chmod -R a+rX "$tmp"
  rm -rf /var/www/kog.old
  if [ -d /var/www/kog ]; then mv /var/www/kog /var/www/kog.old; fi
  mv "$tmp" /var/www/kog
'
echo "==> Deployed. Previous version preserved at /var/www/kog.old (rollback: swap the two back)."
