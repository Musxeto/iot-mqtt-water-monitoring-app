#!/usr/bin/env bash
set -euo pipefail

# Simple helper to download Android command-line tools and install SDK packages
# Usage: ./scripts/install-android-sdk.sh

ANDROID_SDK_ROOT="$HOME/Android/Sdk"
CMDLINE_ZIP_URL="https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip"
BUILD_TOOLS_VERSION="33.0.2"
PLATFORM_VERSION="android-33"

mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"

echo "Downloading Android command-line tools..."
TMP_ZIP="/tmp/commandlinetools.zip"
if command -v curl >/dev/null 2>&1; then
  curl -L -o "$TMP_ZIP" "$CMDLINE_ZIP_URL"
else
  wget -O "$TMP_ZIP" "$CMDLINE_ZIP_URL"
fi

echo "Unpacking..."
unzip -o "$TMP_ZIP" -d "$ANDROID_SDK_ROOT/cmdline-tools"
mv -f "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest" || true

# Ensure environment vars
export ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools"

echo "Installing SDK components (platform-tools, $PLATFORM_VERSION, build-tools;$BUILD_TOOLS_VERSION)..."
sdkmanager --sdk_root="$ANDROID_SDK_ROOT" "platform-tools" "platforms;$PLATFORM_VERSION" "build-tools;$BUILD_TOOLS_VERSION" "cmdline-tools;latest"

echo "Accepting licenses..."
yes | sdkmanager --licenses

echo "Installed. Add the following to your ~/.zshrc or ~/.bashrc if not already present:"
echo "export ANDROID_SDK_ROOT=\$HOME/Android/Sdk"
echo "export ANDROID_HOME=\$ANDROID_SDK_ROOT"
echo "export PATH=\$PATH:\$ANDROID_SDK_ROOT/platform-tools:\$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"

echo "Done. You should be able to run sdkmanager, adb, zipalign and apksigner now."
