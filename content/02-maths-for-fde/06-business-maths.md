# Business maths for the customer
<!-- minutes: 45 -->

Customers buy outcomes, and their budget holders think in money. An FDE must turn "the model is 12% more accurate" into "this saves £180,000 a year and pays for itself in 5 months". This lesson is the arithmetic for that. No formulas beyond school maths, but you must do it **quickly and correctly, out loud**.

## Value from time saved

$$\text{annual value} = \text{tasks per year} \times \text{minutes saved per task} \div 60 \times \text{cost per hour}$$

Example: 40 staff each handle 25 tickets a day, 220 working days. The assistant saves 3 minutes per ticket. A loaded staff cost (salary plus overheads) is £35 per hour.
$40 \times 25 \times 220 = 220{,}000$ tickets; $220{,}000 \times 3 / 60 = 11{,}000$ hours; $11{,}000 \times 35 = $ **£385,000 per year**.

Be honest about this number: time saved is only value if the staff do something useful with it (handle more tickets, shorter queues, less overtime). Say so.

## ROI and payback

- **ROI** (return on investment) $= \dfrac{\text{gain} - \text{cost}}{\text{cost}}$. A cost of £100k and a gain of £250k is an ROI of 150%.
- **Payback period** = the time until total gains equal total costs. With an up-front cost $C$ and a monthly net gain $g$: $C / g$ months.

## Percent vs percentage points

Accuracy goes from 80% to 88%. That is **8 percentage points**, and a **10% relative** increase ($8 / 80$). The error rate went from 20% to 12%: a **40% relative fall** in errors. Choose the honest framing and say which one you use.

## Unit economics of an LLM feature

$$\text{cost per request} = \frac{\text{input tokens} \times \text{input price} + \text{output tokens} \times \text{output price}}{1{,}000{,}000}$$

with prices per million tokens. Then multiply by requests per month. Add retrieval, hosting and human review. Compare with the value per request.

## Cloud vs on-premises: break-even

Buying a GPU server costs a lot up front and a little per month (power, space, support). Renting costs nothing up front and more per month. The break-even month is when the total costs are equal:

$$\text{months} = \frac{\text{purchase price}}{\text{cloud cost per month} - \text{on-prem running cost per month}}$$

This only makes sense if the hardware is **used enough**. At 20% utilisation, cloud usually wins; at 70%+ for years, owning often wins. Say the utilisation assumption out loud.

:::exercise Value and payback
Write `annual_value(staff, tasks_per_day, days, minutes_saved, cost_per_hour)` and `payback_months(upfront, monthly_cost, annual_value)`. Payback is the up-front cost divided by the **net** monthly gain (annual value / 12 minus monthly running cost), rounded to 1 decimal place. If the net monthly gain is zero or less, return `None` (it never pays back).
--- starter ---
def annual_value(staff, tasks_per_day, days, minutes_saved, cost_per_hour):
    return staff * tasks_per_day * minutes_saved * cost_per_hour

def payback_months(upfront, monthly_cost, annual_value):
    return upfront / (annual_value / 12)
--- tests ---
assert annual_value(40, 25, 220, 3, 35) == 385000
v = annual_value(10, 20, 200, 6, 30)
assert v == 120000
assert payback_months(60000, 2000, 120000) == 7.5
assert payback_months(10000, 10000, 120000) is None
assert payback_months(0, 0, 12) == 0.0
--- solution ---
def annual_value(staff, tasks_per_day, days, minutes_saved, cost_per_hour):
    hours = staff * tasks_per_day * days * minutes_saved / 60
    return hours * cost_per_hour

def payback_months(upfront, monthly_cost, annual_value):
    net = annual_value / 12 - monthly_cost
    if net <= 0:
        return None
    return round(upfront / net, 1)
:::

:::exercise Cost per month of an LLM feature
Write `monthly_cost(requests_per_day, in_tokens, out_tokens, price_in, price_out, days=30)` where prices are in pounds per **million** tokens. Return the cost in pounds, rounded to 2 decimal places.
--- starter ---
def monthly_cost(requests_per_day, in_tokens, out_tokens, price_in, price_out, days=30):
    return requests_per_day * (in_tokens * price_in + out_tokens * price_out) * days
--- tests ---
assert monthly_cost(1000, 3000, 500, 2.4, 12.0) == 396.0
assert monthly_cost(0, 3000, 500, 2.4, 12.0) == 0.0
assert monthly_cost(200, 10000, 1000, 0.8, 4.0, days=22) == 52.8
--- solution ---
def monthly_cost(requests_per_day, in_tokens, out_tokens, price_in, price_out, days=30):
    per_request = (in_tokens * price_in + out_tokens * price_out) / 1_000_000
    return round(per_request * requests_per_day * days, 2)
:::

:::exercise Cloud or buy?
Write `break_even_months(purchase, onprem_monthly, cloud_monthly)` that returns the month (rounded **up** to a whole number) when owning becomes cheaper than renting, or `None` if it never does.
--- starter ---
def break_even_months(purchase, onprem_monthly, cloud_monthly):
    return purchase / cloud_monthly
--- tests ---
assert break_even_months(250000, 3000, 13000) == 25
assert break_even_months(100000, 5000, 5000) is None
assert break_even_months(100000, 6000, 5000) is None
assert break_even_months(1000, 0, 1000) == 1
--- solution ---
import math

def break_even_months(purchase, onprem_monthly, cloud_monthly):
    saving = cloud_monthly - onprem_monthly
    if saving <= 0:
        return None
    return math.ceil(purchase / saving)
:::

:::quiz
Q: Accuracy rises from 60% to 75%. Which statement is correct?
- [ ] Accuracy rose by 15%
- [x] Accuracy rose by 15 percentage points, which is a 25% relative increase
- [ ] Errors fell by 15%
> Errors fell from 40% to 25%: a 37.5% relative fall. Always say which kind of percentage you mean.
Q: A project costs £120k up front and nets £10k per month. What is the payback period?
- [x] 12 months
- [ ] 10 months
- [ ] 120 months
Q: Why is "staff time saved" not automatically money saved?
- [x] Because the value only appears if the time is used for something else of value, or if costs actually fall
- [ ] Because staff costs are not real
:::

:::cards Business maths
ROI :: (gain − cost) ÷ cost.
Payback period :: Up-front cost ÷ net gain per month.
Percentage points vs percent :: 80% → 88% is +8 points, a 10% relative increase.
Loaded cost per hour :: Salary plus overheads (pension, employer taxes, office, IT), per working hour.
Break-even of buying hardware :: Purchase price ÷ (cloud monthly − on-prem monthly); only valid at high utilisation.
:::

:::written The business case in five sentences
A hospital trust's clinical coding team (12 people) spends about 8 minutes per discharge summary looking up codes. They process 60,000 summaries a year at a loaded cost of £32 per hour. A tool you built cuts this to 5 minutes. It costs £40,000 to deploy and £1,500 per month to run. Write the business case for the finance director in five sentences, with the numbers.
--- rubric ---
- Correct annual time saved: 60,000 × 3 min = 3,000 hours, about £96,000 a year
- Correct payback: net monthly gain about £8,000 − £1,500 = £6,500, so about 6 months
- States assumptions (loaded cost, adoption) and that the value depends on what staff do with the time (backlog, fewer agency staff, coding accuracy)
- Mentions risks or quality (coding accuracy, audit, human review)
- Plain language, no jargon, five sentences
:::
