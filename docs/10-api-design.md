# 11. API Design

## 11.1 Conventions

- **Style**: REST-ish JSON over HTTPS, implemented as Next.js Route Handlers under `/api/v1/...`.
- **Auth**: every endpoint except `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/password-reset/*`, and `GET /api/v1/invites/:token` requires a valid JWT (via httpOnly cookie). Response `401` if missing/invalid/expired.
- **Authorization**: enforced per the [09-permission-matrix.md](09-permission-matrix.md) via a shared `authorize(role, module, action, resourceScope)` check inside each handler. Response `403` if authenticated but not permitted.
- **Tenant scoping**: `gym_id` is never accepted from the client for tenant roles; it is always derived from the session. Any request body/query field named `gymId` from a tenant-role caller is ignored/rejected, not trusted.
- **Pagination**: cursor-agnostic offset pagination for v1 — `?page=1&pageSize=25` (max `pageSize=100`), response includes `{ data, page, pageSize, total, totalPages }`.
- **Filtering**: `?filter[field]=value`, module-specific allowed filter fields documented per endpoint group below.
- **Searching**: `?search=<term>` applies to a documented search-field set per resource (matches [08-database-design.md](08-database-design.md) "Search fields").
- **Sorting**: `?sortBy=<field>&sortDir=asc|desc`, allowlisted fields only (prevents arbitrary-column sort injection).
- **Validation**: every request body validated against a Zod schema shared with the frontend form layer; failures return `422` with `{ errors: [{ field, message }] }`.
- **Idempotency**: financial mutation endpoints (`POST /payments`) accept an optional `Idempotency-Key` header to prevent duplicate charge recording on retry.

## 11.2 Standard Response Envelope

```
Success:  { "success": true,  "data": <resource|array>, "meta"?: {...} }
Error:    { "success": false, "error": { "code": "STRING_CODE", "message": "human readable", "details"?: [...] } }
```

## 11.3 Standard Error Codes

| HTTP | code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 401 | `UNAUTHENTICATED` | Missing/invalid/expired session |
| 403 | `FORBIDDEN` | Authenticated but not permitted for this role/scope |
| 404 | `NOT_FOUND` | Resource doesn't exist or is outside caller's tenant/assignment scope (404, not 403, to avoid cross-tenant existence leaks) |
| 409 | `CONFLICT` | e.g., duplicate phone in gym, overlapping open attendance session |
| 422 | `VALIDATION_ERROR` | Zod schema failure, field-level detail returned |
| 429 | `RATE_LIMITED` | Login/API rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled server error (logged with correlation ID, generic message to client) |

Note on 404 vs 403: a Trainer requesting a member outside their assignment, or any tenant role requesting a resource in another `gym_id`, receives `404 NOT_FOUND` — the query itself is scoped, so the row is invisible rather than visible-but-forbidden. This avoids confirming resource existence across tenant/assignment boundaries.

## 11.4 Endpoint Groups

### Authentication (`/api/v1/auth`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | Public | email/phone + password → sets session cookies |
| POST | `/auth/refresh` | Refresh cookie | rotates refresh token |
| POST | `/auth/logout` | Session | revokes current session |
| POST | `/auth/password-reset/request` | Public | rate-limited |
| POST | `/auth/password-reset/confirm` | Public (token) | |
| GET | `/auth/sessions` | Session | list own active sessions |
| DELETE | `/auth/sessions/:id` | Session | revoke a specific session |

### Invites (`/api/v1/invites`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/invites` | GO | body: `{email, role}` |
| GET | `/invites/:token` | Public | validates token, returns role/gym for signup form |
| POST | `/invites/:token/accept` | Public | body: `{fullName, password}` → creates user, consumes token |
| GET | `/invites` | GO | list pending invites |
| DELETE | `/invites/:id` | GO | revoke pending invite |

### Gym (`/api/v1/gym`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/gym` | GO,RC,TR,MB | own gym profile |
| PATCH | `/gym` | GO | update profile |
| GET | `/gym/settings` | GO | |
| PATCH | `/gym/settings` | GO | attendance/streak/invoice config |

