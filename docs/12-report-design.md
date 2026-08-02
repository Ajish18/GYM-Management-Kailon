# 13. Report Design

Every report in this catalog supports, uniformly: **Search**, **Filters** (listed per report), **Sorting** (any visible column), **Export** (CSV, Excel, PDF), and **Print** (browser-print-optimized layout). Access is scoped per [09-permission-matrix.md](09-permission-matrix.md) §10.14.

## 13.1 Report Catalog

| # | Report | Audience | Grain | Key Columns |
|---|---|---|---|---|
| 1 | Owner Summary Report | Owner | Monthly | Revenue, expenses, net profit, new members, churned members, avg attendance % |
| 2 | Trainer Performance Report | Owner, Trainer(own) | Per trainer, monthly | Assigned members, retention %, avg attendance of assigned members, workout adherence %, PRs logged |
| 3 | Member Report | Owner, Receptionist, Trainer(assigned) | Per member | Status, plan, join date, expiry date, trainer, last attendance, dues |
| 4 | Attendance Report | Owner, Receptionist, Trainer(assigned) | Per member, per day/range | Check-in/out times, duration, method, streak status |
| 5 | Revenue Report | Owner | Per transaction / monthly rollup | Invoice #, member, plan, amount, method, discount, date |
| 6 | Expense Report | Owner | Per expense / category rollup | Category, amount, date, vendor note |
| 7 | Workout Report | Owner, Trainer(assigned) | Per member, per plan | Plan name, adherence % (completed/skipped/partial), PR count |
| 8 | Diet Report | Owner, Trainer(assigned) | Per member, per plan | Plan name, adherence notes count, avg water intake |
| 9 | Membership Report | Owner, Receptionist | Per plan | Active count, revenue by plan, avg tenure |
| 10 | Renewal Report | Owner, Receptionist | Per member | Members expiring in next 7/15/30 days, renewed vs lapsed |
| 11 | Inactive Member Report | Owner | Per member | Active membership but attendance below threshold in trailing 14 days |
| 12 | Streak Report | Owner, Trainer(assigned) | Per member | Current streak, longest streak, freezes used, badges earned |
| 13 | Leaderboard Report | Owner, Members(opted-in view) | Per member (ranked) | Rank, name, current streak, longest streak |
| 14 | Pending Dues Report | Owner, Receptionist | Per member | Invoice #, amount due, days overdue |
| 15 | Profit & Loss Summary | Owner | Monthly | Total revenue, total expenses, net profit, margin % |

## 13.2 Report Specification Template

Each report is implemented against this shared spec:

| Field | Description |
|---|---|
| Data source | Named DB view or query in [08-database-design.md](08-database-design.md), tenant-scoped by `gym_id` |
| Default date range | Report-specific sensible default (e.g., current month for Revenue; next 30 days for Renewal) |
| Filters | Documented per report below |
| Search fields | Name/phone/email/invoice-number as applicable |
| Sortable columns | All displayed columns |
| Pagination | Screen view paginated (25/50/100); export includes full filtered set (async if > 5,000 rows) |
| Export formats | CSV (raw data), Excel (formatted, includes summary header), PDF (print-styled with gym branding/logo) |
| Empty state | Explicit "No data for this range/filter" state with a suggestion to adjust filters |
| Role scoping | Applied at the query layer before pagination — a Trainer's report never includes non-assigned members even via export |

## 13.3 Per-Report Filters

| Report | Available Filters |
|---|---|
| Owner Summary | month/year |
| Trainer Performance | trainerId, dateRange |
| Member | status, trainerId, planId, joinDateRange |
| Attendance | memberId, trainerId, dateRange, method |
| Revenue | dateRange, planId, paymentMethod |
| Expense | dateRange, categoryId |
| Workout | memberId, trainerId, planStatus, dateRange |
| Diet | memberId, trainerId, dateRange |
| Membership | planId, status |
| Renewal | expiryWindow (7/15/30 days), status(renewed/lapsed) |
| Inactive Member | attendanceThreshold (default from gym settings), trailingDays |
| Streak | trainerId, minStreak |
| Leaderboard | none (always current, opted-in only) |
| Pending Dues | daysOverdueMin |
| Profit & Loss | month/year, comparePriorPeriod (boolean) |

## 13.4 Export & Print Design Notes

- **CSV**: raw, machine-readable, UTF-8, header row matches on-screen column labels.
- **Excel (.xlsx)**: includes a summary header block (report name, gym name, generated-by, generated-at, filter summary) above the data table; numeric/date formatting applied natively.
- **PDF**: gym-branded header (logo, name), filter summary, paginated table, footer with page number and generation timestamp — same template family used for Invoices/Receipts for visual consistency.
- **Print**: browser `@media print` stylesheet strips navigation/chrome, forces the PDF-equivalent layout.
- All exports are logged to `audit_logs` (who exported what, with what filters, when) per NFR-OBS-002 / FR-RPT-003.
