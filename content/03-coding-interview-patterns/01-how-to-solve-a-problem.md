# How to solve a coding problem in an interview
<!-- minutes: 30 -->

Interviewers grade **how you think and communicate**, not only whether the code runs. Use the same 6 steps every time (often called UMPIRE).

1. **Understand.** Repeat the problem in your own words. Ask about input size, types, empty input, duplicates, negative numbers, sorted or not. Write 2 examples, including one edge case.
2. **Match.** Which pattern fits? (Use the table below.)
3. **Plan.** Say the approach and its Big-O **before** you code. Start with brute force if needed: "The simple way is O(n²). I can make it O(n) with a hash map." Ask: "Shall I code the O(n) version?"
4. **Implement.** Clear names. Talk while you type. Use helper functions.
5. **Review.** Walk through your example by hand, line by line. Fix bugs you find.
6. **Evaluate.** State the final time and space complexity. Mention trade-offs and what you would test.

## Pattern finder

| Clue in the problem | Try |
|---|---|
| "Have I seen this before?", counts, pairs that sum to X | Hash map / set |
| Sorted array, pair from both ends, in-place | Two pointers |
| "Longest/shortest substring/subarray with…" | Sliding window |
| Brackets, "next greater", undo, nested structures | Stack |
| Sorted input, "find minimum value that works" | Binary search |
| Tree, nested data, "all combinations" | Recursion / DFS |
| Grid, network, dependencies, shortest path in steps | Graph BFS / DFS |
| "Top k", "k-th largest", merge sorted lists, scheduling | Heap |
| Meetings, time ranges, overlaps | Sort + intervals |

## What to say when you are stuck

- "Let me try a small example by hand."
- "What if the input were sorted? Would that help?"
- "Can I trade memory for time here?"

Silence is the worst choice. Thinking out loud lets the interviewer help you.

:::quiz
Q: What should you do right after you understand the problem?
- [ ] Start typing code immediately
- [x] Say your approach and its complexity, and check the interviewer agrees
- [ ] Ask for the answer
Q: The problem says "find the longest substring without repeating characters". Which pattern?
- [ ] Binary search
- [x] Sliding window
- [ ] Heap
:::
