#!/usr/bin/env bash
# Build and deploy the lohn.cc CRM/ERP to app.lohn.cc on this host (rootless Podman; never sudo).
#
#   ./deploy.sh              build, back up the DB, run migrations, restart, smoke-test
#   ./deploy.sh --rollback   swap back to the previous image (does NOT undo migrations, see below)
#
# Secrets (podman secrets, never in this repo): lohn_crm_database_url, lohn_crm_auth_secret.
set -euo pipefail
cd "$(dirname "$0")"

IMAGE=localhost/lohn-crm
UNIT_SRC=deploy/lohn-crm.container
UNIT_DST="$HOME/.config/containers/systemd/lohn-crm.container"
BACKUPS="$HOME/backups/lohn-crm"
KEEP=5

mode=${1:-}
case "$mode" in
  --rollback)
    podman image exists "$IMAGE:previous" || { echo "No previous image to roll back to." >&2; exit 1; }
    podman tag "$IMAGE:current" "$IMAGE:swap"
    podman tag "$IMAGE:previous" "$IMAGE:current"
    podman tag "$IMAGE:swap" "$IMAGE:previous"
    podman untag "$IMAGE:swap" "$IMAGE:swap" # image + name: `untag IMAGE` alone strips every tag
    echo "Rolled back the image. Migrations are forward-only: if the newer release changed the schema,"
    echo "restore the pre-deploy dump from $BACKUPS (pg_restore --clean) before relying on the old code."
    ;;
  "")
    rev=$(git rev-parse --short HEAD)
    [ -z "$(git status --porcelain)" ] || rev="$rev-dirty"
    echo "== Building $IMAGE:$rev"
    podman build --pull=missing -t "$IMAGE:$rev" .

    echo "== Backing up the database before migrating"
    install -d -m 700 "$BACKUPS"
    dump="$BACKUPS/pre-deploy-$(date +%Y%m%d-%H%M%S)-$rev.dump"
    podman exec postgres pg_dump -U postgres -Fc lohn_crm > "$dump"
    chmod 600 "$dump"
    echo "   $dump"

    echo "== Running migrations"
    podman run --rm --network db-net \
      --secret lohn_crm_database_url,type=env,target=DATABASE_URL \
      -w /app/packages/db "$IMAGE:$rev" node_modules/.bin/drizzle-kit migrate

    if podman image exists "$IMAGE:current"; then podman tag "$IMAGE:current" "$IMAGE:previous"; fi
    podman tag "$IMAGE:$rev" "$IMAGE:current"
    ;;
  *)
    echo "usage: $0 [--rollback]" >&2
    exit 2
    ;;
esac

if ! cmp -s "$UNIT_SRC" "$UNIT_DST"; then
  install -D -m 644 "$UNIT_SRC" "$UNIT_DST"
  systemctl --user daemon-reload
  echo "Installed $UNIT_DST"
fi
systemctl --user restart lohn-crm.service

echo "== Smoke test (from inside the caddy container, as the proxy sees it)"
for _ in $(seq 1 60); do
  podman healthcheck run lohn-crm >/dev/null 2>&1 && break
  sleep 1
done
# busybox wget follows redirects and exits non-zero on 4xx, hence the pattern parse and `|| true`.
status() { podman exec caddy wget -q -S -O /dev/null "http://lohn-crm:3000$1" 2>&1 | grep -oE 'HTTP/[0-9.]+ [0-9]{3}' | tail -n 1 | cut -d' ' -f2 || true; }
fail=0
for path in /sign-in /sign-up / /api/auth/get-session; do
  code=$(status "$path")
  printf '  %-24s %s\n' "$path" "${code:-no answer}"
  [ "$code" = 200 ] || fail=1
done

podman images --format '{{.Tag}}' "$IMAGE" | grep -vE '^(current|previous|<none>)$' | tail -n +$((KEEP + 1)) |
  while read -r tag; do podman untag "$IMAGE:$tag" "$IMAGE:$tag" 2>/dev/null || true; done
podman image prune -f >/dev/null
find "$BACKUPS" -name 'pre-deploy-*.dump' -mtime +30 -delete 2>/dev/null || true

if [ "$fail" = 0 ]; then echo "Deployed OK."; else echo "Smoke test FAILED. Roll back with: $0 --rollback" >&2; exit 1; fi
