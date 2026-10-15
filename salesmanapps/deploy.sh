#!/usr/bin/env bash
# Stage the publishable site and record which commit it came from.
#
# The commit is written to app/.commit, which netlify.toml reads when Netlify
# has no COMMIT_REF of its own (a CLI deploy does not always carry one). The
# file is untracked on purpose: it is generated at the moment of deploy from
# the real HEAD, so it cannot drift from what is being published.
#
# The deploy itself is a separate step and is deliberately not run from here,
# because it needs a one-time proxy URL that the Netlify MCP tool issues.
set -euo pipefail
cd "$(dirname "$0")"

if [ -n "$(git status --porcelain -- . 2>/dev/null)" ]; then
  echo "WARNING: uncommitted changes under salesmanapps/." >&2
  echo "         The stamp will name HEAD, which is not what you are about" >&2
  echo "         to publish. Commit first, or the audit trail is a lie." >&2
fi

REF="$(git rev-parse HEAD)"
printf '%s' "$REF" > app/.commit

rm -rf _site
mkdir -p _site/share _site/app
cp index.html playbook.html og.png favicon.svg robots.txt sitemap.xml _site/
cp share/index.html _site/share/
cp app/index.html app/sw.js app/manifest.webmanifest _site/app/
cp app/icon-192.png app/icon-512.png app/icon-maskable.png _site/app/

# Mirror what netlify.toml does, so a local preview shows the same stamp the
# published page will carry.
SHORT="$(printf '%s' "$REF" | cut -c1-7)"
sed -i "s|__BUILD__|$SHORT · $(date -u +%Y-%m-%d)|" _site/app/index.html

echo "staged _site at commit $SHORT"
grep -o 'const BUILD = "[^"]*"' _site/app/index.html
