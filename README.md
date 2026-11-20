# Booking.com Flight Route Search — Playwright Automation

QA analysis and Playwright (TypeScript) E2E suite for **searching flights by route**, demonstrated on:

https://www.booking.com/flights/index.en-gb.html

## What’s included

| Path | Purpose |
|------|---------|
| `docs/QA_REQUIREMENT_ANALYSIS.md` | Full answers to requirement questions (a–h), MVP, test cases, priorities, exit criteria |
| `pages/FlightsSearchPage.ts` | Page Object for the flights search form + results assertions |
| `tests/flight-search.spec.ts` | Automated Case 1 scenarios (today / tomorrow DEL→BOM + extras) |
| `utils/dates.ts` | Date helpers for the Booking calendar and URL checks |

## Prerequisites

- Node.js 18+
- Chromium (installed via Playwright)

## Setup

```bash
npm install
npx playwright install chromium
```

## Run tests

```bash
# All tests
npm test

# Smoke only (today + tomorrow)
npm run test:smoke

# Headed (watch the browser)
npm run test:headed

# HTML report
npm run test:report
```

## Automated coverage (Case 1)

| Test | Requirement mapping |
|------|---------------------|
| `a1` DEL→BOM **today** | Core: selected date on results |
| `a2` DEL→BOM **tomorrow** | Core: selected date on results |
| `b1` Form retains DEL + Mumbai | Autocomplete / selection fidelity |
| `b2` URL has `depart`, `ONEWAY`, DEL/BOM | Date + trip type encoded in results |
| `b3` Direct flights filter on results | Extra results-page check |

Assertions use **results URL (`depart=YYYY-MM-DD`)**, **travel-date control text**, and **result card date labels** (e.g. `DEL · 20 Nov`).

## Notes

- Runs against **live Booking.com** — UI/copy and inventory can change.
- Consent banners are dismissed when present.
- Origin may be geo-defaulted to DEL; the page object skips re-selection when already correct.

## Latest local run

```text
5 passed
```
