"""Write static/vendor/MANIFEST.sha256: the SHA-256 of every bundled library file.

tests/test_vendor.py checks the files against this list, so a corrupted or changed
library is noticed. Run this only after you upgrade a library on purpose:

    python scripts/vendor_manifest.py
"""

import hashlib
from pathlib import Path

VENDOR = Path(__file__).resolve().parent.parent / "static" / "vendor"
lines = []
for path in sorted(p for p in VENDOR.rglob("*") if p.is_file() and p.name != "MANIFEST.sha256"):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    lines.append(f"{digest}  {path.relative_to(VENDOR).as_posix()}")
(VENDOR / "MANIFEST.sha256").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Wrote {len(lines)} hashes to static/vendor/MANIFEST.sha256")
