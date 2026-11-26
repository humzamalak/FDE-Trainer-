# The project deep dive
<!-- order: 2.5 -->
<!-- minutes: 45 -->

Most FDE loops include a round where you present something you built and a senior engineer digs into it for 45 minutes. They test **depth** (do you understand your own system?), **ownership** (what did *you* do?), **judgement** (why these trade-offs?) and **honesty** (what went wrong?).

You will present one of your portfolio projects, or a work project from your infrastructure background (for example an automated cluster or platform deployment) — you can talk about work projects as long as you do not share confidential details.

## The 5-minute presentation

1. **Context (30 s).** Who the user was and what problem hurt.
2. **What you built (60 s).** One diagram. Name the main parts and the data flow.
3. **Your role (20 s).** "I designed and built X; Y helped with Z."
4. **Two hard decisions (90 s).** For each: the options, what you chose, why, and what it cost you.
5. **Results (40 s).** A number: users, time saved, eval score, cost.
6. **What went wrong and what you would change (40 s).**

Then stop and let them ask.

## Questions to prepare (write answers for each)

- Why did you choose this architecture? What else did you consider?
- What was the hardest bug? How did you find it?
- How did you test it? How do you know it works?
- What happens at 10× or 100× the load or data?
- What are the security risks? What would an attacker try?
- What did it cost to run? How could it be cheaper?
- What would you do differently with what you know now?
- What did you do yourself, and what did others do?

## Do and do not

- **Do** say "I" for your work and "we" for the team's work. Interviewers listen for this.
- **Do** give numbers, even rough ones.
- **Do** say "I do not know, but I would find out by …" instead of guessing.
- **Do not** hide failures. A clear failure story with a lesson is one of the best signals in this round.

:::checklist Prepare your deep dive
- [ ] Chose the project and drew one architecture diagram
- [ ] Wrote the 5-minute script and timed it out loud
- [ ] Wrote answers to the 8 questions above
- [ ] Prepared one failure story with the lesson I learned
- [ ] Ran the Project deep dive mock interview and got a verdict
- [ ] Fixed the top gap and ran the mock again
:::

:::written Your two hard decisions
For the project you will present, write the two hard decisions as you would say them: the options, your choice, why, and the cost of that choice.
--- rubric ---
- Each decision has at least two real alternatives
- The reasons are specific (numbers, constraints, evidence), not "it is the best practice"
- Each names the downside of the chosen option honestly
- Clear "I" ownership
:::

:::quiz
Q: The interviewer asks about a part of the system a teammate built and you do not know well. Best answer?
- [ ] Make up a plausible answer
- [x] Say a teammate built it, explain what you do know about how it connects to your part, and how you would find out the rest
Q: Which is the strongest result statement?
- [ ] "It worked really well."
- [x] "Eval accuracy went from 64% to 81%, and median answer time was 2.1 seconds."
:::

Practise with the **Project deep dive** mock interview.
