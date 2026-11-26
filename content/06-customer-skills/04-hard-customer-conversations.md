# Hard customer conversations
<!-- minutes: 50 -->

As an FDE you work inside the customer's organisation. Many interviews test **judgement**: what you do when a customer is angry, wants more than was agreed, asks for a promise you cannot keep, or asks you to do something wrong. There is rarely one perfect answer, but there are clear wrong ones: lying, blaming your own team, agreeing to everything, or going silent.

## The pattern: A-F-O-C-F

1. **Acknowledge.** Show that you heard the feeling and the impact. "I understand this blocked your team all morning, and that is serious."
2. **Facts.** Say what you know, what you do not know yet, and when you will know. Never guess about causes.
3. **Options.** Give 2–3 real options with their trade-offs. Let the customer choose where possible.
4. **Commit.** One clear next step, an owner, and a time. "I will send you a written update by 4 pm today."
5. **Follow up.** Do it, and in writing. Trust is built by the follow-up, not by the meeting.

## Rules that always apply

- **Never lie or hide a problem**, even when someone asks you to. You can choose *how* and *when* to say something, with your own manager; you cannot choose to deceive.
- **Protect scope politely.** New requests are welcome; they go through a decision about priority, time or cost. "Yes, and here is what it would replace" beats "no" and beats a silent "yes".
- **Escalate early, not late.** Tell your own manager about a risk the day you see it. Surprises destroy trust.
- **Security and safety are not negotiable.** If a request breaks a security rule or puts people at risk, say no and explain the safe alternative.
- **Separate the person from the problem.** An angry stakeholder is usually under pressure from someone else. Ask what they need to tell *their* boss.

## Example: saying no to scope creep

> "I can see why the dashboard would help your board meeting. If we add it this sprint, the integration with the billing system moves by about a week. Option one: keep the plan and I build a simple export for the board instead, today. Option two: swap the dashboard in and move billing. Option three: we add a second engineer for two weeks, which needs approval from my side. Which matters most for you this month?"

:::quiz
Q: The production system you deployed was down for 3 hours. The customer's director calls you, angry. The cause is not known yet. What do you say first?
- [ ] "It was the cloud provider's fault."
- [ ] "We are investigating" and nothing else, to avoid saying anything wrong
- [x] Acknowledge the impact, say what you know and do not know, and commit to the next update at a specific time
- [ ] Explain the technical details of the architecture so they understand it is complex
> Do not guess the cause, do not blame, and do not go silent. A time for the next update is what an angry customer needs most.
Q: A sponsor asks you to "not mention" to their boss that the pilot missed its accuracy target, until the next release fixes it. What do you do?
- [ ] Agree: it is their organisation and their decision
- [x] Refuse to hide it, offer to help them present it honestly with a recovery plan, and tell your own manager
- [ ] Tell their boss yourself immediately, without talking to the sponsor
> You do not deceive, but you also do not ambush your sponsor. Help them tell it well: "Here is where we are, why, and the plan."
Q: In a meeting, the customer asks: "Can you promise it will be live by the 1st?" You think it is possible but not certain. Best answer?
- [ ] "Yes, definitely."
- [ ] "No, that is impossible."
- [x] "It is possible if X and Y happen by the 15th. I will confirm on the 15th. If we need certainty, here is a smaller scope we can promise."
> Give the conditions and a date when you will know. Offer a smaller scope you can promise.
Q: The customer's security officer blocks your rollout two days before launch because a review was not done. What is the best move?
- [ ] Ask the sponsor to overrule the security officer
- [ ] Launch anyway to a small group
- [x] Accept it, ask exactly what the review needs, offer to work through it together quickly, and reset expectations with the sponsor
> Security people are partners. Working with them fast is how you launch; going around them ends the project.
Q: A user in a workshop says your tool is "useless". Best first response?
- [ ] Explain why they are using it wrong
- [x] Ask them to show you the task where it failed, and listen
- [ ] Ignore it and continue the workshop
> The loudest critic often knows the real workflow best. A specific failure is gold for your next iteration.
:::

:::written The outage email
Your RAG assistant at a customer gave wrong answers for 2 days because a document sync job failed silently. 200 staff used it. Write the email to the customer's sponsor (150–250 words).
--- rubric ---
- Clear subject line and a first sentence that states the problem and its impact plainly
- Takes responsibility without blaming people; no hidden or minimised facts
- What happened, what is fixed now, and what is still unknown
- What users should do (for example re-check answers given between two dates)
- Prevention: monitoring/alerting on the sync job, a freshness check, a test
- A specific next step and time, and an offer to talk
- Calm, short sentences, no jargon
:::

:::written Scope creep in week 3
Two weeks into a 6-week pilot, the customer asks you to also connect their HR system "while you are at it". Write what you would say in the meeting (about 150 words).
--- rubric ---
- Acknowledges the value of the request and asks what problem it solves
- Explains the impact on the agreed plan (time, risk, data sensitivity of HR data)
- Offers 2–3 options with trade-offs (add to phase 2, swap with something, extend the pilot)
- Lets the customer choose, and commits to writing it down
:::

:::cards Hard conversations
A-F-O-C-F :: Acknowledge, Facts, Options, Commit, Follow up.
What an angry customer needs most :: To feel heard, the facts you have, and a time for the next update.
Scope creep answer :: "Yes, and here is what it would replace or cost" — then let them choose.
When to escalate a risk :: The day you see it. Surprises destroy trust.
Asked to hide a problem :: Refuse to deceive; help the person present it honestly with a plan; tell your manager.
:::

Practise this with the **Hard client conversation** mock interview. Do it three times: each run gives you a different situation.
