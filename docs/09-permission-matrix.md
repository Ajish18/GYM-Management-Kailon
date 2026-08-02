# 10. Permission Matrix

## 10.1 Legend

`C`=Create · `R`=Read · `U`=Update · `D`=Delete · `Ex`=Export · `Pr`=Print · `Ap`=Approve · `Rj`=Reject · `As`=Assign · `VO`=View Own · `VA`=View Assigned · `V*`=View All (tenant-wide)

`Y`=Yes · `–`=No · `N/A`=action doesn't apply to this module

Roles: `PSA`=Platform Super Admin · `GO`=Gym Owner · `RC`=Receptionist · `TR`=Trainer · `MB`=Member

All rows below assume the tenant-scoped roles (`GO`,`RC`,`TR`,`MB`) are already restricted to their own `gym_id` — the matrix expresses permissions *within* that boundary. `PSA` permissions are cross-tenant metadata only (see 10.2 note).

## 10.2 Platform Domain

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| Manage gym accounts (activate/suspend) | Y | – | – | – | – |
| Manage subscription plan catalog | Y | – | – | – | – |
| View platform-wide analytics | Y | – | – | – | – |
| Send platform announcements | Y | – | – | – | – |
| Impersonate a tenant (audited, time-boxed) | Y | – | – | – | – |
| View own gym's subscription/billing status | – | Y (VO) | – | – | – |

Note: `PSA` has **no standing R/U/D on tenant data** (members, payments, workouts, messages). Access only via a logged `impersonation_sessions` grant, itself created via this same action set and fully audited.

## 10.3 Gym Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C gym profile | – | Y | – | – | – |
| R gym profile | Y (meta) | Y | Y | Y | Y |
| U gym profile | – | Y | – | – | – |
| D gym | – | – | – | – | – |
| U gym settings (attendance/streak rules) | – | Y | – | – | – |

## 10.4 User / Staff Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C staff (invite Trainer/Receptionist) | – | Y | – | – | – |
| R staff | – | V\* | VO | VO | – |
| U staff | – | Y | VO (own profile only) | VO (own profile only) | – |
| D / deactivate staff | – | Y | – | – | – |
| As role on invite | – | Y | – | – | – |

