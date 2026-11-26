# pandas for customer data
<!-- minutes: 60 -->

**pandas** is the standard Python library for tables of data. At a customer you use it to look at an export in minutes: how many rows, which columns are empty, what the totals are, where the duplicates are. It is also common in take-home tests and data rounds.

pandas runs in this app too (it is bundled). **The first run that imports pandas takes about 10 seconds** while it loads; after that it is fast.

## The two objects

- A **DataFrame** is a table: rows and named columns.
- A **Series** is one column.

```python
import pandas as pd

df = pd.DataFrame({
    "site": ["London", "Leeds", "London", "Leeds", "Bristol"],
    "jobs": [120, 80, 95, None, 40],
    "gpu_hours": [300.5, 120.0, 250.0, 90.0, 60.0],
})
print(df.shape)         # (5, 3): rows, columns
print(df.head())        # the first rows
print(df.dtypes)        # the type of each column
print(df.isna().sum())  # empty values per column
print(df.describe())    # count, mean, min, max… for number columns
```

## Selecting and filtering

```python
df["site"]                       # one column (a Series)
df[["site", "jobs"]]             # several columns (a DataFrame)
df[df["gpu_hours"] > 100]        # rows where the condition is true
df[(df["site"] == "London") & (df["jobs"] > 100)]   # use & and |, with brackets
df.loc[0, "site"]                # by label
df.sort_values("gpu_hours", ascending=False)
```

## Cleaning

```python
df["jobs"] = df["jobs"].fillna(0).astype(int)        # fill empty values
df["site"] = df["site"].str.strip().str.title()      # string methods with .str
df = df.drop_duplicates()
print(df)

dates = pd.DataFrame({"date": ["31/01/2026", "not a date"]})
dates["date"] = pd.to_datetime(dates["date"], dayfirst=True, errors="coerce")  # bad dates become NaT
print(dates)
```

## Group by: the most useful operation

It is the same idea as SQL `GROUP BY`:

```python
summary = df.groupby("site").agg(total_jobs=("jobs", "sum"), avg_hours=("gpu_hours", "mean"))
print(summary.sort_values("total_jobs", ascending=False))
```

## Joining tables

`pd.merge(a, b, on="user_id", how="left")` is SQL's `LEFT JOIN`. Check the row count before and after a merge: if it grows, the key was not unique in one table.

## pandas or plain Python?

Use pandas for exploring and transforming tables. In a live coding interview, use plain Python unless the interviewer says pandas is fine: they want to see loops, dicts and complexity. Mention that you would use pandas in real work.

:::exercise Clean an export
Write `clean(df)` that returns a new DataFrame where: `email` is stripped and lower case; rows with an empty `email` are removed; duplicate emails are removed (keep the first); and `spend` empty values become `0.0`. Reset the index (0, 1, 2…).
--- starter ---
import pandas as pd

def clean(df):
    return df
--- tests ---
import pandas as pd
raw = pd.DataFrame({
    "email": [" A@x.com", "a@x.com ", None, "b@y.org", ""],
    "spend": [10.0, 5.0, 3.0, None, 1.0],
})
out = clean(raw)
assert out["email"].tolist() == ["a@x.com", "b@y.org"], out["email"].tolist()
assert out["spend"].tolist() == [10.0, 0.0]
assert out.index.tolist() == [0, 1]
assert raw.shape == (5, 2), "do not change the input"
--- solution ---
import pandas as pd

def clean(df):
    out = df.copy()
    out["email"] = out["email"].str.strip().str.lower()
    out = out[out["email"].notna() & (out["email"] != "")]
    out = out.drop_duplicates(subset="email", keep="first")
    out["spend"] = out["spend"].fillna(0.0)
    return out.reset_index(drop=True)
:::

:::exercise Usage per department
`jobs` has columns `user` and `gpu_hours`; `users` has `user` and `department`. Write `by_department(jobs, users)` that returns a dict `{department: total gpu_hours}` for departments with any jobs, rounded to 1 decimal place. Jobs from users not in `users` count under `"unknown"`.
--- starter ---
import pandas as pd

def by_department(jobs, users):
    return {}
--- tests ---
import pandas as pd
jobs = pd.DataFrame({"user": ["ann", "bob", "ann", "cat", "zed"], "gpu_hours": [1.25, 2.0, 3.0, 0.5, 4.0]})
users = pd.DataFrame({"user": ["ann", "bob", "cat"], "department": ["Economics", "Statistics", "Economics"]})
assert by_department(jobs, users) == {"Economics": 4.8, "Statistics": 2.0, "unknown": 4.0}
assert len(jobs) == 5
--- solution ---
import pandas as pd

def by_department(jobs, users):
    merged = jobs.merge(users, on="user", how="left")
    merged["department"] = merged["department"].fillna("unknown")
    totals = merged.groupby("department")["gpu_hours"].sum().round(1)
    return {dept: float(hours) for dept, hours in totals.items()}
:::

:::quiz
Q: How do you combine two conditions in a pandas filter?
- [ ] `df[df.a > 1 and df.b < 2]`
- [x] `df[(df.a > 1) & (df.b < 2)]`
> `and` does not work on whole columns. Use `&` and `|`, and brackets around each condition.
Q: After `pd.merge(orders, customers, on="customer_id")`, you have more rows than `orders` had. Why?
- [x] Some customer_id values appear more than once in `customers`
- [ ] pandas added empty rows
Q: Which pandas operation is like SQL GROUP BY?
- [x] df.groupby(...).agg(...)
- [ ] df.pivot_table only
:::

:::cards pandas
Look at a new DataFrame :: df.shape, df.head(), df.dtypes, df.isna().sum(), df.describe().
Filter rows :: df[condition]; combine with & and |, each condition in brackets.
Group and total :: df.groupby("col").agg(name=("other", "sum")).
Left join in pandas :: pd.merge(a, b, on="key", how="left"). Check row counts after.
Bad dates :: pd.to_datetime(col, dayfirst=True, errors="coerce") turns bad values into NaT.
:::
