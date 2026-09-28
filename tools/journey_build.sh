#!/bin/sh
# Build the three Product Journey pages (draft customer + DLG, internal review) and check the data first.
set -e
cd "$(dirname "$0")/.."
python3 tools/roadmap.py check
python3 tools/roadmap.py build --draft
python3 tools/roadmap.py build --draft --client=dlg
python3 tools/roadmap.py build --internal
