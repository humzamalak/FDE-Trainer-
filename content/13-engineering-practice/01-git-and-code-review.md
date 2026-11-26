# Git collaboration and code review
<!-- minutes: 45 -->

At a customer you work in their repository, with their rules. You must be easy to work with: small, clear changes that are easy to review.

## The daily flow

```bash
git switch main && git pull          # start from the latest main
git switch -c fix/ticket-142-date-parsing
# ... edit, test ...
git add -p                            # stage piece by piece: review your own change
git commit                            # a good message (below)
git push -u origin fix/ticket-142-date-parsing
# open a pull request (PR); CI runs; a reviewer approves; merge
```

Keep your branch up to date: `git fetch` then `git rebase origin/main` (a clean, linear history; only on **your own** branch) or `git merge origin/main` (safe on shared branches). Never force-push a shared branch; on your own branch use `git push --force-with-lease`, which refuses if someone else pushed.

## Merge conflicts

Git shows both versions:

```text
<<<<<<< HEAD
timeout = 30
=======
timeout = 60
>>>>>>> fix/slow-api
```

Decide what the code should be (often a mix), delete the markers, run the tests, then `git add` and continue. If you do not know which is right, **ask the author** of the other change (`git log -p` shows who).

## Good commit messages

```text
Parse UK dates in the payments import

The finance export uses DD/MM/YYYY, but we parsed it as ISO, so
rows after the 12th of the month were rejected. Use an explicit
format and add tests for both formats.

Fixes #142
```

- Subject: what the commit does, in the imperative ("Parse…", not "Parsed…"), up to about 72 characters, no full stop.
- A blank line, then **why**: the diff already shows what changed.

## Pull requests that get approved fast

- **Small**: under about 300 changed lines. Split refactoring from behaviour changes.
- A description: what, why, how you tested, screenshots for UI, risks.
- Tests and green CI before you ask for review.

## Reviewing other people's code

- Review for **correctness, security, clarity and tests** first; style last (let a formatter do style).
- Ask questions instead of giving orders: "What happens if `rows` is empty here?"
- Mark the level: **blocking** ("this leaks tokens in logs") vs **nit** ("nit: maybe `user_count`").
- Say what is good, too. Reply within a working day.

## Being reviewed

Do not defend; understand. "Good catch, fixed in abc123" or "I chose X because Y; happy to change if you still prefer Z." If a discussion goes past three comments, talk.

:::exercise Check a commit message
Write `problems(message)` that returns a list of rule names the message breaks, in this order: `"empty"` (no text at all; return only this), `"subject too long"` (first line over 72 characters), `"subject ends with a full stop"`, `"no blank line after subject"` (there is a second line and it is not empty), `"past tense"` (the first word of the subject ends in `"ed"`).
--- starter ---
def problems(message):
    return []
--- tests ---
assert problems("Parse UK dates in the payments import\n\nWhy...") == []
assert problems("") == ["empty"]
assert problems("Fixed the bug.") == ["subject ends with a full stop", "past tense"]
assert problems("Add retries\nbecause the API is flaky") == ["no blank line after subject"]
assert problems("A" * 80) == ["subject too long"]
assert problems("Add caching") == []
--- solution ---
def problems(message):
    if not message.strip():
        return ["empty"]
    lines = message.split("\n")
    subject = lines[0]
    found = []
    if len(subject) > 72:
        found.append("subject too long")
    if subject.rstrip().endswith("."):
        found.append("subject ends with a full stop")
    if len(lines) > 1 and lines[1].strip():
        found.append("no blank line after subject")
    first = subject.split()[0].lower() if subject.split() else ""
    if first.endswith("ed"):
        found.append("past tense")
    return found
:::

:::written Review this pull request
A teammate's PR adds this function to the customer's API. Write your review comments (mark each as blocking or nit).

```python
def get_user_report(request):
    user = request.args["user"]
    rows = db.execute(f"SELECT * FROM reports WHERE owner = '{user}'")
    print("token", request.headers.get("Authorization"))
    data = []
    for r in rows:
        data.append(r)
    return {"reports": data}
```
--- rubric ---
- Blocking: SQL injection from the f-string; use a parameterised query
- Blocking: the user is taken from a query parameter, not from the authenticated identity, so anyone can read anyone's reports (authorisation)
- Blocking: the Authorization header (a secret) is printed to logs
- Should: `SELECT *` and no pagination or limit; a missing user parameter raises an unhandled KeyError
- Nit: the loop can be `list(rows)`; naming; tests missing
- Tone is respectful, with questions or suggestions rather than orders
:::

:::quiz
Q: You rebased your feature branch and now need to update the PR. Which push is the safe one?
- [ ] git push --force
- [x] git push --force-with-lease
> --force-with-lease refuses if someone else pushed to the branch since you last fetched.
Q: What belongs in the body of a commit message?
- [x] Why the change was needed and anything non-obvious about it
- [ ] A copy of the diff
Q: A PR has 2,000 changed lines mixing a refactor and a new feature. What do you ask for?
- [x] Split it: the refactor first (no behaviour change), then the feature
- [ ] Approve it to save time
:::

:::cards Git and review
Rebase vs merge :: Rebase rewrites your own branch onto main (linear history); merge is safe on shared branches.
--force-with-lease :: A force push that refuses if someone else has pushed.
Commit subject :: Imperative, about 72 characters max, no full stop. The body says why.
Good PR size :: Under about 300 changed lines, one purpose.
Review priorities :: Correctness, security, clarity, tests — style last.
:::
