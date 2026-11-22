# Conditions and booleans
<!-- minutes: 35 -->

Programs make decisions with `if`, `elif` and `else`. **Indentation (4 spaces) defines the block.** This is like YAML: the spaces matter.

```python
cpu = 92
if cpu > 90:
    status = "critical"
elif cpu > 70:
    status = "warning"
else:
    status = "ok"
```

Python checks the conditions from the top. It runs only the **first** block that is true.

## Comparison operators

`==` equal, `!=` not equal, `<`, `<=`, `>`, `>=`, `in` (is it inside?).

## Combining conditions

```python
if env == "prod" and not approved:
    print("Blocked: production change needs approval")

if region in ("eu-west-1", "eu-west-2"):
    print("EU region")
```

`and` is true only if both sides are true. `or` is true if one side is true. `not` reverses.

## Truthy and falsy

These count as `False` in an `if`: `False`, `None`, `0`, `""`, `[]`, `{}`. Everything else counts as `True`.

```python
errors = []
if not errors:
    print("No errors")
```

## Guard clauses

Handle the bad cases first and return early. This keeps code flat and readable — interviewers like it.

```python
def can_deploy(env, tests_passed, approved):
    if not tests_passed:
        return False
    if env == "prod" and not approved:
        return False
    return True
```

:::exercise Alert level
Write `alert_level(cpu)`:
- `"critical"` if cpu is 90 or more
- `"warning"` if cpu is 70 or more (and less than 90)
- `"ok"` otherwise
--- starter ---
def alert_level(cpu):
    pass
--- tests ---
assert alert_level(95) == "critical"
assert alert_level(90) == "critical"
assert alert_level(70) == "warning"
assert alert_level(69.9) == "ok"
assert alert_level(0) == "ok"
--- solution ---
def alert_level(cpu):
    if cpu >= 90:
        return "critical"
    if cpu >= 70:
        return "warning"
    return "ok"
:::

:::exercise FizzBuzz
The classic first interview question. Write `fizzbuzz(n)`:
- return `"FizzBuzz"` if n is divisible by 3 **and** 5
- return `"Fizz"` if divisible by 3
- return `"Buzz"` if divisible by 5
- otherwise return the number as a string, for example `"7"`

Think: which check must come first?
--- starter ---
def fizzbuzz(n):
    pass
--- tests ---
assert fizzbuzz(15) == "FizzBuzz"
assert fizzbuzz(9) == "Fizz"
assert fizzbuzz(10) == "Buzz"
assert fizzbuzz(7) == "7"
assert fizzbuzz(30) == "FizzBuzz"
--- solution ---
def fizzbuzz(n):
    if n % 15 == 0:
        return "FizzBuzz"
    if n % 3 == 0:
        return "Fizz"
    if n % 5 == 0:
        return "Buzz"
    return str(n)
:::

:::exercise Access check
Write `has_access(user_groups, resource_env)`. `user_groups` is a list of group names.
- Anyone in `"admins"` has access to everything.
- For `"prod"`, the user must be in `"prod-operators"`.
- For any other environment, the user must be in `"developers"` or `"prod-operators"`.
--- starter ---
def has_access(user_groups, resource_env):
    pass
--- tests ---
assert has_access(["admins"], "prod") is True
assert has_access(["developers"], "prod") is False
assert has_access(["prod-operators"], "prod") is True
assert has_access(["developers"], "dev") is True
assert has_access(["prod-operators"], "test") is True
assert has_access([], "dev") is False
--- solution ---
def has_access(user_groups, resource_env):
    if "admins" in user_groups:
        return True
    if resource_env == "prod":
        return "prod-operators" in user_groups
    return "developers" in user_groups or "prod-operators" in user_groups
:::

:::quiz
Q: Which value counts as False in an if?
- [ ] "False"
- [x] [] (an empty list)
- [ ] 1
> Empty collections, 0, None and "" are falsy. The string "False" is not empty, so it is truthy.
:::
