#!/usr/bin/env bash
# Installs headless Blender 4.5 LTS into /opt/blender and links it as `blender`.
# Safe to rerun. Needed again in every fresh cloud session (the container is wiped).
set -euo pipefail
VER=4.5.15
DIR=/opt/blender
if [ -x /usr/local/bin/blender ] && blender --version 2>/dev/null | grep -q "$VER"; then
  echo "Blender $VER already installed"; exit 0
fi
apt-get update -qq
apt-get install -y -qq libegl1 libgl1 libxkbcommon0 libxi6 libxxf86vm1 libxfixes3 libxrender1 libsm6 libgomp1 libxext6 libx11-6 libglib2.0-0 libdecor-0-0
mkdir -p $DIR && cd $DIR
TAR=blender-$VER-linux-x64.tar.xz
curl -fsS -O https://download.blender.org/release/Blender4.5/$TAR
want=$(curl -fsS https://download.blender.org/release/Blender4.5/blender-$VER.sha256 | grep linux-x64 | cut -d' ' -f1)
have=$(sha256sum $TAR | cut -d' ' -f1)
[ "$want" = "$have" ] || { echo "checksum mismatch"; exit 1; }
tar xf $TAR && rm $TAR
ln -sfn $DIR/blender-$VER-linux-x64 $DIR/current
ln -sf $DIR/current/blender /usr/local/bin/blender
blender --version | head -1
