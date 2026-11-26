# Incidents, status updates and expectations
<!-- minutes: 35 -->

You already run incidents in research computing. At a customer, the technical work is the same; the communication is the job.

## During an incident

- **One owner** for communication (often you), separate from the people fixing it.
- **A fixed update rhythm**, for example every 30 minutes, even when there is no news: "No change. Next update at 14:30."
- **Say impact in their words:** "Ward staff cannot search policies" not "the vector index is unavailable".
- **Write a timeline as you go.** It makes the postmortem easy and accurate.

## After an incident: the blameless postmortem

1. Summary and impact (who, how long, how many).
2. Timeline.
3. Root cause and **contributing factors** (why the safeguards did not catch it).
4. What went well.
5. Actions, each with an owner and a date.

Blameless means you look for system causes, not a person to blame. "The deploy script allowed a deploy without tests" is useful; "Sam made a mistake" is not.

## Weekly status updates

Send one every week, even when things go well. Use **RAG status** (red / amber / green) honestly: an amber that becomes red surprises nobody; a green that becomes red ends trust.

> **Status: Amber.** Integration with the HR system is 4 days late because API access was approved on Tuesday, not last Friday. **Impact:** go-live moves from 3 to 7 June unless we cut the leave-balance feature. **Decision needed by Friday:** keep the date with less scope, or keep the scope with the later date. **Done this week:** … **Next week:** …

:::exercise Status from the task list
Write `status(tasks, today)`. Each task is a dict with `name`, `due` (a `datetime.date`) and `done` (bool). Return `"green"` if no open task is late, `"amber"` if open tasks are late by at most 3 days, and `"red"` if any open task is more than 3 days late. Done tasks never count.
--- starter ---
from datetime import date

def status(tasks, today):
    return "green"
--- tests ---
from datetime import date
t = date(2026, 6, 10)
assert status([], t) == "green"
assert status([{"name": "a", "due": date(2026, 6, 12), "done": False}], t) == "green"
assert status([{"name": "a", "due": date(2026, 6, 8), "done": False}], t) == "amber"
assert status([{"name": "a", "due": date(2026, 6, 7), "done": False}], t) == "amber"
assert status([{"name": "a", "due": date(2026, 6, 6), "done": False}], t) == "red"
assert status([{"name": "a", "due": date(2026, 6, 1), "done": True}], t) == "green"
assert status([{"name": "a", "due": date(2026, 6, 9), "done": False}, {"name": "b", "due": date(2026, 5, 1), "done": False}], t) == "red"
--- solution ---
from datetime import date

def status(tasks, today):
    late = [(today - t["due"]).days for t in tasks if not t["done"] and t["due"] < today]
    if not late:
        return "green"
    return "red" if max(late) > 3 else "amber"
:::

:::quiz
Q: During an incident there is no news for 30 minutes. What do you send at the planned update time?
- [x] An update that says there is no change and when the next update is
- [ ] Nothing until there is news
> Silence makes people imagine the worst and start calling around.
Q: What makes a postmortem "blameless"?
- [ ] Nobody is told about it
- [x] It looks for gaps in systems and safeguards instead of a person to blame
- [ ] It has no action items
:::

:::written Write a weekly status update
Write a status update for a pilot where the model's accuracy is 82% against a target of 90%, the customer's data team is slow to give access to a second data source, and users like the interface. Use RAG status, impact, a decision needed, done, and next.
--- rubric ---
- An honest status (amber or red, not green) with the reason in one sentence
- Impact in business terms and a clear decision or help needed from the customer, with a date
- Facts about accuracy without excuses; a plan to close the gap (error analysis, the second data source)
- Short, scannable structure
:::
