# Payroll Schedule & Basis Persistence

The payroll calculator now persists the **pay basis** and **release schedule** to Supabase when you save a payroll run.

---

## Database columns added to `payroll_runs`

| Column | Type | Purpose |
|---|---|---|
| `pay_basis` | text | `"hourly"`, `"daily"`, or `"monthly"` |
| `pay_frequency` | text | `"monthly"` or `"semi-monthly"` |
| `payout_day` | text | Day of month for monthly runs (e.g. `"15"`, `"30"`, `"EOM"`) |
| `second_payout_day` | text | Second payout day for semi-monthly (e.g. `"30"`) |
| `pay_period_label` | text | User-entered pay period string (e.g. `"May 2026"`) |

These columns are also written into the `notes` field as a human-readable summary.

---

## Migration

Run this SQL in the Supabase SQL Editor **once** before using the save feature:

```sql
alter table payroll_runs add column if not exists pay_basis text;
alter table payroll_runs add column if not exists pay_frequency text;
alter table payroll_runs add column if not exists payout_day text;
alter table payroll_runs add column if not exists second_payout_day text;
alter table payroll_runs add column if not exists pay_period_label text;
```

Location: `docs/migration-payroll-schedule.sql`

---

## How it works

### Frontend (`frontend/app/payroll/new/page.tsx`)

1. User selects **pay basis** (per hour / per day / monthly)
2. User configures **release schedule** (monthly with one payout day, or semi-monthly with two payout days)
3. User enters employee name, rate, hours/days, overtime, allowances, deductions
4. Clicks **Calculate final payroll** → backend computes
5. **NEW:** After calculation succeeds, a **"Save to Supabase"** button appears
6. Clicks **Save to Supabase** → `POST /api/payroll/save` with all fields + schedule/basis

### Backend (`backend/src/routes/payroll.ts`)

**Endpoint:** `POST /api/payroll/save`

The save endpoint:
- Gets the default organization (`Demo Company`)
- Generates a unique run code (`PR-YYYY-MM-<timestamp>`)
- Computes pay period dates (defaults to current month)
- Computes `payout_date` from the schedule:
  - **Monthly:** uses `payoutDay`
  - **Semi-monthly:** uses `secondCutoffDay`
- Inserts a row into `payroll_runs` with:
  - Status: `Draft`
  - All totals (gross, deductions, net, employer cost)
  - Schedule fields: `pay_basis`, `pay_frequency`, `payout_day`, `second_payout_day`
  - A descriptive `notes` field
- Finds the employee by name (if provided) and inserts a matching `payroll_items` row

---

## Example saved run

```json
{
  "run_code": "PR-2026-06-1718845123456",
  "pay_period_start": "2026-06-01",
  "pay_period_end": "2026-06-30",
  "payout_date": "2026-06-30",
  "status": "Draft",
  "total_gross_pay": 19200,
  "total_net_pay": 17260,
  "pay_basis": "hourly",
  "pay_frequency": "semi-monthly",
  "payout_day": null,
  "second_payout_day": "30",
  "pay_period_label": "May 2026",
  "notes": "Pay basis: hourly. Release schedule: semi-monthly on days 15 and 30."
}
```

---

## Viewing saved runs

The **Payroll** page (`/payroll`) already fetches runs from `payroll_runs` via `/api/data/payroll-runs`. After saving, refresh that page to see your new run listed with:
- Run code
- Period dates
- Payout date (derived from schedule)
- Gross/net amounts
- Status

---

## Next steps (optional enhancements)

- Add a **"View saved runs"** link on the calculator success message
- Display the schedule/basis on the payroll list page (currently shows run_code, dates, gross, status)
- Add an "Approve" action that changes status from `Draft` → `Approved`
- Add a bulk save for multiple employees at once
