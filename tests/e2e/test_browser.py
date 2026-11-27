"""End-to-end tests in a real browser (Playwright + Chromium).

They start the app on a free port with a temporary data folder, and block every
request that does not go to the app, to prove the app works offline.

Run:  python -m playwright install chromium   (once)
      python -m pytest tests/e2e
"""

from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest

playwright = pytest.importorskip("playwright.sync_api")
ROOT = Path(__file__).resolve().parents[2]


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def server(tmp_path_factory):
    data_dir = tmp_path_factory.mktemp("data")
    port = _free_port()
    env = {**os.environ, "FDE_DATA_DIR": str(data_dir), "ANTHROPIC_API_KEY": ""}
    # Log to a file, not a pipe: nobody reads a pipe while the tests run, and once its
    # buffer fills (quickly on Windows) uvicorn blocks on its next access-log line.
    log_path = data_dir / "server.log"
    log = log_path.open("wb")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server.app:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=ROOT,
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    url = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            urllib.request.urlopen(f"{url}/api/health", timeout=1)
            break
        except OSError:
            time.sleep(0.1)
    else:
        proc.kill()
        log.close()
        pytest.fail("server did not start: " + log_path.read_text(errors="replace"))
    yield {"url": url, "data": data_dir}
    proc.terminate()
    proc.wait(timeout=10)
    log.close()


@pytest.fixture(scope="module")
def browser():
    with playwright.sync_playwright() as p:
        chrome = shutil.which("google-chrome") or shutil.which("chromium")
        try:
            b = p.chromium.launch(args=["--no-sandbox"])
        except Exception:
            if not chrome:
                pytest.skip("No Chromium: run `python -m playwright install chromium`")
            b = p.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
        yield b
        b.close()


@pytest.fixture
def page(browser, server):
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    context.set_default_timeout(60000)  # Pyodide can take a while to start on a busy CI machine
    blocked: list[str] = []

    def guard(route):
        if route.request.url.startswith(server["url"]):
            return route.continue_()
        blocked.append(route.request.url)
        return route.abort()

    context.route("**/*", guard)
    pg = context.new_page()
    errors: list[str] = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(server["url"] + "/#/")
    pg.wait_for_selector(".track-card")
    yield pg
    assert not errors, f"JavaScript errors: {errors}"
    assert not blocked, f"The app tried to load from the internet: {blocked}"
    context.close()


def test_dashboard_tiles_and_track_list(page):
    page.locator(".track-head", has_text="1. Python from zero").click()
    lessons = page.locator(".track-card").filter(has_text="1. Python from zero").locator(".lesson-list li")
    assert lessons.count() >= 15
    lessons.filter(has_text="Strings").locator("a").click()
    page.wait_for_selector("article h1")
    assert page.locator("article h1").inner_text() == "Strings"


def test_python_exercise_passes_and_is_saved(page, server):
    page.goto(server["url"] + "/#/lesson/01-python-from-zero/04-loops")
    card = page.locator(".block-card").filter(has_text="Sum of even numbers")
    card.wait_for()
    page.evaluate("""() => {
      const card = [...document.querySelectorAll('.block-card')].find(c => c.textContent.includes('Sum of even numbers'));
      card.querySelector('.CodeMirror').CodeMirror.setValue('def sum_even(nums):\\n    return sum(n for n in nums if n % 2 == 0)\\n');
    }""")
    card.get_by_role("button", name="Check").click()
    card.locator(".pass-banner.ok").wait_for(timeout=60000)
    progress = json.loads((server["data"] / "progress.json").read_text())
    assert progress["exercises"]["01-python-from-zero/04-loops#ex-sum-of-even-numbers"]["passed"] is True
    assert "01-python-from-zero/04-loops#ex-sum-of-even-numbers" in progress["srs"]  # scheduled for review


def test_infinite_loop_is_stopped(page, server):
    page.goto(server["url"] + "/#/playground")
    page.wait_for_selector(".CodeMirror")
    page.evaluate("document.querySelector('.CodeMirror').CodeMirror.setValue('while True:\\n    pass\\n')")
    page.get_by_role("button", name="Run (Ctrl+Enter)").click()
    page.locator(".output", has_text="Time limit").wait_for(timeout=60000)


def test_sql_and_js_exercises(page, server):
    page.goto(server["url"] + "/#/lesson/08-sql-for-data/01-select-and-filter")
    card = page.locator(".block-card").filter(has_text="Missing end time")
    card.wait_for()
    page.evaluate("""() => {
      const card = [...document.querySelectorAll('.block-card')].find(c => c.textContent.includes('Missing end time'));
      card.querySelector('.CodeMirror').CodeMirror.setValue('SELECT id FROM jobs WHERE ended IS NULL;');
    }""")
    card.get_by_role("button", name="Check").click()
    card.locator(".pass-banner.ok").wait_for(timeout=30000)

    page.goto(server["url"] + "/#/lesson/09-javascript-basics/01-javascript-for-python-people")
    card = page.locator(".block-card").filter(has_text="Safe nested read")
    card.wait_for()
    page.evaluate("""() => {
      const card = [...document.querySelectorAll('.block-card')].find(c => c.textContent.includes('Safe nested read'));
      card.querySelector('.CodeMirror').CodeMirror.setValue('function cityOf(user) { return user?.address?.city ?? "unknown"; }');
    }""")
    card.get_by_role("button", name="Check").click()
    card.locator(".pass-banner.ok").wait_for(timeout=30000)