### Staff (`/api/v1/staff`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/staff` | GO | filter=`role`, search=name/email |
| PATCH | `/staff/:id` | GO | role/status/profile update |
| POST | `/staff/:id/deactivate` | GO | revokes sessions |
| GET | `/staff/me` | RC,TR | own profile |
| PATCH | `/staff/me` | RC,TR | limited self-service fields |

### Members (`/api/v1/members`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/members` | GO,RC | create member (+ optional initial membership/payment in one transaction) |
| GET | `/members` | GO,RC,TR(scoped) | filter=`status,trainerId,planId`, search=name/phone/email, sort=`name,joinDate,expiryDate` |
| GET | `/members/:id` | GO,RC,TR(assigned),MB(self) | 404 if outside scope |
| PATCH | `/members/:id` | GO,RC | full update |
| PATCH | `/members/me` | MB | self-service subset only (validated allowlist) |
| DELETE | `/members/:id` | GO | soft delete |
| POST | `/members/:id/assign-trainer` | GO,RC | body: `{trainerId}` |
| GET | `/members/export` | GO,RC(limited),TR(scoped) | `?format=csv|xlsx|pdf` |

### Membership Plans & Memberships (`/api/v1/membership-plans`, `/api/v1/members/:id/membership`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST/GET/PATCH/DELETE | `/membership-plans[/:id]` | GO | plan catalog CRUD |
| GET | `/members/:id/membership` | GO,RC,TR(assigned),MB(self) | current + history |
| POST | `/members/:id/membership/renew` | GO,RC | body: `{planId, paymentMethod, amount, discount?}` — transactional (membership + invoice + payment) |
| POST | `/members/:id/membership/upgrade` | GO,RC | |
| POST | `/members/:id/membership/freeze` | GO,RC | body: `{startDate, endDate, reason}` |
| POST | `/members/:id/membership/freeze/:freezeId/approve` | GO | |

### Attendance (`/api/v1/attendance`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/attendance/check-in` | GO,RC,MB(self) | body: `{memberId}` (staff) or none (self, from session) |
| POST | `/attendance/check-out` | GO,RC,MB(self) | body: `{memberId}` or self |
| GET | `/attendance` | GO,RC,TR(scoped),MB(self) | filter=`memberId,dateFrom,dateTo` |
| GET | `/attendance/calendar` | GO,RC,TR(scoped),MB(self) | `?memberId&month=YYYY-MM` |
| GET | `/attendance/export` | GO,RC,TR(scoped) | |

### Workouts (`/api/v1/workout-templates`, `/api/v1/workout-plans`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST/GET/PATCH/DELETE | `/workout-templates[/:id]` | GO,TR | gym template library |
| POST | `/workout-plans` | GO,TR(assigned) | assign template/custom plan to member |
| GET | `/workout-plans` | GO,TR(scoped),MB(self) | filter=`memberId,status` |
| POST | `/workout-plans/:id/logs` | TR(assigned),MB(self) | daily log entry |
| GET | `/workout-plans/:id/logs` | GO,TR(scoped),MB(self) | history |
| GET | `/members/:id/personal-records` | GO,TR(assigned),MB(self) | |

### Diet (`/api/v1/diet-templates`, `/api/v1/diet-plans`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST/GET/PATCH/DELETE | `/diet-templates[/:id]` | GO,TR | |
| POST | `/diet-plans` | GO,TR(assigned) | |
| GET | `/diet-plans` | GO,TR(scoped),MB(self) | |
| POST | `/diet-plans/:id/water-log` | MB(self) | |
| POST | `/diet-plans/:id/notes` | TR(assigned) | |

### Progress (`/api/v1/members/:id/measurements`, `/api/v1/members/:id/progress-photos`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/members/:id/measurements` | GO,TR(assigned),MB(self, if allowed) | |
| GET | `/members/:id/measurements` | GO,TR(assigned),MB(self) | filter=`dateFrom,dateTo` |
| POST | `/members/:id/progress-photos` | TR(assigned),MB(self) | returns signed upload URL then confirms |
| GET | `/members/:id/progress-photos` | GO,TR(assigned),MB(self) | |

