# Discovery and the customer case round
<!-- minutes: 50 -->

In the case round, the interviewer plays a customer with a vague problem. They grade: **Do you find the real problem? Do you scope it to something you can ship? Do you handle trade-offs and push back well?**

## The case framework

1. **Goal.** "What outcome do you want? How will you know it worked?" Get a number if you can (hours saved, tickets resolved, cost).
2. **Users and workflow today.** "Walk me through how this works now. Where does it hurt?" Ask to see an example.
3. **Constraints.** Data (where, how sensitive), systems, security/compliance, budget, deadline, who must approve.
4. **Options.** 2–3 options from simple to ambitious, with trade-offs.
5. **Recommendation.** Pick one. Explain why. Define the **first milestone** (a pilot in 2–4 weeks).
6. **Plan and risks.** What you need from them, how you measure success, what could go wrong.

## Good discovery questions

- "What happens today when…?"
- "Can you show me a real example?"
- "Who else is affected by this? Who decides?"
- "What have you already tried? Why did it not work?"
- "If we could only fix one part, which part?"
- "What would make this project a failure in your eyes?"

## Push back politely

Customers often ask for a solution ("we need an AI agent") instead of describing the problem. Your job is to find the problem.

> "I understand you want an agent. Can I check the goal first? If the aim is to cut the time to answer staff questions, a search assistant with citations may get you there in 3 weeks with less risk. We can add actions later. Does that fit?"

Also push back on unsafe scope: "I would not let it send emails to patients in phase 1. Let us have staff approve every message first."

## Common mistakes

- Jumping to the technology in the first minute.
- Accepting every requirement. (FDEs must scope.)
- Forgetting success metrics.
- Not summarising. Summarise often: "So far I have heard X, Y, Z. Is that right?"

:::written Practice case: the overwhelmed IT desk
The customer says: "Our IT service desk is overwhelmed. We get 4,000 tickets a month. We want AI to fix it." Write (1) the 8 discovery questions you would ask first, (2) two possible solutions with trade-offs, and (3) your recommended first milestone with a success metric.
--- rubric ---
- Discovery questions cover current workflow, ticket categories/volume breakdown, what "fixed" means, systems (ITSM tool), knowledge base quality, data sensitivity, team and budget, timeline
- At least two distinct options (e.g. self-service answer bot from KB; ticket triage/routing and draft replies for agents; automation of top repetitive requests) with honest trade-offs
- Recommends a narrow first milestone (e.g. auto-triage + suggested replies for the top 3 categories) with a measurable metric (resolution time, deflection rate, agent time saved)
- Mentions human-in-the-loop and a pilot
:::

:::quiz
Q: The customer says "We need a chatbot". What is your best first response?
- [ ] "Sure, which model do you want?"
- [x] "Can you tell me what problem the chatbot would solve, and how you would measure success?"
- [ ] "Chatbots are not useful."
Q: When should you summarise during a case?
- [x] Several times: after discovery, before recommending, and at the end
- [ ] Only at the end
:::
