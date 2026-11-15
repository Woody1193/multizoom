#!/bin/sh
# Build a signed flat apt repository in directory $2 holding package $1.
# APT_SIGNING_KEY is the ASCII-armoured private key that signs it. Only the
# latest release is kept; apt only ever needs the newest version.
set -eu

deb=$1
site=$2

GNUPGHOME=$(mktemp -d)
export GNUPGHOME
trap 'rm -rf "$GNUPGHOME"' EXIT
printf '%s\n' "$APT_SIGNING_KEY" | gpg --batch --quiet --import

mkdir -p "$site"
cp "$deb" "$site/"
cd "$site"

apt-ftparchive packages . > Packages
gzip -9kf Packages
apt-ftparchive -o APT::FTPArchive::Release::Origin=MultiZoom \
    -o APT::FTPArchive::Release::Label=MultiZoom release . > Release
gpg --batch --yes --clearsign -o InRelease Release
gpg --batch --yes --armor --detach-sign -o Release.gpg Release

# The public key, binary for apt's signed-by, armoured for reading.
gpg --export > multizoom.gpg
gpg --armor --export > multizoom.asc
