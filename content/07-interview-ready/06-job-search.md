# The job search: CV, referrals, applications and offers
<!-- order: 2.8 -->
<!-- minutes: 50 -->

Start applying when your mock readiness score is about 50% or more and you have one shipped project: the job search takes weeks, and early interviews are practice too. Use the **Job search** page in this app to track every application.

## Position your background

Your story: **"I build and run the platforms that researchers use — cloud, Kubernetes, HPC, secure research environments — and now I build the software and AI systems on top, inside the customer's world."** Infrastructure plus compliance plus customer-facing work is close to what many FDE roles want; the gap you close with the projects is application code and LLM systems.

## The CV

- One to two pages. A three-line summary at the top in the words of the job post.
- Bullets as **action + what + result with a number**: "Automated cluster deployments with Ansible and Helm, cutting new-environment set-up from 3 days to 2 hours."
- A **Projects** section with your three portfolio projects, each with a link and one result.
- Keep it honest. Every line is a question you may get in the deep dive.
- Tailor the summary and the order of bullets for each application (10 minutes, not 2 hours).

## LinkedIn

- Headline: what you do and want, e.g. "Cloud & research platforms engineer → Forward Deployed Engineer | Kubernetes, AWS, LLM systems".
- Turn on "open to work" for recruiters only, if you do not want it public.
- Post the project write-ups (lesson 4b.5).

## Referrals beat cold applications

A referral or a direct message to the hiring manager gets a reply far more often than a cold application. Aim for at least half of your applications through a person.

> "Hi Priya — I saw you lead the FDE team at Acme. I build secure research computing platforms (Kubernetes, AWS, a Trusted Research Environment) and recently shipped an LLM assistant with evals for public HPC docs (link). Your work with NHS trusts is exactly the kind of deployment I want to do. Would you be open to a 15-minute chat about the team, or to referring me for the London FDE role?"

Short, specific, one clear ask, a link to evidence.

## UK pay: what the listings show

Examples from London FDE job listings in autumn 2026 (always check current listings; ranges vary hugely by company type):

| Kind of role in the listing | Advertised base salary |
|---|---|
| Small company, generalist FDE | about £60k |
| Platform consultancy roles (e.g. Foundry, Salesforce) | about £70k–£95k |
| AI platform / start-up FDE | about £80k–£130k |
| Recruiter listing for a fast-growing software company | £150k–£300k |

AI labs and well-funded start-ups often add **equity**, which can be a large part of total pay. Self-reported data on levels.fyi is a useful second source for total compensation at specific companies. Remember that a listing range is not an offer.

## Negotiation basics

- When asked for expectations early, give a **researched range** for the role, not your current salary: "Based on similar FDE roles in London, I am looking at £X–£Y base, depending on the full package."
- Get every offer **in writing**, with base, bonus, equity (amount, vesting schedule, cliff), pension, notice period, travel and on-call.
- Negotiate on the whole package. It is normal and polite to ask: "Is there flexibility on the base?" Competing offers or interview processes are the strongest reason for an increase; never invent one.
- Ask for time to decide (a few days is normal).

:::exercise Compare offers by first-year and average value
Write `yearly_values(offer, years=4)` that returns a list with the value of the offer in each year: `base + bonus + equity for that year + pension` where `pension = base * pension_pct`. Equity is a total grant `equity_total` vesting evenly over `vest_years` with a `cliff_years` cliff: nothing vests before the cliff; at the cliff, all equity for the cliff period vests at once; then it vests evenly each year. A sign-on bonus `sign_on` is added in year 1 only. Round each year to whole pounds.
--- starter ---
def yearly_values(offer, years=4):
    return [offer["base"]] * years
--- tests ---
a = {"base": 100000, "bonus": 10000, "pension_pct": 0.05, "equity_total": 0, "vest_years": 4, "cliff_years": 1, "sign_on": 0}
assert yearly_values(a) == [115000, 115000, 115000, 115000]
b = {"base": 90000, "bonus": 0, "pension_pct": 0.08, "equity_total": 80000, "vest_years": 4, "cliff_years": 1, "sign_on": 5000}
assert yearly_values(b) == [122200, 117200, 117200, 117200]
c = {"base": 100000, "bonus": 0, "pension_pct": 0.0, "equity_total": 40000, "vest_years": 4, "cliff_years": 2, "sign_on": 0}
assert yearly_values(c) == [100000, 120000, 110000, 110000]
assert yearly_values(c, years=5)[4] == 100000
--- solution ---
def yearly_values(offer, years=4):
    per_year = offer["equity_total"] / offer["vest_years"] if offer["vest_years"] else 0
    values = []
    for year in range(1, years + 1):
        if year < offer["cliff_years"] or year > offer["vest_years"]:
            equity = 0
        elif year == offer["cliff_years"]:
            equity = per_year * offer["cliff_years"]  # everything held back by the cliff vests at once
        else:
            equity = per_year
        total = offer["base"] + offer["bonus"] + equity + offer["base"] * offer["pension_pct"]
        if year == 1:
            total += offer["sign_on"]
        values.append(round(total))
    return values
:::

:::written Your outreach message
Write a referral or hiring-manager message (under 100 words) for a real FDE role you want.
--- rubric ---
- Addressed to a specific person, with a reason for choosing them
- One or two lines of specific, relevant evidence, with a link
- Shows real knowledge of the company or team
- One clear, small ask
- Under 100 words, friendly and professional
:::

:::quiz
Q: A recruiter asks for your salary expectations in the first call. Best answer?
- [ ] Your current salary
- [x] A researched range for this role and location, and that it depends on the full package
- [ ] "Whatever you think is fair"
Q: Which application is most likely to get a reply?
- [ ] A cold application through the careers page
- [x] A referral from an employee, or a short, specific message to the hiring manager with evidence
Q: An offer has equity with a 1-year cliff. What does that mean?
- [x] No equity vests if you leave before 1 year; at 1 year the first year's equity vests at once
- [ ] The equity is paid in year 1
:::

:::cards Job search
CV bullet formula :: Action + what + result with a number.
Salary expectations early :: Give a researched range for the role, not your current pay.
Vesting cliff :: Nothing vests before the cliff; the cliff period's equity vests at once on the cliff date.
Best channel :: Referrals and direct messages to hiring managers.
Offer checklist :: Base, bonus, equity and vesting, pension, notice period, travel, on-call — all in writing.
:::