def test_async_python_example_runs(page, server):
    page.goto(server["url"] + "/#/lesson/01-python-from-zero/14-async-python")
    first = page.locator(".try-card").first
    first.wait_for()
    first.get_by_role("button", name="Run").first.click()
    first.locator(".output", has_text="job-1 done").wait_for(timeout=60000)


def test_progress_restored_from_local_storage(page, server):
    page.goto(server["url"] + "/#/lesson/01-python-from-zero/02-strings")
    page.get_by_role("button", name="Mark lesson complete").click()
    page.wait_for_timeout(500)
    (server["data"] / "progress.json").unlink()
    page.reload()
    page.wait_for_selector("article h1")
    progress = json.loads((server["data"] / "progress.json").read_text())
    assert "01-python-from-zero/02-strings" in progress["lessons"]


def test_drill_due_and_settings_pages(page, server):
    page.goto(server["url"] + "/#/drill")
    page.wait_for_selector(".block-card")
    page.goto(server["url"] + "/#/settings")
    page.get_by_role("button", name="Export all my data").wait_for()
    page.goto(server["url"] + "/#/review")
    page.wait_for_selector("h1")
    page.goto(server["url"] + "/#/mock")
    page.get_by_text("Your past mocks").wait_for()
    page.get_by_role("button", name="Ask tutor").click()
    assert page.locator("#tutor").is_visible()
    page.locator("#tutorLog", has_text="Tutor not set up").wait_for()  # no API key in tests


def test_mobile_menu(browser, server):
    context = browser.new_context(viewport={"width": 390, "height": 800})
    pg = context.new_page()
    pg.goto(server["url"] + "/#/")
    pg.wait_for_selector(".track-card")
    assert not pg.locator("#sidebar").is_visible()
    pg.locator("#menuToggle").click()
    assert pg.locator("#sidebar").is_visible()
    context.close()


def test_checklist_and_flashcards_save(page, server):
    page.goto(server["url"] + "/#/lesson/12-portfolio-projects/01-choosing-your-projects")
    checklist = page.locator(".block-card").filter(has_text="Before you start each project")
    checklist.locator("input[type=checkbox]").first.check()
    checklist.locator(".state", has_text="1 / 5").wait_for()
    page.goto(server["url"] + "/#/lesson/10-decomposition/01-the-decomposition-method")
    card = page.locator(".flashcard").first
    card.get_by_role("button", name="Show answer").click()
    card.get_by_role("button", name="Good").click()
    card.get_by_text("Scheduled for review.").wait_for()
    progress = json.loads((server["data"] / "progress.json").read_text())
    assert progress["checklists"] == {"12-portfolio-projects/01-choosing-your-projects#cl-before-you-start-each-project/0": True}
    assert "card:10-decomposition/01-the-decomposition-method#cards-decomposition-basics/0" in progress["srs"]


def test_placement_plan_and_job_tracker(page, server):
    page.goto(server["url"] + "/#/placement")
    page.get_by_role("button", name="See my result").click()
    page.get_by_text("Start with:").wait_for()
    page.goto(server["url"] + "/#/")
    page.get_by_role("button", name="Save plan").click()
    page.get_by_text("STUDY PLAN ·").wait_for()  # the saved-plan card ("Your study plan" also matches "STUDY PLAN")
    page.get_by_text("Skill map").wait_for()
    page.goto(server["url"] + "/#/jobs")
    page.get_by_role("button", name="Add application").click()
    page.get_by_label("Company").fill("Acme")
    page.get_by_label("Company").press("Tab")
    page.get_by_text("Saved.").wait_for()
    progress = json.loads((server["data"] / "progress.json").read_text())
    assert progress["applications"][0]["company"] == "Acme"
    assert progress["plan"]["hours_per_week"] == 10
    assert progress["placement"]["start_track"]
    page.goto(server["url"] + "/#/loop")
    page.get_by_text("Full loop day").first.wait_for()


def test_pandas_exercise_runs_offline(page, server):
    page.goto(server["url"] + "/#/lesson/01-python-from-zero/17-pandas")
    card = page.locator(".block-card").filter(has_text="Usage per department")
    card.wait_for()
    page.evaluate("""() => {
      const card = [...document.querySelectorAll('.block-card')].find(c => c.textContent.includes('Usage per department'));
      const cm = card.querySelector('.CodeMirror').CodeMirror;
      cm.setValue(card.querySelector('.CodeMirror') && `import pandas as pd

def by_department(jobs, users):
    merged = jobs.merge(users, on="user", how="left")
    merged["department"] = merged["department"].fillna("unknown")
    totals = merged.groupby("department")["gpu_hours"].sum().round(1)
    return {d: float(h) for d, h in totals.items()}
`);
    }""")
    card.get_by_role("button", name="Check").click()
    card.locator(".pass-banner.ok").wait_for(timeout=180000)
