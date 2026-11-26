"""The bundled libraries must match their recorded hashes (see scripts/vendor_manifest.py)."""

import hashlib
from pathlib import Path

VENDOR = Path(__file__).resolve().parent.parent / "static" / "vendor"


def test_vendor_files_match_manifest():
    manifest = {}
    for line in (VENDOR / "MANIFEST.sha256").read_text(encoding="utf-8").splitlines():
        digest, name = line.split("  ", 1)
        manifest[name] = digest
    on_disk = {p.relative_to(VENDOR).as_posix() for p in VENDOR.rglob("*") if p.is_file() and p.name != "MANIFEST.sha256"}
    assert on_disk == set(manifest), f"files added or removed: {sorted(on_disk ^ set(manifest))}"
    changed = [name for name, digest in manifest.items() if hashlib.sha256((VENDOR / name).read_bytes()).hexdigest() != digest]
    assert not changed, f"bundled files changed: {changed}. If on purpose, run scripts/vendor_manifest.py"


def test_index_loads_nothing_from_the_internet():
    html = (VENDOR.parent / "index.html").read_text(encoding="utf-8")
    assert "http://" not in html and "https://" not in html
    for worker in ("pyworker.js", "sqlworker.js", "jsworker.js"):
        assert "https://" not in (VENDOR.parent / worker).read_text(encoding="utf-8")