## 10.5 Trainer Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C trainer profile | – | Y | – | – | – |
| R trainer profile | – | V\* | V\* | VO | VA (assigned trainer's public profile) |
| U trainer profile | – | Y | – | VO | – |
| As trainer to member | – | Y | Y | – | – |
| R trainer workload/performance | – | V\* | – | VO | – |

## 10.6 Member Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C member | – | Y | Y | – | – |
| R member profile | – | V\* | V\* | VA | VO |
| U member profile (full) | – | Y | Y (registration fields) | – | – |
| U member profile (self-service subset) | – | – | – | – | VO |
| D member | – | Y | – | – | – |
| Ex member list/report | – | Y | Y (limited) | VA | – |
| As trainer to member | – | Y | Y | – | – |

## 10.7 Membership Plans

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C/U/D plan catalog | – | Y | – | – | – |
| R plan catalog | – | Y | Y | Y | Y (VO applicable plan) |
| C member membership (assign/renew) | – | Y | Y | – | – |
| U (upgrade/downgrade) | – | Y | Y | – | – |
| Ap/Rj freeze request | – | Y | Y | – | – |
| C freeze request | – | Y | Y | – | VO (request only, requires Ap) |
| R own membership status | – | – | – | – | VO |

## 10.8 Attendance / Check-in-Check-out

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C check-in/out (manual, any member) | – | Y | Y | – | – |
| C check-in/out (self) | – | – | – | – | VO |
| R attendance | – | V\* | V\* | VA | VO |
| Ex attendance report | – | Y | Y | VA | – |
| U/correct attendance record | – | Y | Y | – | – |

## 10.9 Workout Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C/U/D workout template (library) | – | Y | – | Y | – |
| R workout templates | – | Y | – | Y | – |
| As workout plan to member | – | Y | – | VA | – |
| R own/assigned workout plan | – | – | – | VA | VO |
| C workout log entry | – | – | – | VA (on behalf) | VO (self-mark complete) |
| R workout history / PRs | – | – | – | VA | VO |

## 10.10 Diet Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C/U/D diet template (library) | – | Y | – | Y | – |
| As diet plan to member | – | Y | – | VA | – |
| R own/assigned diet plan | – | – | – | VA | VO |
| C diet/adherence notes | – | – | – | VA | – |
| C water intake log | – | – | – | – | VO |

## 10.11 Progress Tracking & Body Measurements

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C measurement (staff-entered) | – | Y | – | VA | – |
| C measurement (self-entry, if gym allows) | – | – | – | – | VO |
| R measurements | – | V\* | – | VA | VO |
| C progress photo | – | – | – | VA | VO |
| R progress photo | – | V\* | – | VA | VO |
| D measurement/photo (correction) | – | Y | – | – | – |

## 10.12 Payment Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C payment / invoice | – | Y | Y | – | – |
| R payment history | – | V\* | V\* | – | VO |
| Ex / Pr invoice, receipt | – | Y | Y | – | VO (own invoices) |
| C discount on transaction | – | Y | Y (within owner-set limit) | – | – |
| Ap large discount override | – | Y | – | – | – |
| R revenue analytics | – | Y | – | – | – |
| C refund (v2) | – | Y | – | – | – |

## 10.13 Expense Management

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C/U/D expense | – | Y | – | – | – |
| R expense | – | Y | – | – | – |
| Ex expense/P&L report | – | Y | – | – | – |

## 10.14 Reports (cross-module)

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| R/Ex/Pr financial reports (revenue, expense, P&L) | – | Y | – | – | – |
| R/Ex/Pr operational reports (attendance, membership, renewal) | – | Y | Y (attendance/today only) | VA | – |
| R/Ex/Pr member-scoped report (own) | – | – | – | – | VO |
| R/Ex/Pr platform reports (MRR, churn, tenant growth) | Y | – | – | – | – |

## 10.15 Notifications

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C gym-wide announcement | – | Y | – | – | – |
| C platform-wide announcement | Y | – | – | – | – |
| R own notifications | – | VO | VO | VO | VO |
| U notification preferences (own) | – | VO | VO | VO | VO |

## 10.16 Messaging

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| C message | – | – | – | VA (assigned members only) | VO (assigned trainer only) |
| R conversation | – | – | – | VA | VO |
| D message (own, before read — soft-retract) | – | – | – | VO | VO |

## 10.17 Dashboard / Analytics

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| R owner dashboard | – | Y | – | – | – |
| R receptionist "today" view | – | – | Y | – | – |
| R trainer dashboard | – | – | – | VO (own assigned-member data) | – |
| R member dashboard | – | – | – | – | VO |
| R platform dashboard | Y | – | – | – | – |

## 10.18 Settings

| Action | PSA | GO | RC | TR | MB |
|---|---|---|---|---|---|
| U gym settings | – | Y | – | – | – |
| U platform plan catalog / feature flags | Y | – | – | – | – |
| U own account settings (password, profile) | – | VO | VO | VO | VO |

## 10.19 Enforcement Notes

- This matrix is the **authorization contract**; it must be implemented as a single, testable policy layer (e.g., a permission-check function per `(role, module, action)` triple) consumed by every API Route Handler — never re-implemented ad hoc per endpoint. See [10-api-design.md](10-api-design.md) §"Authorization" and [11-security-design.md](11-security-design.md).
- `VA` (View Assigned) for Trainers is enforced via the `member_profiles.assigned_trainer_id` relationship, re-checked on every request — reassignment takes effect immediately, including for in-flight messaging/workout access.
- `VO` (View Own) for Members is enforced via `session.userId == resource.member_id`, never via a client-supplied member ID.
