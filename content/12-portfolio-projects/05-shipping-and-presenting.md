# Shipping and presenting your projects
<!-- minutes: 30 -->

A project nobody can understand in 2 minutes does not help you. This lesson turns each project into interview material.

## The README order

1. One sentence: what it does and for whom.
2. A screenshot or GIF, and a link to a 2-minute video.
3. Quick start: one command.
4. Results: the eval table or the key numbers.
5. Architecture diagram.
6. Design decisions (with alternatives and evidence).
7. Limits and what you would do next.

## The 2-minute demo video

Show the problem (15 s), the product working on a real example (60 s), the evals or the numbers (20 s), and one design decision (25 s). Record it with free screen-recording software. Do not edit too much: clear sound matters more than effects.

## The write-up

Write one short blog post or LinkedIn article per project: the problem, one hard decision, one number, one thing you learned. This gives recruiters something to find and gives you practice for the deep dive.

:::checklist Ship each project
- [ ] README in the order above, with real numbers
- [ ] Demo video linked at the top of the README
- [ ] CI is green and the badge is in the README
- [ ] A clean repo: no API keys in the history, no large data files, a licence
- [ ] One write-up published (blog or LinkedIn) with a link to the repo
- [ ] Practised the 5-minute presentation of this project out loud (see lesson 7 "Project deep dive")
- [ ] Added the project to my CV with one line of impact
:::

:::quiz
Q: You find your API key in an old commit of a public repo. What do you do first?
- [ ] Delete the commit
- [x] Revoke the key in the provider's console immediately, then clean the history
> Once a key is public it must be treated as stolen. Removing it from git does not remove it from forks, caches and scanners.
:::
