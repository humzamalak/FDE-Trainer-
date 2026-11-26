# The decomposition method
<!-- minutes: 45 -->

In a decomposition round the interviewer gives you a large, vague problem, for example: *"A hospital group wants to cut A&E waiting times."* There is no data and no plan. They do **not** grade the "right answer". They grade **how you think**:

- Do you find out what success means before you solve anything?
- Can you split the problem into smaller parts that do not overlap?
- Do you choose a sensible first part, and say why?
- Do you think about data: what exists, where it is, who owns it?
- Is your first version small enough to ship in weeks, not years?
- Do you communicate clearly and change your plan when facts change?

## The six steps

1. **Goal and metric.** "What does success look like in 6 months? Which number moves?" For A&E: the share of patients seen within 4 hours, average wait, number of patients who leave without being seen. Agree on **one** main metric.
2. **Actors and workflow.** Who is involved and what happens today, step by step? Patient arrives → triage → wait → doctor → tests → decision → admit or discharge. Each step is a place where time can go.
3. **Split the problem (an issue tree).** Break the goal into parts that are **mutually exclusive and collectively exhaustive** (MECE: no overlap, nothing missing). For A&E, waiting time = time before triage + time from triage to doctor + time waiting for tests + time waiting for a bed.
4. **Data.** For each part: which data shows it? Where does it live (the patient system, the lab system, bed management)? Who owns it? Is it sensitive (yes: patient data, so you need governance from day one)?
5. **Prioritise.** For each part, estimate **value** (how much it moves the metric), **effort**, and **confidence**. Pick the part with the best value for the effort *that you can measure*. Say why out loud.
6. **First version and risks.** Describe what you would ship in 2–6 weeks, how you would measure it, and what could go wrong (data quality, adoption, safety, politics).

## What to say in the first two minutes

> "Before I design anything, can I check what success means? Is the target the 4-hour standard, or something else? And which sites are in scope?"

Then summarise: "So the goal is to raise the share of patients seen within 4 hours from 70% to 80% at three sites, within 6 months. Let me break down where the time goes."

## Value × confidence ÷ effort

A simple score helps you decide and explain. Score each option 1–5:

$$\text{priority} = \frac{\text{value} \times \text{confidence}}{\text{effort}}$$

This is a thinking tool, not a law. Say the numbers out loud so the interviewer can disagree with one of them: that is a good conversation.

:::exercise Rank the sub-problems
Write `rank(options)`. Each option is a dict with `name`, `value`, `confidence` and `effort` (all 1–5). Return the names sorted by `value * confidence / effort`, highest first. If two scores are equal, the option with **less effort** comes first (ship the quick win). If they still tie, keep the original order.
--- starter ---
def rank(options):
    pass
--- tests ---
opts = [
    {"name": "bed management", "value": 5, "confidence": 3, "effort": 5},
    {"name": "triage queue", "value": 4, "confidence": 4, "effort": 2},
    {"name": "lab turnaround", "value": 3, "confidence": 4, "effort": 4},
]
assert rank(opts) == ["triage queue", "lab turnaround", "bed management"]  # 8, then a 3-3 tie: less effort first
tie = [
    {"name": "a", "value": 4, "confidence": 2, "effort": 4},
    {"name": "b", "value": 2, "confidence": 2, "effort": 2},
]
assert rank(tie) == ["b", "a"]
assert rank([]) == []
assert rank([{"name": "x", "value": 1, "confidence": 1, "effort": 1}, {"name": "y", "value": 1, "confidence": 1, "effort": 1}]) == ["x", "y"]
--- solution ---
def rank(options):
    def key(o):
        return (-(o["value"] * o["confidence"] / o["effort"]), o["effort"])
    return [o["name"] for o in sorted(options, key=key)]  # sorted() is stable: ties keep their order
:::

:::exercise Walk an issue tree
An issue tree is a nested dict: each key is a sub-problem, and its value is a dict of smaller sub-problems (an empty dict means it is a leaf: something you can work on directly). Write `leaves(tree)` that returns every leaf as a path string like `"wait time > before triage"`, in the order they appear.
--- starter ---
def leaves(tree, prefix=""):
    pass
--- tests ---
tree = {
    "wait time": {
        "before triage": {},
        "triage to doctor": {"staffing": {}, "room availability": {}},
        "waiting for a bed": {},
    }
}
assert leaves(tree) == [
    "wait time > before triage",
    "wait time > triage to doctor > staffing",
    "wait time > triage to doctor > room availability",
    "wait time > waiting for a bed",
]
assert leaves({}) == []
assert leaves({"only": {}}) == ["only"]
--- solution ---
def leaves(tree, prefix=""):
    result = []
    for name, children in tree.items():
        path = f"{prefix} > {name}" if prefix else name
        if children:
            result.extend(leaves(children, path))
        else:
            result.append(path)
    return result
:::

:::quiz
Q: The interviewer says "A supermarket chain wants to reduce food waste." What should you do first?
- [ ] Propose a computer-vision system for shelves
- [x] Ask how waste is measured today and what target they want, then summarise the goal
- [ ] Ask which cloud provider they use
> Goal and metric first. The solution depends on where the waste happens, and you cannot know that yet.
Q: Your split of "A&E wait" is: triage time, doctor time, and "staff shortages". What is wrong?
- [ ] Nothing
- [x] It is not MECE: staff shortages is a cause that affects every step, not a separate step of the wait
- [ ] It has too few parts
> Mix steps and causes and you count the same minutes twice. Split by one dimension (the steps), then look at causes inside each step.
Q: Two options have the same priority score. Which do you start with?
- [x] The one with less effort, so you ship something and learn sooner
- [ ] The one with more value, always
- [ ] Neither: get more data first
Q: Why talk about data in a decomposition round with no data?
- [x] Because the first real blocker in most customer projects is access to the right data, and naming owners and sensitivity shows you know that
- [ ] To show you know SQL
:::

:::cards Decomposition basics
MECE :: Mutually exclusive, collectively exhaustive: the parts do not overlap and nothing is missing.
The first question in a decomposition round :: What does success look like, and which number moves?
Priority score :: value × confidence ÷ effort, each 1–5. Say the numbers out loud so they can be challenged.
A good first version :: Small enough to ship in 2–6 weeks, measurable with the main metric, safe to roll back.
Steps vs causes :: Split by one dimension (for example the steps of a workflow); look at causes inside each part.
:::
