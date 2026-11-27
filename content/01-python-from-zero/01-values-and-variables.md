# Values, variables and types
<!-- minutes: 40 -->

A program works with **values**. Every value has a **type**.

| Type | Example | Use |
|---|---|---|
| `int` | `42`, `-3` | whole numbers |
| `float` | `3.14`, `0.5` | decimal numbers |
| `str` | `"eu-west-2"` | text |
| `bool` | `True`, `False` | yes / no |
| `None` | `None` | "no value" |

A **variable** is a name that points to a value. `=` means "assign", not "equals".

```python
region = "eu-west-2"
instance_count = 3
hourly_cost = 0.192
is_production = False

print(type(instance_count))  # <class 'int'>
```

## Arithmetic

```python
total = instance_count * hourly_cost  # 0.576
7 / 2  # 3.5   normal division always gives a float
7 // 2  # 3     floor division: whole part only
7 % 2  # 1     modulo: the remainder
2**10  # 1024  power
```

`%` is very useful. `n % 2 == 0` tests if `n` is even.

## Converting types

```python
int("42")  # 42
str(42)  # "42"
float("0.5")  # 0.5
int(3.9)  # 3   (it cuts, it does not round)
round(3.9)  # 4
```

Input from files, APIs and users is usually text. You must convert it before you do maths.

## Names

Use `snake_case`: lowercase words joined with `_`. Choose names that say what the value is. `monthly_cost_gbp` is better than `x`.

## Just enough functions and lists (for the next lessons)

From lesson 2 on, most exercises ask you to **write a function**, and some use **lists**. Lessons 5–7 teach both properly. For now you only need this much.

A **function** is a named piece of code. It takes inputs (parameters) and gives back a result with `return`:

```python
def monthly_cost(hourly_cost, hours):
    return round(hourly_cost * hours, 2)

print(monthly_cost(0.192, 730))  # 140.16
```

- `def` starts the function, then its name, then the parameters in brackets, then `:`.
- The body is **indented** by 4 spaces. Indentation is how Python knows what is inside the function.
- `return` ends the function and gives the value back. Without `return`, the result is `None`.
- In starter code, `pass` means "nothing here yet". Replace it with your code.
- The tests call your function, for example `assert monthly_cost(0.192, 730) == 140.16`. `assert` does nothing if the check is true and stops with an error if it is false.

A **list** holds several values in order, inside `[ ]`:

```python
costs = [12.5, 3.0, 7.25]
costs.append(1.0)        # add to the end: [12.5, 3.0, 7.25, 1.0]
print(len(costs))        # 4 (how many items)
print(costs[0])          # 12.5 (the first item; counting starts at 0)
print(costs[-1])         # 1.0 (the last item)
print(costs[1:3])        # [3.0, 7.25] (a slice: from index 1 up to, not including, 3)
print(min(costs), max(costs), sum(costs))
```

That is all you need until lesson 5. If an exercise uses something you have not seen, ask the tutor or skip ahead and come back.

:::exercise Monthly cost
An instance costs `0.192` per hour. A month has `730` hours.

Create:
- `hourly_cost` = `0.192`
- `hours_per_month` = `730`
- `instances` = `4`
- `monthly_cost` = the total monthly cost for all instances, **rounded to 2 decimal places** with `round(value, 2)`.
--- starter ---
hourly_cost = 0.192
hours_per_month = 730
instances = 4
monthly_cost = 0
--- tests ---
assert hourly_cost == 0.192
assert instances == 4
assert monthly_cost == 560.64
--- solution ---
hourly_cost = 0.192
hours_per_month = 730
instances = 4
monthly_cost = round(hourly_cost * hours_per_month * instances, 2)
:::

:::exercise Even or odd, and remainders
Set `n = 17`. Create:
- `is_even`: `True` if `n` is even, otherwise `False`. Use `%`.
- `full_boxes`: how many full boxes of 5 you can make from `n` items. Use `//`.
- `left_over`: how many items are left over. Use `%`.
--- starter ---
n = 17
is_even = None
full_boxes = None
left_over = None
--- tests ---
assert is_even is False
assert full_boxes == 3
assert left_over == 2
--- solution ---
n = 17
is_even = n % 2 == 0
full_boxes = n // 5
left_over = n % 5
:::

:::quiz
Q: What is the type of `"42"`?
- [ ] int
- [x] str
- [ ] float
> The quotes make it text. Use int("42") to convert it.
Q: What is `7 // 2`?
- [ ] 3.5
- [x] 3
- [ ] 1
> // is floor division: it keeps only the whole part.
Q: What does `x = 5` do?
- [ ] Checks if x equals 5
- [x] Makes the name x point to the value 5
- [ ] Creates a constant
> A single = assigns. Two (==) compares.
:::
