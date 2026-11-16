#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REBUILD_FRONTEND=0
RUN_TESTS=0
CLEAN_CACHE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --rebuild-frontend)
      REBUILD_FRONTEND=1
      ;;
    --test)
      RUN_TESTS=1
      ;;
    --clean)
      CLEAN_CACHE=1
      ;;
    -h|--help)
      cat <<'EOF'
Usage: bash scripts/build-linux.sh [OPTIONS]

Build Quick Pill Linux release bundles (.AppImage, .deb, .rpm), generate SHA-256
checksums, update web app/public/version.json, and sync artifacts back into
release-artifacts/.

Options:
  --rebuild-frontend  Force Vite frontend rebuild inside Linux cache directory
  --test              Run cargo unit tests before bundling
  --clean             Remove cached Linux build directory before staging sources
  -h, --help          Show this help message
EOF
      exit 0
      ;;
    *)
      echo "[build-linux] ERROR: Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

# Scrub inherited npm_* variables so launching via an older host npm (e.g. Snap Node 10)
# never leaks npm_execpath / npm_node_execpath into Node 20 npm/npx calls.
for var_name in $(env | awk -F= '/^npm_/ {print $1}'); do
  unset "$var_name"
done

echo "[build-linux] Workspace root: $ROOT_DIR"

# 1. Check / install Linux system build & bundle dependencies (skip apt if already present)
if command -v dpkg >/dev/null 2>&1 && command -v apt-get >/dev/null 2>&1; then
  REQUIRED_APT_PKGS=(
    build-essential
    curl
    wget
    file
    libxdo-dev
    libssl-dev
    libayatana-appindicator3-dev
    librsvg2-dev
    patchelf
    rpm
    pulseaudio-utils
    xdg-utils
    xz-utils
  )

  MISSING_APT_PKGS=()
  for pkg in "${REQUIRED_APT_PKGS[@]}"; do
    if ! dpkg -s "$pkg" >/dev/null 2>&1; then
      MISSING_APT_PKGS+=("$pkg")
    fi
  done

  if ! dpkg -s libwebkit2gtk-4.1-dev >/dev/null 2>&1 && ! dpkg -s libwebkit2gtk-4.0-dev >/dev/null 2>&1; then
    MISSING_APT_PKGS+=(libwebkit2gtk-4.1-dev)
  fi

  if [ "${#MISSING_APT_PKGS[@]}" -gt 0 ]; then
    echo "[build-linux] Installing missing apt dependencies: ${MISSING_APT_PKGS[*]}"
    sudo apt-get update
    if ! sudo apt-get install -y "${MISSING_APT_PKGS[@]}"; then
      FALLBACK_APT_PKGS=()
      for pkg in "${MISSING_APT_PKGS[@]}"; do
        if [ "$pkg" = "libwebkit2gtk-4.1-dev" ] && ! apt-cache show libwebkit2gtk-4.1-dev >/dev/null 2>&1; then
          FALLBACK_APT_PKGS+=(libwebkit2gtk-4.0-dev)
        else
          FALLBACK_APT_PKGS+=("$pkg")
        fi
      done
      sudo apt-get install -y "${FALLBACK_APT_PKGS[@]}"
    fi
  else
    echo "[build-linux] All required apt dependencies are already installed."
  fi
elif command -v dnf >/dev/null 2>&1; then
  echo "[build-linux] Ensuring Fedora/RHEL build dependencies via dnf..."
  sudo dnf install -y \
    webkit2gtk4.1-devel openssl-devel curl wget file \
    libappindicator-gtk3-devel librsvg2-devel libxdo-devel \
    rpm-build patchelf pulseaudio-utils xdg-utils xz
elif command -v pacman >/dev/null 2>&1; then
  echo "[build-linux] Ensuring Arch build dependencies via pacman..."
  sudo pacman -S --needed --noconfirm \
    webkit2gtk-4.1 base-devel curl wget file openssl \
    libappindicator-gtk3 librsvg xdotool patchelf rpm-tools libpulse xdg-utils xz
