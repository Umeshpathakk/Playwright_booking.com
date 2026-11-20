# Flight Route Search — QA Analysis & Test Design

**Feature under test:** Searching flights based on flight routes  
**Reference product:** [Booking.com Flights](https://www.booking.com/flights/index.en-gb.html)  
**Primary scenario:** DEL → BOM with travel dates (today / tomorrow)

---

## a) Questions to understand the requirement better

### Scope & intent
1. Is the MVP limited to **one-way** search, or must **round-trip** and **multi-city** be included?
2. Should search support **airport codes** (DEL/BOM), **city names**, or both with autocomplete?
3. Are we validating **search form behaviour only**, or also **results accuracy** against airline inventory?
4. Which markets/locales are in scope (en-gb, currency INR, geo-based defaults)?

### Functional rules
5. What happens when origin = destination?
6. Can the user select **past dates**? What validation/error copy is expected?
7. For “today”: if all flights have departed, do we show empty state, next-day suggestions, or an error?
8. Must results **strictly match** the selected departure date, or can nearby dates appear?
9. Are **direct-only**, cabin class, and traveller count part of this story or separate?

### Non-functional
10. What is the acceptable **results load time** (e.g. p95 < 5s)?
11. Which browsers/devices are mandatory (desktop Chrome only for MVP)?
12. Any accessibility requirements (keyboard, screen reader labels)?

### Data & integrations
13. Which flight inventory provider(s) back the search?
14. How should we treat **flaky third-party** empty/partial responses in acceptance?

### Success metrics
15. What does “done” mean for the PO (conversion, search completion rate, zero P0 defects)?

---

## b) Appropriate Minimum Viable Product (MVP)

**MVP goal:** A traveller can search a one-way route and see flights for the chosen date.

| In MVP | Out of MVP (later) |
|--------|--------------------|
| One-way search | Multi-city |
| Origin & destination autocomplete (IATA + city) | Saved searches / recent searches |
| Date picker (today → future; no past dates) | Flexible dates / ±3 day matrix |
| Travellers: 1 adult default | Complex passenger mixes |
| Economy cabin default | Full cabin matrix UX polish |
| Results list with route, date, price, airline | Booking/payment flow |
| Empty / error / loading states | Price alerts, maps, Explore Anywhere |
| Desktop web (Chrome/Firefox) | Native apps, deep personalisation |

**MVP acceptance (business):**  
> Given origin DEL, destination BOM, and a valid future travel date, when the user searches, then at least one matching flight offer is shown (or a clear empty state if none exist), and the results header reflects the selected route and date.

---

## c) Improving tester ↔ Product Owner collaboration

1. **Three Amigos** (PO + Dev + QA) before sprint start — align on examples and edge cases.
2. **Shared Definition of Ready / Done** including testability (stable test IDs, env, data).
3. **Example Mapping** workshops: rules → examples → questions → leftovers.
4. **Living acceptance criteria** in the ticket; QA co-authors AC, PO owns priority.
5. **Bug triage SLA:** Showstopper/High reviewed same day with PO severity confirmation.
6. **Demo with exploratory notes** — QA demos edge cases, not only happy path.
7. **Risk-based testing brief** from PO (what hurts revenue / trust most).
8. Short async updates in the story comments: blockers, assumptions, open questions.

---

## d) Favourite User Story & Acceptance Criteria format

### Format: Connextra story + Gherkin AC + examples table

```text
Title: Search one-way flights by route and date

As a traveller
I want to search flights from an origin airport to a destination for a chosen date
So that I can compare available options before booking

Priority: High | Story points: … | Dependencies: Flight search API
```

**Acceptance Criteria (Gherkin):**

```gherkin
Scenario: Search DEL to BOM for tomorrow
  Given I am on the Flights search page
  And I select trip type "One way"
  When I set origin to "DEL"
  And I set destination to "BOM"
  And I select travel date "tomorrow"
  And I submit the search
  Then I see flight results for route DEL → BOM
  And the results reflect the selected travel date

Scenario Outline: Invalid search inputs
  Given I am on the Flights search page
  When I attempt to search with <condition>
  Then I see validation "<message>"
  And search is not submitted

  Examples:
    | condition              | message                        |
    | missing destination    | Please enter a destination     |
    | origin equals dest     | Origin and destination differ  |
    | past travel date       | Select a valid travel date     |
```

**Collaboration needed with PO**
- Joint Example Mapping session (1 hour)
- PO confirms happy path + top 5 negatives
- Agree on empty-state copy and severity of date mismatches
- PO signs off AC before development starts (Definition of Ready)
- QA adds edge cases; PO accepts/rejects scope

---

## e) Test cases & assumptions

### Assumptions
1. Scope is **flight route search** (form + results), not full booking/payment.
2. **One-way** is the primary path for DEL→BOM date checks; round-trip covered lightly.
3. Origin/destination accept **IATA codes** and city names via autocomplete.
4. **Past dates** are disabled or rejected.
5. Results must show the **selected route and departure date** in summary/header/URL.
6. Inventory can be empty for “today” late in the day — empty state is acceptable if messaging is clear.
7. Tests run against **production Booking.com** as a real-world demo (rate limits / UI changes possible).
8. Default traveller = 1 adult, cabin = Economy unless stated.
9. Locale: English (UK); currency may be geo-dependent (INR observed).
10. Cookie/consent banners may appear and must be dismissed for automation.

### Test case catalogue

| ID | Title | Steps (summary) | Expected result | Priority |
|----|--------|-----------------|-----------------|----------|
| TC-01 | One-way DEL→BOM for **today** | Select One way → DEL → BOM → today → Search | Results (or clear empty state) for DEL→BOM on today’s date | Showstopper |
| TC-02 | One-way DEL→BOM for **tomorrow** | Same as TC-01 with tomorrow | Results for DEL→BOM with tomorrow’s date shown | Showstopper |
| TC-03 | Round-trip DEL→BOM | Select Round trip, outbound+return dates, search | Results show both dates / outbound+return options | High |
| TC-04 | Autocomplete selects correct airport | Type “Delhi” / “Mumbai”, pick DEL / BOM | Fields show correct IATA + airport name | High |
| TC-05 | Swap origin/destination | Set DEL→BOM, click swap | Becomes BOM→DEL | Normal |
| TC-06 | Same origin & destination | Set both to DEL, search | Validation error; no results navigation | High |
| TC-07 | Past date rejected | Try to pick yesterday | Date disabled or validation shown | High |
| TC-08 | Missing destination | Origin only, search | Inline validation; search blocked | High |
| TC-09 | Direct flights only | Enable filter, search DEL→BOM | Only non-stop (or filter applied on results) | Normal |
| TC-10 | Cabin class Business | Select Business, search | Results reflect Business / cabin in query | Normal |
| TC-11 | Multiple travellers | 2 adults + 1 child, search | Traveller count reflected on results | Normal |
| TC-12 | Results date fidelity | Search tomorrow; inspect cards/header/URL | Displayed date matches selection | Showstopper |
| TC-13 | No flights empty state | Search sparse route/date if possible | Friendly empty message, no crash | Normal |
| TC-14 | Loading / network error | Throttle or mock failure (staging) | Loader then retry/error message | Low* |
| TC-15 | Keyboard accessibility | Tab through form, Enter to search | All controls reachable; search works | Low |
| TC-16 | Mobile viewport search | 390px width, complete search | Usable form + results | Normal |

\*Higher if staging supports reliable fault injection.

---

## f) Priority rationale (if a case fails)

| ID | Priority | Why |
|----|----------|-----|
| TC-01 | **Showstopper** | Core value: search today’s flights. Failure blocks primary user journey / release. |
| TC-02 | **Showstopper** | Same critical path for near-term travel; highest volume use case. |
| TC-12 | **Showstopper** | Wrong dates = booking wrong inventory; trust/revenue risk. |
| TC-03 | **High** | Round-trip is major traffic; broken RT hurts conversion but one-way may still ship with waiver. |
| TC-04 | **High** | Wrong airport selection causes wrong-route bookings. |
| TC-06 | **High** | Invalid search must not hit API / confuse users. |
| TC-07 | **High** | Past-date bookings are invalid; compliance/UX risk. |
| TC-08 | **High** | Incomplete search must fail safely. |
| TC-05 | **Normal** | Convenience feature; workaround exists (re-enter fields). |
| TC-09 | **Normal** | Filter enhancement; search still works without it. |
| TC-10 | **Normal** | Secondary segment vs Economy majority. |
| TC-11 | **Normal** | Important but not MVP-blocking for 1-adult path. |
| TC-13 | **Normal** | UX quality; not a functional blocker if rare. |
| TC-16 | **Normal** | Mobile matters, but desktop MVP may proceed with known gap. |
| TC-14 | **Low** | Resilience; hard to reproduce on prod demo. |
| TC-15 | **Low** | A11y debt tracked separately unless legal mandate. |

**Release rule of thumb:** Any **Showstopper** fail → do not release. **High** → fix or PO-signed waiver. **Normal/Low** → backlog with severity.

---

## g) Types of testing applicable

| Type | Application to this feature |
|------|-----------------------------|
| **Functional / acceptance** | Route, date, trip type, validation rules |
| **UI / UX** | Form layout, date picker, results clarity |
| **Integration** | Search UI ↔ flight offers API |
| **Regression** | Autocomplete, swap, filters after releases |
| **Exploratory** | Odd routes, timezone boundaries, late-night “today” |
| **Boundary / negative** | Past dates, same airports, empty fields, max travellers |
| **Compatibility** | Chrome, Firefox, Safari; desktop + mobile viewports |
| **Performance** | Time-to-first-result, search API latency |
| **Accessibility** | Labels, focus order, contrast, screen reader |
| **Security** | Input sanitisation in autocomplete; no sensitive data in URLs beyond needed params |
| **Usability** | Clarity of empty states and date confirmation |
| **Automation (E2E)** | Smoke: DEL→BOM today/tomorrow (see Section 2) |
| **Visual** (optional) | Date picker / results snapshot diffs |

---

## h) Exit criteria for testing this requirement

Testing may conclude when **all** of the following are true:

1. **All Showstopper and High** test cases executed and **passed** (or High waived in writing by PO).
2. **No open Showstopper/High defects** related to route search or date fidelity.
3. **MVP AC signed off** by PO in the sprint review / ticket.
4. **Automated smoke suite** (DEL→BOM today & tomorrow + at least one negative) green on CI or local gate.
5. **Exploratory charter** completed (≥1 session) with notes attached to the story.
6. **Known issues** documented with severity, workaround, and owner.
7. **Non-functional smoke:** results page renders within agreed SLA on reference env (e.g. < 8s under normal load).
8. **Test evidence** stored (report, screenshots/video for Showstopper paths).

---

## Section 2 — Automation candidates

**Framework chosen:** Playwright (TypeScript) — strong for modern web UIs, auto-waits, tracing, parallel runs.

### Most suitable for automation
- TC-01, TC-02, TC-12 (date fidelity) — stable, high value, repeatable  
- TC-06, TC-08 — negative validation  
- TC-05 — swap control  
- TC-03 — round-trip smoke (optional)

### Less suitable / keep manual
- TC-14 (fault injection needs staging)  
- TC-15 deep a11y (pair with axe + manual)  
- Pure UX judgment calls  

### Implemented automated suite (this repo)
1. **a1** One-way DEL → BOM for **today** — assert route + date on results (`@smoke`)  
2. **a2** One-way DEL → BOM for **tomorrow** — assert route + date on results (`@smoke`)  
3. **b1** Form keeps DEL origin + Mumbai destination after selection  
4. **b2** Results URL encodes `depart`, `type=ONEWAY`, `from=DEL`, `to=BOM`  
5. **b3** Direct / stops filters available on search results  

### Commands to run

```bash
# First-time setup
npm install
npx playwright install chromium

# All tests
npm test

# Smoke only (today + tomorrow)
npm run test:smoke

# Headed browser
npm run test:headed

# Playwright UI mode
npm run test:ui

# Open HTML report
npm run test:report
```

