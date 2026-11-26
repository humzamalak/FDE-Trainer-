# Binary, powers of two and counting
<!-- minutes: 45 -->

## Powers of two (memorise these)

| Power | Value | Approx | Use |
|---|---|---|---|
| $2^{10}$ | 1,024 | thousand (KB) | |
| $2^{20}$ | 1,048,576 | million (MB) | |
| $2^{30}$ | | billion (GB) | |
| $2^{32}$ | 4,294,967,296 | 4 billion | IPv4 addresses, 32-bit int |
| $2^{40}$ | | trillion (TB) | |
| $2^{64}$ | | $1.8 \times 10^{19}$ | 64-bit int |

You already use this: a `/24` subnet has $2^{32-24} = 2^8 = 256$ addresses.

## Binary

Base 2 uses only 0 and 1. Each position is a power of two.

$$1011_2 = 1\cdot 2^3 + 0\cdot 2^2 + 1\cdot 2^1 + 1\cdot 2^0 = 8 + 0 + 2 + 1 = 11$$

```python
bin(11)  # '0b1011'
int("1011", 2)  # 11
hex(255)  # '0xff'
11 & 1  # 1  -> odd   (bitwise AND)
1 << 4  # 16          (shift left = multiply by 2^4)
```

Bitwise operators: `&` AND, `|` OR, `^` XOR, `~` NOT, `<<` `>>` shifts. Unix permissions use them: `0o755`.

## Counting (combinatorics)

**Multiplication rule**: if one choice has $a$ options and a second has $b$, together there are $a \times b$ options.

**Permutations** (order matters) — arrange $k$ of $n$ items: $\dfrac{n!}{(n-k)!}$

**Combinations** (order does not matter) — choose $k$ of $n$:

$$\binom{n}{k} = \frac{n!}{k!\,(n-k)!}$$

**Subsets**: a set of $n$ items has $2^n$ subsets (each item is in or out).

**Pairs**: $n$ items make $\binom{n}{2} = \dfrac{n(n-1)}{2}$ pairs. This is why "compare every pair" is $O(n^2)$. A full mesh of $n$ services needs $\frac{n(n-1)}{2}$ connections.

```python
import math

math.factorial(5)  # 120
math.comb(5, 2)  # 10
math.perm(5, 2)  # 20
```

## Modular arithmetic

`a % m` is the remainder. It "wraps around", like a clock. Uses: even/odd, round-robin load balancing (`request_id % n_servers`), hash tables (`hash(key) % n_buckets`), cyclic schedules.

:::exercise Subnet size
Write `usable_hosts(prefix)` for an IPv4 CIDR prefix such as 24. A subnet has $2^{32 - \text{prefix}}$ addresses. AWS reserves 5 addresses in each subnet. Return the usable count for AWS. Return 0 if the result would be negative.
--- starter ---
def usable_hosts(prefix):
    pass
--- tests ---
assert usable_hosts(24) == 251
assert usable_hosts(28) == 11
assert usable_hosts(16) == 65531
assert usable_hosts(30) == 0
--- solution ---
def usable_hosts(prefix):
    return max(0, 2 ** (32 - prefix) - 5)
:::

:::exercise Binary to decimal by hand
Write `to_decimal(bits)` that turns a string like `"1011"` into `11`. **Do not use `int(bits, 2)`.** Use the place values.
--- starter ---
def to_decimal(bits):
    pass
--- tests ---
assert to_decimal("1011") == 11
assert to_decimal("0") == 0
assert to_decimal("11111111") == 255
assert to_decimal("100000") == 32
--- solution ---
def to_decimal(bits):
    value = 0
    for b in bits:
        value = value * 2 + int(b)
    return value
:::

:::exercise Round-robin
Write `assign(request_ids, servers)` that returns a dict of server → list of request ids, giving request `i` (by position in the list) to `servers[i % len(servers)]`.
--- starter ---
def assign(request_ids, servers):
    pass
--- tests ---
assert assign([10, 11, 12, 13, 14], ["a", "b"]) == {"a": [10, 12, 14], "b": [11, 13]}
assert assign([], ["a"]) == {"a": []}
--- solution ---
def assign(request_ids, servers):
    result = {s: [] for s in servers}
    for i, rid in enumerate(request_ids):
        result[servers[i % len(servers)]].append(rid)
    return result
:::

:::quiz
Q: How many ways can you choose 3 reviewers from 10 people (order does not matter)?
- [ ] 30
- [ ] 720
- [x] 120
> C(10,3) = 10·9·8 / (3·2·1) = 120. 720 is the ordered count.
Q: How many subsets does a set of 10 items have?
- [ ] 100
- [x] 1024
- [ ] 10!
> Each item is in or out: 2^10.
Q: 20 microservices all talk to each other directly. How many connections?
- [ ] 400
- [x] 190
- [ ] 20
> n(n−1)/2 = 20·19/2 = 190.
:::
