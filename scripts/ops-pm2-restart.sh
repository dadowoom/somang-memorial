#!/bin/bash -p
set -euo pipefail

# Install the reviewed file as root:root 0755 at
# /usr/local/bin/somang-pm2-restart. Do not run an app-writable copy as root.
if [ "$#" -ne 1 ] || [ "${1-}" != 'somang-memorial' ]; then
  printf '%s\n' 'Only somang-memorial may be restarted, with no extra arguments.' >&2
  exit 2
fi

if [ "$(/usr/bin/id -u)" != '0' ]; then
  printf '%s\n' 'The existing root PM2 manager must perform this restart.' >&2
  exit 1
fi

# Resolve the dedicated account on this server; never assume a numeric UID.
# A missing account, root identity or different primary group blocks restart.
runtime_uid="$(/usr/bin/id -u somangapp)"
runtime_gid="$(/usr/bin/id -g somangapp)"
runtime_group="$(/usr/bin/id -gn somangapp)"
if [[ ! "$runtime_uid" =~ ^[1-9][0-9]*$ ]] ||
   [[ ! "$runtime_gid" =~ ^[1-9][0-9]*$ ]] ||
   [ "$runtime_group" != 'somangapp' ]; then
  printf '%s\n' 'somangapp must have a non-root UID/GID and primary group somangapp.' >&2
  exit 1
fi

# Keep the shared PM2 manager in its existing home. The child receives only
# these fixed overrides; PM2 retains its existing app configuration and dotenv
# continues to read the release .env. Never run a global PM2 save here.
/usr/bin/python3 -I /usr/local/lib/dadowoom-storage/upload-mount-guard.py somang-memorial
cd /root
exec /usr/bin/env -i HOME=/var/lib/somangapp PATH=/usr/bin:/bin \
  PM2_HOME=/root/.pm2 NODE_ENV=production PORT=3050 \
  UPLOAD_DIR=/var/www/somang-memorial/uploads \
  /usr/bin/node /usr/lib/node_modules/pm2/bin/pm2 \
  restart somang-memorial --uid "$runtime_uid" --gid "$runtime_gid" \
  --update-env --silent
