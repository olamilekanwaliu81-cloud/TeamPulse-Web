#!/bin/bash
# Rebuilds the Mac and Windows downloads and the landing page that offers them.
#
#   bash scripts/build_desktop.sh
#   TP_URL=https://your-site.example bash scripts/build_desktop.sh      (point the apps at another address)
#
# The zips are written to public/downloads and served by the website at /downloads/.
# After running it, commit and push this folder so the live site offers the new files.
set -euo pipefail
cd "$(dirname "$0")/.."   # the web folder

bash desktop/macos/build_mac.sh
python3 desktop/windows/build_windows.py
python3 scripts/make_landing.py

echo
echo "Downloads for the website:"
ls -lh public/downloads
