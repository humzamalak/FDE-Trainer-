"""The AI tutor. It sends your question plus the current lesson to the Claude API."""

from __future__ import annotations

from collections.abc import Iterator

from server import config, usage

STYLE = (
    "Write in ASD-STE100 Simplified Technical English: short sentences, active voice, "
    "one instruction per sentence, common words. Say only what is needed. "
    "Use Markdown. Use ```python code blocks for code. Use $...$ for inline maths and $$...$$ for display maths. "
    "Write money as \\$5 (with a backslash), so it is not read as maths."
)

DEFAULT_LEARNER = (
    "The learner is a cloud/DevOps engineer who wants to become a Forward Deployed Engineer. "
    "Their application coding is weak: treat them as a beginner programmer, but not a beginner in infrastructure. "
    "Use infrastructure analogies when they help."
)


def learner_profile() -> str:
    """Read learner_profile.md (private, git-ignored) if it exists."""
    if config.PROFILE_FILE.exists():
        text = config.PROFILE_FILE.read_text(encoding="utf-8").strip()
        if text:
            return "About the learner:\n" + text[:4000]
    return DEFAULT_LEARNER


MODES: dict[str, str] = {
    "tutor": (
        "You are a patient programming and interview tutor. "
        "When the learner is stuck on an exercise, give the smallest useful hint first. "
        "Do not give the full solution unless the learner asks for it directly. "
        "When you explain a concept, give one short example, then ask one check question. "
        "If the learner's understanding is wrong, say so clearly and explain why."
    ),
    "review": (
        "You are a strict but fair code reviewer and grader. "
        "If a rubric is given, grade the answer against each rubric point: met / partly met / not met. "
        "Give a score out of 10. Then list the 3 most important improvements, most important first. "
        "For code: check correctness, edge cases, naming, readability and time complexity."
    ),
    "coding-interviewer": (
        "You are a Forward Deployed Engineer interviewer running a 35-minute live coding round in Python. "
        "Give ONE problem at LeetCode Easy/Medium level, or a practical data-processing problem. "
        "Act like a real interviewer: answer clarifying questions, do not give the answer, "
        "give a small hint only if the candidate is stuck for a long time, ask about complexity and edge cases. "
        "When the candidate says they are done, or asks for feedback, give a hire / lean hire / lean no / no "
        "verdict with reasons for: problem solving, coding, communication, testing."
    ),
    "design-interviewer": (
        "You are a Forward Deployed Engineer interviewer running a 45-minute system design round. "
        "Give one realistic customer scenario, for example deploying an LLM system into a regulated customer. "
        "Let the candidate drive. Push on requirements, security, data, failure modes, cost and rollout. "
        "When asked for feedback, give a verdict and the top 3 gaps."
    ),
    "customer-case": (
        "You play a customer stakeholder in a Forward Deployed Engineer case interview. "
        "Choose a realistic company and role (for example: Head of Operations at an NHS trust). "
        "Describe a vague business problem in 3-4 sentences. Answer the candidate's questions in character, "
        "with realistic constraints (budget, legacy systems, compliance, politics). Reveal information only "
        "when asked. When the candidate types FEEDBACK, step out of character and grade: discovery questions, "
        "scoping, technical solution, communication, and handling of trade-offs."
    ),
    "behavioural": (
        "You are a hiring manager running a behavioural interview for a Forward Deployed Engineer. "
        "Ask one question at a time (ownership, conflict, failure, ambiguity, customer pressure). "
        "Follow up twice on each answer to test depth and individual ownership. "
        "When asked for feedback, grade each answer on STAR structure, specificity, ownership and result."
    ),
}


def build_system(mode: str, lesson: dict | None, context: str | None) -> list[dict]:
    """System prompt as blocks. The stable part (instructions + profile + lesson) is marked for
    prompt caching, so repeat questions on the same lesson cost much less. The context
    (current code or answer) changes each time, so it comes after the cache breakpoint."""
    stable = [MODES.get(mode, MODES["tutor"]), learner_profile(), STYLE]
    if lesson:
        stable.append(
            f"The learner is studying the lesson '{lesson['title']}'. Base your help on it. "
            f"Lesson content:\n<lesson>\n{lesson['raw'][:20000]}\n</lesson>"
        )
    blocks: list[dict] = [{"type": "text", "text": "\n\n".join(stable), "cache_control": {"type": "ephemeral"}}]
    if context:
        blocks.append(
            {
                "type": "text",
                "text": f"Extra context from the app (the learner's current code, exercise or answer):\n<context>\n{context[:20000]}\n</context>",
            }
        )
    return blocks


def clean_history(messages: list[dict], limit: int = config.MAX_HISTORY_MESSAGES) -> list[dict]:
    """Keep valid turns only, cap the length (cost), and make sure the list starts with a user turn."""
    clean = [
        {"role": m["role"], "content": str(m["content"])}
        for m in messages
        if m.get("role") in ("user", "assistant") and str(m.get("content", "")).strip()
    ]
    if len(clean) > limit:
        first = clean[0] if clean and clean[0]["role"] == "user" else None
        clean = clean[-limit:]
        while clean and clean[0]["role"] != "user":
            clean = clean[1:]
        if first is not None and clean and clean[0] is not first:
            clean = [first, {"role": "assistant", "content": "(Earlier messages were shortened to save cost.)"}] + clean
    if not clean or clean[0]["role"] != "user":
        clean.insert(0, {"role": "user", "content": "Start."})
    return clean


def stream_reply(mode: str, messages: list[dict], lesson: dict | None, context: str | None) -> Iterator[str]:
    """Yield the tutor's reply as text chunks."""
    if not config.api_key_present():
        yield (
            "**No API key found.**\n\n1. Copy `.env.example` to `.env`.\n"
            "2. Put your key after `ANTHROPIC_API_KEY=`. Get a key at https://console.anthropic.com/.\n"
            "3. Restart the app."
        )
        return
    over = usage.budget_message()
    if over:
        yield over
        return

    import anthropic  # imported here so the app still starts without the package configured

    client = anthropic.Anthropic()
    try:
        with client.messages.stream(
            model=config.model(),
            max_tokens=config.max_tokens(),
            system=build_system(mode, lesson, context),  # type: ignore[arg-type]
            messages=clean_history(messages),  # type: ignore[arg-type]
        ) as stream:
            yield from stream.text_stream
            usage.record(stream.get_final_message().usage, f"tutor:{mode}")
    except anthropic.AuthenticationError:
        yield "\n\n**The API key was rejected.** Check `ANTHROPIC_API_KEY` in your `.env` file."
    except anthropic.APIError as exc:  # network, rate limit, bad model name, ...
        yield f"\n\n**API error:** {exc}"
