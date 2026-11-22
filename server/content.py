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

BLOCK_RE = re.compile(r"^:::(exercise|quiz|written)[ \t]*(.*?)\n(.*?)^:::[ \t]*$", re.S | re.M)
SECTION_RE = re.compile(r"^--- *(starter|tests|solution|rubric) *---[ \t]*$", re.M)
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
    for folder in sorted(p for p in root.iterdir() if p.is_dir() and NAME_RE.match(p.name)):
        track_md = folder / "_track.md"
        track_text = track_md.read_text(encoding="utf-8") if track_md.exists() else ""
        title = _title_from_markdown(track_text, folder.name)
        description = "\n".join(
            line for line in track_text.splitlines() if not line.startswith("# ")
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
    for name, content in zip(parts[1::2], parts[2::2]):
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


def parse_lesson(text: str, lesson_id: str) -> dict:
    """Turn lesson Markdown into {markdown, blocks}."""
    blocks: list[dict] = []

    def replace(match: re.Match) -> str:
        kind, title, body = match.group(1), match.group(2).strip(), match.group(3)
        index = len(blocks)
        block_id = f"{lesson_id}#{kind}-{index}"
        if kind == "quiz":
            blocks.append({"id": block_id, "kind": "quiz", "questions": _parse_quiz(body)})
        else:
            sections = _split_sections(body)
            block = {"id": block_id, "kind": kind, "title": title or kind.title(), **sections}
            blocks.append(block)
        return f'\n<div class="block" data-block="{index}"></div>\n'

    markdown = BLOCK_RE.sub(replace, text)
    return {"markdown": markdown, "blocks": blocks}


class Content:
    """In-memory index of the curriculum. Reload it when files change."""

    def __init__(self, root: Path):
        self.root = root
        self.reload()

    def reload(self) -> None:
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
        text = lesson.path.read_text(encoding="utf-8")
        parsed = parse_lesson(text, lesson_id)
        return {**lesson.summary(), "track_id": lesson.track_id, **parsed, "raw": text}

    def all_exercises(self) -> list[dict]:
        """Every exercise block in the curriculum (used by the content checks)."""
        result = []
        for lesson_id in self.lessons:
            data = self.lesson(lesson_id)
            for block in data["blocks"]:
                if block["kind"] == "exercise":
                    result.append({"lesson": lesson_id, **block})
        return result
