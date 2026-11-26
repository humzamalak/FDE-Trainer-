# Reading unfamiliar code
<!-- minutes: 40 -->

You do not read a codebase like a book, from top to bottom. You read it like a map: find where you are, find where you need to go, and follow one road.

## The method

1. **Run it first.** Follow the README. If it does not run, that is your first finding. Running code tells you more than reading it.
2. **Find the entry point.** `main.py`, `app.py`, `if __name__ == "__main__":`, the route handler for the URL in the bug report, or the CLI command.
3. **Read the tests.** Tests show how the authors expect the code to be used, with real inputs.
4. **Trace one request end to end.** Pick the exact action from the bug report and follow it function by function. Write the path down: `handler → validate → service.create → repo.save`.
5. **Search, do not scroll.** `grep -rn "def calculate_total"` or your editor's "Go to definition" and "Find references". Search for the error message text: it often leads straight to the line.
6. **Use history.** `git log -p path/to/file` and `git blame` tell you *why* a line exists and who to ask.
7. **Keep notes.** A short file with the path you traced, the names that matter, and questions to ask. It becomes the handover doc later.

## Read the traceback from the bottom

```text
Traceback (most recent call last):
  File "app.py", line 40, in handle
    total = invoice_total(lines)
  File "billing.py", line 12, in invoice_total
    return sum(l["price"] * l["qty"] for l in lines)
KeyError: 'qty'
```

The **last line** is what went wrong (`KeyError: 'qty'`). The line above it is **where**. The lines above that are **how you got there**. Here, one invoice line has no `qty` key: ask "which data produced this line?", not "how do I hide the error?".

## Questions to ask the customer

- "Can you show me the exact steps, input and output?"
- "When did it last work? What changed since then (deploy, data, config, upstream system)?"
- "Does it fail every time, or sometimes? For everyone, or for some users?"

"Sometimes" bugs usually depend on **data** (some records), **time** (time zones, month ends), **concurrency** (two requests at once), or **environment** (one server is different).

:::exercise Follow the code
Read this small program. A customer says: *"Customers with the 'gold' tier are charged the full price."* Find the bug by reading, and fix it. Do not rewrite the program; change as little as possible.
--- starter ---
DISCOUNTS = {"silver": 0.05, "gold": 0.10, "platinum": 0.15}

def tier_for(customer):
    return customer.get("tier", "none").lower()

def discount_rate(tier):
    return DISCOUNTS.get(tier.title(), 0.0)

def price_for(customer, amount):
    rate = discount_rate(tier_for(customer))
    return round(amount * (1 - rate), 2)
--- tests ---
assert price_for({"tier": "gold"}, 100) == 90.0
assert price_for({"tier": "GOLD"}, 100) == 90.0
assert price_for({"tier": "Platinum"}, 200) == 170.0
assert price_for({}, 50) == 50.0
assert price_for({"tier": "bronze"}, 50) == 50.0
--- solution ---
DISCOUNTS = {"silver": 0.05, "gold": 0.10, "platinum": 0.15}

def tier_for(customer):
    return customer.get("tier", "none").lower()

def discount_rate(tier):
    return DISCOUNTS.get(tier, 0.0)  # the bug: .title() turned "gold" into "Gold", which is not a key

def price_for(customer, amount):
    rate = discount_rate(tier_for(customer))
    return round(amount * (1 - rate), 2)
:::

:::quiz
Q: You join a customer and must fix a bug in a 200,000-line codebase. What do you do first?
- [ ] Read the code from the first file to the last
- [x] Reproduce the bug, then trace the code path for that one action
- [ ] Rewrite the module that looks old
Q: In a Python traceback, where is the error type and message?
- [ ] On the first line
- [x] On the last line
Q: A bug happens "only on the last day of the month". What kind of cause is most likely?
- [x] Date or time handling
- [ ] A slow database
- [ ] A memory leak
:::

:::cards Reading code
First step with unfamiliar code :: Run it. Then find the entry point for the action in the bug report.
Traceback :: Read from the bottom: the last line is what went wrong, the line above is where.
git blame / git log -p :: Shows why a line exists, when it changed, and who to ask.
"Sometimes" bugs :: Usually data, time, concurrency or environment.
:::