### Payments (`/api/v1/invoices`, `/api/v1/payments`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/payments` | GO,RC | body: `{memberId, invoiceId?, amount, method, discount?}`, `Idempotency-Key` supported |
| GET | `/payments` | GO,RC,MB(self) | filter=`memberId,method,dateFrom,dateTo` |
| GET | `/invoices/:id` | GO,RC,MB(self) | |
| GET | `/invoices/:id/pdf` | GO,RC,MB(self) | signed download URL |
| GET | `/dues` | GO,RC | gym-wide pending dues list |

### Expenses (`/api/v1/expenses`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST/GET/PATCH/DELETE | `/expenses[/:id]` | GO | filter=`categoryId,dateFrom,dateTo` |
| GET | `/expenses/report` | GO | monthly/category summary |

### Reports (`/api/v1/reports/:reportType`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/reports/:reportType` | scoped per report (see [12-report-design.md](12-report-design.md)) | filter/search/sort per report |
| POST | `/reports/:reportType/export` | scoped | body: `{format, filters}` → enqueues `report_exports` job, returns job id |
| GET | `/report-exports/:id` | requester only | poll status → signed download URL when `ready` |

### Notifications (`/api/v1/notifications`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | any authenticated | own notifications, filter=`unreadOnly` |
| PATCH | `/notifications/:id/read` | own only | |
| POST | `/notifications/announcements` | GO (gym-wide), PSA (platform-wide) | |
| GET/PATCH | `/notifications/preferences` | own only | |

### Messaging (`/api/v1/conversations`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/conversations` | TR(own), MB(own) | |
| GET | `/conversations/:id/messages` | participant only | paginated, `?before=<messageId>` |
| POST | `/conversations/:id/messages` | participant only | text/image/pdf/workout_note/diet_note |

### Dashboard (`/api/v1/dashboard`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/dashboard/owner` | GO | |
| GET | `/dashboard/receptionist` | RC | |
| GET | `/dashboard/trainer` | TR | own assigned-member aggregates |
| GET | `/dashboard/member` | MB | own aggregates |

### Platform (`/api/v1/platform/...`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/platform/gyms` | PSA | filter=`status,planId`, search=name |
| PATCH | `/platform/gyms/:id/status` | PSA | activate/suspend |
| POST/GET/PATCH | `/platform/plans[/:id]` | PSA | plan catalog |
| GET | `/platform/analytics` | PSA | MRR, churn, growth |
| POST | `/platform/announcements` | PSA | |
| POST | `/platform/impersonation` | PSA | body: `{gymId, reason}` → time-boxed session token |
| POST | `/platform/impersonation/:id/end` | PSA | |

## 11.5 Example: Full Contract for One Representative Endpoint

**`POST /api/v1/members/:id/membership/renew`**

- **Auth**: session required. **Authorization**: role ∈ {GO, RC}, `member.gymId === session.gymId`.
- **Request**:
```json
{
  "planId": "uuid",
  "paymentMethod": "cash | upi | card | bank_transfer",
  "amountPaid": 2500.00,
  "discountAmount": 0,
  "discountReason": null,
  "referenceNote": null
}
```
- **Validation**: `planId` must belong to caller's gym and be `is_active=true`; `amountPaid >= 0`; `discountAmount <= subtotal`; `discountReason` required if `discountAmount > 0`.
- **Behavior**: within one DB transaction — expire/close prior active membership, insert new `member_memberships` row, insert `invoices` row, insert `payments` row, write `audit_logs` entry. Enqueues async: invoice PDF generation, expiry-notification schedule update.
- **Response `201`**:
```json
{
  "success": true,
  "data": {
    "membership": { "id": "uuid", "status": "active", "startDate": "...", "endDate": "..." },
    "invoice": { "id": "uuid", "invoiceNumber": "INV-000123", "total": 2500.00, "status": "paid" }
  }
}
```
- **Errors**: `404` (member/plan not found in scope), `409` (member already has a pending unresolved due blocking renewal, if gym policy requires dues cleared first — configurable), `422` (validation).
