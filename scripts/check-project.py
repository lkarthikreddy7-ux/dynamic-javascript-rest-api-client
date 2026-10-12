#!/usr/bin/env python3
"""Offline structural checks for the Marketly Task 5 project."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
required = [
    "index.html", "styles.css", "js/app.js", "js/api.js", "README.md"
]
missing = [item for item in required if not (ROOT / item).is_file()]
if missing:
    print("Missing required files:", ", ".join(missing))
    sys.exit(1)

for script in ("js/app.js", "js/api.js"):
    result = subprocess.run(
        ["node", "--check", str(ROOT / script)],
        capture_output=True, text=True
    )
    if result.returncode:
        print(result.stderr)
        sys.exit(result.returncode)
    print(f"PASS JavaScript syntax: {script}")

html = (ROOT / "index.html").read_text(encoding="utf-8")
for reference in ('href="styles.css"', 'src="js/app.js"'):
    if reference not in html:
        print(f"Missing HTML reference: {reference}")
        sys.exit(1)
for element_id in (
    "product-grid", "error-banner", "skeleton-grid", "cart-dialog",
    "cart-items", "product-dialog", "search-input", "category-filter",
    "sort-select", "theme-toggle"
):
    if f'id="{element_id}"' not in html:
        print(f"Missing required HTML element: {element_id}")
        sys.exit(1)

app = (ROOT / "js/app.js").read_text(encoding="utf-8")
if "alert(" in app:
    print("Unexpected browser alert remains in app.js")
    sys.exit(1)
print("PASS required files and HTML references")
print("PASS cart uses a custom dialog, not a browser alert")
print("Structural checks passed. Run the app in a browser for live interaction testing.")