fi

# 2. Ensure Node.js >= 20 LTS (VM Snap ships Node v10.24.1 which fails lockfile v3)
NODE_LTS_VERSION="v20.18.3"
UNAME_ARCH="$(uname -m)"
case "$UNAME_ARCH" in
  x86_64|amd64)
    NODE_DIST_ARCH="linux-x64"
    ;;
  aarch64|arm64)
    NODE_DIST_ARCH="linux-arm64"
    ;;
  *)
    echo "[build-linux] ERROR: Unsupported architecture for Node auto-bootstrap: $UNAME_ARCH" >&2
    exit 1
    ;;
esac

CACHED_NODE_ROOT="$HOME/.cache/quick-pill-node/node-${NODE_LTS_VERSION}-${NODE_DIST_ARCH}"
if [ -x "$CACHED_NODE_ROOT/bin/node" ]; then
  export PATH="$CACHED_NODE_ROOT/bin:$PATH"
  hash -r
fi

NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
fi

if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  echo "[build-linux] System Node.js is missing or outdated (major: ${NODE_MAJOR:-0}); downloading Node ${NODE_LTS_VERSION} (${NODE_DIST_ARCH})..."
  NODE_CACHE_PARENT="$(dirname "$CACHED_NODE_ROOT")"
  mkdir -p "$NODE_CACHE_PARENT"
  NODE_TARBALL="$NODE_CACHE_PARENT/node-${NODE_LTS_VERSION}-${NODE_DIST_ARCH}.tar.xz"
  NODE_URL="https://nodejs.org/dist/${NODE_LTS_VERSION}/node-${NODE_LTS_VERSION}-${NODE_DIST_ARCH}.tar.xz"
  curl -fsSL "$NODE_URL" -o "$NODE_TARBALL"
  rm -rf "$CACHED_NODE_ROOT"
  tar -xJf "$NODE_TARBALL" -C "$NODE_CACHE_PARENT"
  rm -f "$NODE_TARBALL"
  export PATH="$CACHED_NODE_ROOT/bin:$PATH"
  hash -r
fi

echo "[build-linux] Node: $(node -v) ($(command -v node)), npm: $(npm -v)"

