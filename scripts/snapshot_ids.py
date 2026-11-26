"""Write tests/block_ids.txt: the list of every block ID in the content.

Saved progress is keyed by these IDs. tests/test_progress.py fails when an ID disappears,
so you notice before progress is lost. If you renamed a block on purpose, add an explicit
old ID to its title line (:::exercise New title {#old-id}) or accept the change and run:

    python scripts/snapshot_ids.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from server.content import Content  # noqa: E402

ids = sorted(b["id"] for b in Content(ROOT / "content").all_blocks())
(ROOT / "tests" / "block_ids.txt").write_text("\n".join(ids) + "\n", encoding="utf-8")
print(f"Wrote {len(ids)} block IDs to tests/block_ids.txt")
