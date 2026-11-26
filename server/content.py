"""Load the training content from the content/ folder.

Folder layout:
    content/
        01-python-from-zero/          <- a track (number + slug)
            _track.md                 <- first "# " line is the track title, rest is the description
            01-values-and-variables.md  <- a lesson

A lesson is Markdown. It can contain interactive blocks:

    :::exercise Title of the exercise
    Markdown that explains the task.
    --- starter ---
    def total(nums):
        pass
    --- tests ---
    assert total([1, 2]) == 3
    --- solution ---
    def total(nums):
        return sum(nums)
    :::

    :::quiz
    Q: What does len([1, 2, 3]) return?
    - [ ] 2
    - [x] 3
    > len counts the items in the list.
    :::

    :::written Title of the written task
    Markdown prompt for a free-text answer (the AI tutor grades it).
    --- rubric ---
    What a good answer must contain.
    :::

The parser replaces each block with a placeholder <div data-block="N"></div>
and returns the block data as JSON, so the browser can render widgets.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

BLOCK_RE = re.compile(r"^:::(exercise|quiz|written|sql|js)[ \t]*(.*?)\n(.*?)^:::[ \t]*$", re.S | re.M)
EXPLICIT_ID_RE = re.compile(r"\s*\{#([a-z0-9][a-z0-9-]*)\}\s*$")
LEGACY_ID_RE = re.compile(r"#(exercise|quiz|written)-\d+$")
ID_PREFIX = {"exercise": "ex", "written": "wr", "quiz": "q", "sql": "sql", "js": "js"}
SECTION_RE = re.compile(r"^--- *(starter|tests|solution|rubric|schema|expected) *---[ \t]*$", re.M)
NAME_RE = re.compile(r"^(\d+)-(.+)$")


@dataclass
class Lesson:
    id: str
    track_id: str
    title: str
    path: Path
    minutes: int = 20

    def summary(self) -> dict:
        return {"id": self.id, "title": self.title, "minutes": self.minutes}


@dataclass
class Track:
    id: str
    title: str
    description: str
    lessons: list[Lesson] = field(default_factory=list)


def _title_from_markdown(text: str, fallback: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def _minutes_from_markdown(text: str) -> int:
    match = re.search(r"<!--\s*minutes:\s*(\d+)\s*-->", text)
    return int(match.group(1)) if match else 20


def load_curriculum(root: Path) -> list[Track]:
    """Read every track folder and lesson file, sorted by their number prefix."""
    tracks: list[Track] = []

    def order(folder: Path) -> tuple[float, str]:
        # A track can set its place with <!-- order: 3.5 --> in _track.md (new tracks can sit
        # between old ones without renaming folders, which would change saved progress IDs).
        track_md = folder / "_track.md"
        text = track_md.read_text(encoding="utf-8") if track_md.exists() else ""
        match = re.search(r"<!--\s*order:\s*([\d.]+)\s*-->", text)
        number = NAME_RE.match(folder.name).group(1)  # type: ignore[union-attr]
        return (float(match.group(1)) if match else float(number), folder.name)

    for folder in sorted((p for p in root.iterdir() if p.is_dir() and NAME_RE.match(p.name)), key=order):
        track_md = folder / "_track.md"
        track_text = track_md.read_text(encoding="utf-8") if track_md.exists() else ""
        title = _title_from_markdown(track_text, folder.name)
        description = "\n".join(
            line for line in track_text.splitlines() if not line.startswith("# ") and not line.startswith("<!--")
        ).strip()
        track = Track(id=folder.name, title=title, description=description)
        for file in sorted(folder.glob("*.md")):
            if file.name.startswith("_") or not NAME_RE.match(file.stem):
                continue
            text = file.read_text(encoding="utf-8")
            track.lessons.append(
                Lesson(
                    id=f"{folder.name}/{file.stem}",
                    track_id=folder.name,
                    title=_title_from_markdown(text, file.stem),
                    path=file,
                    minutes=_minutes_from_markdown(text),
                )
            )
        tracks.append(track)
    return tracks


def _split_sections(body: str) -> dict[str, str]:
    """Split an exercise/written block into 'prompt' plus its named sections."""
    parts = SECTION_RE.split(body)
    sections = {"prompt": parts[0].strip()}
    for name, content in zip(parts[1::2], parts[2::2], strict=True):
        sections[name] = content.strip("\n")
    return sections


def _parse_quiz(body: str) -> list[dict]:
    questions: list[dict] = []
    current: dict | None = None
    for raw in body.splitlines():
        line = raw.strip()
        if line.startswith("Q:"):
            current = {"question": line[2:].strip(), "options": [], "answer": None, "explanation": ""}
            questions.append(current)
        elif current is not None and re.match(r"^- \[( |x)\] ", line):
            if line[3] == "x":
                current["answer"] = len(current["options"])
            current["options"].append(line[6:].strip())
        elif current is not None and line.startswith(">"):
            current["explanation"] = (current["explanation"] + " " + line[1:].strip()).strip()
    return questions


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:60] or "block"


def parse_lesson(text: str, lesson_id: str) -> dict:
    """Turn lesson Markdown into {markdown, blocks}.

    Block IDs are stable: they come from the title (exercise, written, sql, js) or from the
    quiz's position among the lesson's quizzes, never from the position among all blocks.
    An explicit ID can be given at the end of the title line: `:::exercise Title {#my-id}`.
    Each block also gets `legacy_id` (the old position-based ID) so saved progress can be migrated.
    """
    blocks: list[dict] = []
    quiz_count = 0

    def replace(match: re.Match) -> str:
        nonlocal quiz_count
        kind, title, body = match.group(1), match.group(2).strip(), match.group(3)
        index = len(blocks)
        explicit = EXPLICIT_ID_RE.search(title)
        if explicit:
            title = title[: explicit.start()].strip()
        if explicit:
            suffix = explicit.group(1)
        elif kind == "quiz":
            quiz_count += 1
            suffix = str(quiz_count)
        else:
            suffix = slugify(title or kind)
        block_id = f"{lesson_id}#{ID_PREFIX[kind]}-{suffix}"
        legacy = f"{lesson_id}#{kind}-{index}" if kind in ("exercise", "quiz", "written") else None
        if kind == "quiz":
            blocks.append({"id": block_id, "legacy_id": legacy, "kind": "quiz", "questions": _parse_quiz(body)})
        else:
            sections = _split_sections(body)
            blocks.append({"id": block_id, "legacy_id": legacy, "kind": kind, "title": title or kind.title(), **sections})
        return f'\n<div class="block" data-block="{index}"></div>\n'

    markdown = BLOCK_RE.sub(replace, text)
    return {"markdown": markdown, "blocks": blocks}


class Content:
    """In-memory index of the curriculum.

    Parsed lessons are cached. A file is read again only when its modification time changes,
    and the track list is rebuilt only when a Markdown file is added, removed or changed.
    """

    def __init__(self, root: Path):
        self.root = root
        self._signature: tuple = ()
        self._parsed: dict[str, tuple[float, dict]] = {}
        self.tracks: list[Track] = []
        self.lessons: dict[str, Lesson] = {}
        self.reload()

    def _current_signature(self) -> tuple:
        return tuple(sorted((str(p), p.stat().st_mtime) for p in self.root.glob("*/*.md")))

    def reload(self) -> None:
        signature = self._current_signature()
        if signature == self._signature:
            return
        self._signature = signature
        self.tracks = load_curriculum(self.root)
        self.lessons = {lesson.id: lesson for t in self.tracks for lesson in t.lessons}

    def curriculum(self) -> list[dict]:
        return [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "lessons": [lesson.summary() for lesson in t.lessons],
            }
            for t in self.tracks
        ]

    def lesson(self, lesson_id: str) -> dict | None:
        lesson = self.lessons.get(lesson_id)  # only ids from the index: no path traversal
        if lesson is None:
            return None
        mtime = lesson.path.stat().st_mtime
        cached = self._parsed.get(lesson_id)
        if cached and cached[0] == mtime:
            return cached[1]
        text = lesson.path.read_text(encoding="utf-8")
        data = {**lesson.summary(), "track_id": lesson.track_id, **parse_lesson(text, lesson_id), "raw": text}
        self._parsed[lesson_id] = (mtime, data)
        return data

    def lesson_data(self, lesson_id: str) -> dict:
        """Like lesson(), for IDs known to exist (raises KeyError otherwise)."""
        data = self.lesson(lesson_id)
        if data is None:
            raise KeyError(lesson_id)
        return data

    def block(self, block_id: str) -> dict | None:
        lesson_id = block_id.split("#", 1)[0]
        data = self.lesson(lesson_id)
        if data is None:
            return None
        return next((b for b in data["blocks"] if b["id"] == block_id), None)

    def all_blocks(self) -> list[dict]:
        return [{"lesson": lid, **b} for lid in self.lessons for b in self.lesson_data(lid)["blocks"]]

    def legacy_map(self) -> dict[str, str]:
        """Old position-based block ID -> stable ID."""
        return {b["legacy_id"]: b["id"] for b in self.all_blocks() if b.get("legacy_id")}

    def all_exercises(self, kind: str = "exercise") -> list[dict]:
        """Every block of one kind in the curriculum (used by the content checks)."""
        return [b for b in self.all_blocks() if b["kind"] == kind]