# 3. Ensure Rust / Cargo toolchain is available and a default toolchain is active
if [ -f "$HOME/.cargo/env" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.cargo/env"
fi
if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

if ! cargo --version >/dev/null 2>&1 || ! rustc --version >/dev/null 2>&1; then
  if command -v rustup >/dev/null 2>&1; then
    echo "[build-linux] Rustup present without an active default toolchain; configuring stable..."
    rustup toolchain install stable --profile minimal
    rustup default stable
  else
    echo "[build-linux] Rust/Cargo not found; installing stable via rustup (minimal profile)..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
    if [ -f "$HOME/.cargo/env" ]; then
      # shellcheck source=/dev/null
      source "$HOME/.cargo/env"
    elif [ -d "$HOME/.cargo/bin" ]; then
      export PATH="$HOME/.cargo/bin:$PATH"
    fi
  fi
  hash -r
fi

RUSTC_VER="$(rustc --version)"
CARGO_VER="$(cargo --version)"
echo "[build-linux] Rust: ${RUSTC_VER} | ${CARGO_VER}"

# 4. Stage source & build on native Linux ext4 ($HOME/.cache/quick-pill-linux-build)
# Building directly on /mnt/hgfs fails with ENAMETOOLONG (Windows 260-char path limit),
# symlink restrictions in linuxdeploy, and collides with Windows node_modules / target.
BUILD_DIR="$HOME/.cache/quick-pill-linux-build"
if [ "$CLEAN_CACHE" -eq 1 ] && [ -d "$BUILD_DIR" ]; then
  echo "[build-linux] Removing cached Linux build directory: $BUILD_DIR"
  rm -rf "$BUILD_DIR"
fi

echo "[build-linux] Staging project files into native Linux ext4 directory: $BUILD_DIR"
mkdir -p "$BUILD_DIR" "$BUILD_DIR/src-tauri" "$BUILD_DIR/web app/public" "$BUILD_DIR/release-artifacts"

for f in package.json package-lock.json index.html vite.config.mjs .npmrc LICENSE; do
  if [ -f "$ROOT_DIR/$f" ]; then
    cp "$ROOT_DIR/$f" "$BUILD_DIR/$f"
  else
    rm -f "$BUILD_DIR/$f"
  fi
done

for d in src scripts assets public dist; do
  rm -rf "$BUILD_DIR/$d"
  if [ -d "$ROOT_DIR/$d" ]; then
    cp -R "$ROOT_DIR/$d" "$BUILD_DIR/$d"
  fi
done

for f in Cargo.toml Cargo.lock build.rs tauri.conf.json; do
  if [ -f "$ROOT_DIR/src-tauri/$f" ]; then
    cp "$ROOT_DIR/src-tauri/$f" "$BUILD_DIR/src-tauri/$f"
  fi
done

# Preserve $BUILD_DIR/src-tauri/target across builds while refreshing all sources & assets
for d in src icons capabilities msix gen; do
  rm -rf "$BUILD_DIR/src-tauri/$d"
  if [ -d "$ROOT_DIR/src-tauri/$d" ]; then
    cp -R "$ROOT_DIR/src-tauri/$d" "$BUILD_DIR/src-tauri/$d"
  fi
done

if [ -f "$ROOT_DIR/web app/public/version.json" ]; then
  cp "$ROOT_DIR/web app/public/version.json" "$BUILD_DIR/web app/public/version.json"
fi

cd "$BUILD_DIR"
VERSION="$(node -p "require('./package.json').version")"
TAURI_CLI_SPEC="$(node -e "const p=require('./package.json'); console.log((p.devDependencies && p.devDependencies['@tauri-apps/cli']) || '^2.12.4')")"
echo "[build-linux] Target release version: v${VERSION}"

if [ "$REBUILD_FRONTEND" -eq 0 ] && [ -f "$BUILD_DIR/dist/index.html" ]; then
  echo "[build-linux] Prebuilt frontend dist/index.html detected; skipping redundant Vite rebuild."
  if [ ! -f "$BUILD_DIR/node_modules/@tauri-apps/cli/package.json" ]; then
    echo "[build-linux] Installing @tauri-apps/cli (${TAURI_CLI_SPEC}) inside $BUILD_DIR..."
    npm install --no-save --no-audit --no-fund "@tauri-apps/cli@${TAURI_CLI_SPEC}"
  fi
else
  echo "[build-linux] Installing frontend dependencies and building Vite bundle..."
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  npm run build:frontend
fi

if [ "$RUN_TESTS" -eq 1 ]; then
  echo "[build-linux] Running Rust unit tests..."
  cargo test --manifest-path "$BUILD_DIR/src-tauri/Cargo.toml"
fi

BUNDLE_DIR="$BUILD_DIR/src-tauri/target/release/bundle"
# Clear previous bundle outputs so find never picks up an older cached version
rm -rf "$BUNDLE_DIR/appimage" "$BUNDLE_DIR/deb" "$BUNDLE_DIR/rpm"

echo "[build-linux] Building Tauri v${VERSION} Linux release bundles (AppImage, DEB, RPM)..."
NO_STRIP=true APPIMAGE_EXTRACT_AND_RUN=1 npx --no-install tauri build \
  --bundles appimage,deb,rpm \
  --config '{"build":{"beforeBuildCommand":""}}'

# 5. Collect renamed bundles, generate SHA-256 + version.json, and sync back to shared workspace
ARTIFACTS_STAGE="$BUILD_DIR/release-artifacts"
rm -f "$ARTIFACTS_STAGE"/QuickPill-* "$ARTIFACTS_STAGE"/*.sha256 "$ARTIFACTS_STAGE/version.json"

find_bundle() {
  local dir="$1"
  local ext="$2"
  local exact
  exact="$(find "$dir" -maxdepth 2 -type f -iname "*${VERSION}*${ext}" 2>/dev/null | head -n 1 || true)"
  if [ -n "$exact" ]; then
    echo "$exact"
    return 0
  fi
  find "$dir" -maxdepth 2 -type f -iname "*${ext}" 2>/dev/null | head -n 1 || true
}

APPIMAGE_SRC="$(find_bundle "$BUNDLE_DIR/appimage" ".AppImage")"
DEB_SRC="$(find_bundle "$BUNDLE_DIR/deb" ".deb")"
RPM_SRC="$(find_bundle "$BUNDLE_DIR/rpm" ".rpm")"

MANIFEST_ARGS=()

if [ -n "$APPIMAGE_SRC" ]; then
  APPIMAGE_OUT="$ARTIFACTS_STAGE/QuickPill-Linux-v${VERSION}.AppImage"
  cp -f "$APPIMAGE_SRC" "$APPIMAGE_OUT"
  chmod +x "$APPIMAGE_OUT"
  (cd "$ARTIFACTS_STAGE" && sha256sum "$(basename "$APPIMAGE_OUT")" > "$(basename "$APPIMAGE_OUT").sha256")
  MANIFEST_ARGS+=(--linux-appimage "$APPIMAGE_OUT")
fi

if [ -n "$DEB_SRC" ]; then
  DEB_OUT="$ARTIFACTS_STAGE/QuickPill-Linux-v${VERSION}.deb"
  cp -f "$DEB_SRC" "$DEB_OUT"
  (cd "$ARTIFACTS_STAGE" && sha256sum "$(basename "$DEB_OUT")" > "$(basename "$DEB_OUT").sha256")
  MANIFEST_ARGS+=(--linux-deb "$DEB_OUT")
fi

if [ -n "$RPM_SRC" ]; then
  RPM_OUT="$ARTIFACTS_STAGE/QuickPill-Linux-v${VERSION}.rpm"
  cp -f "$RPM_SRC" "$RPM_OUT"
  (cd "$ARTIFACTS_STAGE" && sha256sum "$(basename "$RPM_OUT")" > "$(basename "$RPM_OUT").sha256")
  MANIFEST_ARGS+=(--linux-rpm "$RPM_OUT")
fi

if [ "${#MANIFEST_ARGS[@]}" -eq 0 ]; then
  echo "[build-linux] ERROR: No Linux bundle outputs (.AppImage/.deb/.rpm) were produced." >&2
  exit 1
fi

echo "[build-linux] Updating version.json manifest..."
node "$BUILD_DIR/scripts/generate-manifest.js" "${MANIFEST_ARGS[@]}"
cp -f "$BUILD_DIR/web app/public/version.json" "$ARTIFACTS_STAGE/version.json"

echo "[build-linux] Copying release artifacts and manifest back to $ROOT_DIR..."
mkdir -p "$ROOT_DIR/release-artifacts" "$ROOT_DIR/web app/public"
rm -f "$ROOT_DIR/release-artifacts"/QuickPill-Linux-v${VERSION}.*
cp -f "$ARTIFACTS_STAGE"/* "$ROOT_DIR/release-artifacts/"
chmod +x "$ROOT_DIR/release-artifacts/QuickPill-Linux-v${VERSION}.AppImage" 2>/dev/null || true
cp -f "$BUILD_DIR/web app/public/version.json" "$ROOT_DIR/web app/public/version.json"

echo ""
echo "[build-linux] Done! Quick Pill v${VERSION} Linux artifacts synced to $ROOT_DIR/release-artifacts:"
ls -lh "$ROOT_DIR/release-artifacts"/QuickPill-Linux-v${VERSION}.*
echo ""
echo "[build-linux] Quick test commands:"
echo "  Debian/Ubuntu install: sudo apt install \"$ROOT_DIR/release-artifacts/QuickPill-Linux-v${VERSION}.deb\""
echo "  AppImage run:          \"$ROOT_DIR/release-artifacts/QuickPill-Linux-v${VERSION}.AppImage\""
