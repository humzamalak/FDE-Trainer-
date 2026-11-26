# Messy real data
<!-- minutes: 60 -->

Customer data is never clean. An FDE's first week on site is often: "Here is our export. Can your product use it?" Expect mixed date formats, wrong encodings, extra spaces, duplicates and broken rows. The skill is to **clean it, count what you changed, and report what you could not fix** — never silently drop data.

## Dates in many formats

```python
from datetime import datetime

FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d %b %Y", "%Y-%m-%dT%H:%M:%S"]


def parse_date(text):
    text = text.strip()
    for fmt in FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


for raw in ["2026-11-26", "26/11/2026", " 26 Nov 2026 ", "2026-11-26T09:30:00", "next Tuesday"]:
    print(repr(raw), "->", parse_date(raw))
```

**Ambiguity:** is `03/04/2026` 3 April (UK) or 4 March (US)? Ask the customer. Never guess silently.

## Encodings

Files are bytes. Text is bytes + an encoding. UTF-8 is standard, but Excel exports are often `cp1252` (Windows) and some files start with a BOM.

```python
raw = "Café – £5".encode("cp1252")
print(raw)
try:
    print(raw.decode("utf-8"))
except UnicodeDecodeError as e:
    print("not UTF-8:", e.reason)
print(raw.decode("cp1252"))
```

## Normalise before you compare

```python
emails = ["  Ana@LSE.ac.uk", "ana@lse.ac.uk ", "BO@lse.ac.uk"]
clean = sorted({e.strip().lower() for e in emails})
print(clean)
```

## Report, do not hide

Keep counters: rows read, rows cleaned, rows rejected (with the reason and line number). A customer trusts "1,204 imported, 13 rejected (list attached)" much more than a silent import.

:::exercise Parse mixed dates
Write `parse_date(text)` that accepts `YYYY-MM-DD`, `DD/MM/YYYY` (UK order) and `DD Mon YYYY` (for example `26 Nov 2026`), ignoring spaces at the ends. Return an ISO string `"2026-11-26"`, or `None` if no format matches.
--- starter ---
from datetime import datetime

def parse_date(text):
    return datetime.strptime(text, "%Y-%m-%d").date().isoformat()
--- tests ---
assert parse_date("2026-11-26") == "2026-11-26"
assert parse_date("03/04/2026") == "2026-04-03"
assert parse_date(" 26 Nov 2026 ") == "2026-11-26"
assert parse_date("31/02/2026") is None
assert parse_date("next week") is None
--- solution ---
from datetime import datetime

FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d %b %Y"]

def parse_date(text):
    text = text.strip()
    for fmt in FORMATS:
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return None
:::

:::exercise Decode with a fallback
Write `decode(data)` for bytes from an unknown file. Remove a UTF-8 BOM if present (`codecs.BOM_UTF8`). Try UTF-8 first; if that fails, decode as `cp1252`. Return the text.
--- starter ---
def decode(data):
    return data.decode("utf-8")
--- tests ---
import codecs
assert decode("Café".encode("utf-8")) == "Café"
assert decode("Café – £5".encode("cp1252")) == "Café – £5"
assert decode(codecs.BOM_UTF8 + "id,name".encode("utf-8")) == "id,name"
--- solution ---
import codecs

def decode(data):
    if data.startswith(codecs.BOM_UTF8):
        data = data[len(codecs.BOM_UTF8):]
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp1252")
:::

:::exercise Import with a rejection report
Write `import_users(csv_text)`. The CSV has columns `email,cost`. For each row:
- clean the email (`strip`, lower case); reject the row if it has no `@` (reason `"bad email"`),
- parse `cost` as a float (allow `£` and commas, like `£1,200.50`); reject if it fails (reason `"bad cost"`),
- skip a **duplicate** email after the first (reason `"duplicate"`).

Return `{"users": [(email, cost), ...], "rejected": [(line_number, reason), ...]}`. Line numbers count the header as line 1.
--- starter ---
import csv, io

def import_users(csv_text):
    users = []
    for row in csv.DictReader(io.StringIO(csv_text)):
        users.append((row["email"], float(row["cost"])))
    return {"users": users, "rejected": []}
--- tests ---
assert import_users('email,cost\n"a@b.c","£1,200.50"\n') == {"users": [("a@b.c", 1200.5)], "rejected": []}
result = import_users('email,cost\n Ana@LSE.ac.uk ,"£1,200.50"\nbo-at-lse,10\ncy@lse.ac.uk,abc\nana@lse.ac.uk,5\ndi@lse.ac.uk,7\n')
assert result["users"] == [("ana@lse.ac.uk", 1200.5), ("di@lse.ac.uk", 7.0)]
assert result["rejected"] == [(3, "bad email"), (4, "bad cost"), (5, "duplicate")]
--- solution ---
import csv, io

def import_users(csv_text):
    users, rejected, seen = [], [], set()
    reader = csv.DictReader(io.StringIO(csv_text))
    for line, row in enumerate(reader, start=2):
        email = (row.get("email") or "").strip().lower()
        if "@" not in email:
            rejected.append((line, "bad email"))
            continue
        try:
            cost = float((row.get("cost") or "").replace("£", "").replace(",", "").strip())
        except ValueError:
            rejected.append((line, "bad cost"))
            continue
        if email in seen:
            rejected.append((line, "duplicate"))
            continue
        seen.add(email)
        users.append((email, cost))
    return {"users": users, "rejected": rejected}
:::

:::exercise Normalise UK phone numbers
Write `normalise_phone(text)` that returns a UK mobile number in the form `+447700900123`, or `None` if it is not a UK mobile. Accept `07700 900123`, `07700-900-123`, `+44 7700 900123` and `(0)7700 900123`. Remove spaces, dashes and brackets first.
--- starter ---
def normalise_phone(text):
    return text
--- tests ---
assert normalise_phone("07700 900123") == "+447700900123"
assert normalise_phone("+44 7700 900123") == "+447700900123"
assert normalise_phone("07700-900-123") == "+447700900123"
assert normalise_phone("+44 (0)7700 900123") == "+447700900123"
assert normalise_phone("020 7946 0000") is None
assert normalise_phone("12345") is None
--- solution ---
import re

def normalise_phone(text):
    digits = re.sub(r"[\s\-()]", "", text)
    if digits.startswith("+440"):
        digits = "+44" + digits[4:]
    if digits.startswith("07"):
        digits = "+44" + digits[1:]
    if re.fullmatch(r"\+447\d{9}", digits):
        return digits
    return None
:::

:::written Explain a data import to a customer
You imported a customer's 5,000-row user export. 4,870 rows imported. 130 were rejected: 90 duplicate emails, 30 bad dates, 10 unknown departments. Write the short message (max 120 words) you send to the customer's project lead.
--- rubric ---
- States the outcome with exact numbers first
- Breaks down the rejections by reason, with what each means
- Says what you need from them (fixed rows, a decision on date format, a department mapping) and attaches or offers the list
- Says what you did NOT assume (e.g. did not guess dates or merge duplicates silently)
- Clear next step and timeline; plain language, under 120 words
:::

:::quiz
Q: You see `03/04/2026` in a customer file. What do you do?
- [ ] Assume US format
- [ ] Assume UK format
- [x] Check other rows (a day above 12 shows the order) and confirm with the customer
Q: A CSV import fails with UnicodeDecodeError. Most likely cause?
- [x] The file is not UTF-8 (often cp1252 from Excel)
- [ ] The CSV has too many rows
- [ ] Python cannot read CSV
:::
