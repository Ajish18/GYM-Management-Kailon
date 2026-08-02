# 16. Future Roadmap

Everything below is explicitly **out of scope for v1** but the architecture in this document set (schema fields, entity relationships, module boundaries) is designed to accommodate each item without a redesign. "Reserved" means the data model already has the hook; "New" means net-new modeling required.

## 16.1 Multi-Branch Support — *Reserved*
`branches` table exists from v1 (one implicit branch per gym). v2 work is UI/UX (branch switcher, branch-scoped staff/member assignment, cross-branch reporting rollups for the Owner) and permission-matrix extension (branch-scoped Receptionist/Trainer, branch-level vs gym-level Owner views).

## 16.2 QR Code Attendance — *Reserved*
`attendance_records.check_in_method`/`check_out_method` already include `qr`. v2 adds: per-gym QR generation (static, gym-side display) and/or per-member rotating QR (member-side, scanned by staff), plus a lightweight scan endpoint.

## 16.3 Face Recognition / Biometric Attendance — *New, architecture notes only*
Would introduce a `biometric_templates` table (encrypted, opt-in, explicit consent capture per applicable biometric-privacy law) and an edge/kiosk device integration layer. Treated as a premium add-on tier given hardware dependency and elevated compliance burden (biometric data requires the strictest consent/retention handling in the platform).

## 16.4 AI Workout / Diet Suggestions — *New*
Layered on top of existing `workout_templates`/`diet_templates` and member history (`body_measurements`, `workout_logs`, adherence data) as training/context input. Positioned as a trainer *assist* tool (suggest, trainer approves/edits before assignment), not an autonomous replacement — preserves the trainer-as-authority model core to the product's trust positioning.

## 16.5 Wearable Integration (Google Fit / Apple Health) — *New*
Would extend `attendance_records`/`body_measurements`/a new `wearable_activity_logs` table via OAuth-based sync connectors. Read-only ingestion first (supplementing, not replacing, gym-recorded attendance) to avoid attendance-integrity disputes.

## 16.6 Fitness Challenges — *New*
Builds on the streak/badge system (§12.21): a `challenges` table (gym-scoped or platform-scoped), `challenge_participants`, leaderboard reuse of existing ranking logic. Natural extension of the gamification engine already in v1.

## 16.7 Referral System — *New*
`referrals` table linking a referring member to a new member registration, tied into the Payment module for referral-credit issuance (discount or account credit).

## 16.8 Coupons — *New*
`coupons` table (code, discount type/value, validity window, usage limits) consumed at the existing payment/renewal discount step (`invoices.discount_amount`) — slots into the current payment flow rather than requiring a new one.

## 16.9 Online Subscription Billing (Gym → Kailon) — *Reserved*
`gym_subscriptions`/`subscription_plans` model recurring billing today at the metadata level; v2 adds actual payment-gateway integration (Stripe/Razorpay-class subscriptions API) for card-based auto-billing of gyms, replacing manual/offline platform billing.

## 16.10 Online Payments (Member → Gym) — *New, gateway-hosted*
Adds a gateway-hosted checkout for member membership payments (member-initiated renewal from their own dashboard), tokenized via the gateway so Kailon never handles raw card data (keeps NFR-COMP-002 intact). Feeds the same `invoices`/`payments` tables as staff-recorded payments, with `method` extended to include the gateway type.

## 16.11 Refunds — *New*
Extends the payments model's existing reversal pattern (`payments.is_reversal`/`reversed_payment_id`, already in v1 for corrections) to a formal member-facing refund request/approval workflow.

## 16.12 Mobile App — *New (frontend only)*
The API layer ([10-api-design.md](10-api-design.md)) is already a clean REST boundary consumable by a React Native or native client without backend changes; this is a frontend-only roadmap item once the web PWA experience validates product-market fit.

## 16.13 Offline Sync — *New*
Primarily relevant to front-desk check-in continuity during connectivity loss. Would introduce a local-first queue (IndexedDB) on the receptionist check-in screen with conflict-resolution rules for the "one open session per member" invariant (§9.6) when reconciling offline-recorded events.

## 16.14 Email / Push / WhatsApp Notification Channels — *Reserved*
`notification_templates.channel` and `notification_preferences` are channel-extensible by design; v1 ships `in_app` (+ `email` for critical transactional messages), v2 adds `push` (via a mobile app) and `whatsapp` (via WhatsApp Business API) as additional channel values without schema changes.

## 16.15 Member Self-Registration — *New*
v1 requires staff-created member accounts (deliberate, to keep gym-side data quality and billing control). v2 could add a gym-configurable public registration link with Owner/Receptionist approval-before-activation, reusing the existing `invites`-style token pattern.

## 16.16 Sequencing Guidance

Recommended v1.x → v2 ordering, by leverage (member-retention impact) vs. build cost:

1. Email notifications (cheap, high impact on renewal/retention)
2. Coupons + Referral system (revenue growth, low schema risk)
3. QR attendance (front-desk efficiency, schema already reserved)
4. Online member payments (removes cash-handling friction, meaningful trust/PCI surface — do after the platform has real usage data to justify the integration cost)
5. Multi-branch UI (only once multiple pilot customers actually need it — don't build ahead of demand)
6. Mobile app (once web engagement metrics validate the core loop)
7. AI suggestions, wearables, biometric attendance (differentiation-stage features, post-PMF)
