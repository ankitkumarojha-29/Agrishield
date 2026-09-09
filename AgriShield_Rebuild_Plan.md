# AgriShield — Farmer-Centric Rebuild Plan

**Purpose of this doc:** hand this to the coding agent (Gemini/Antigravity) as the spec for restructuring the project. It replaces the current state — mock JSON scattered per-screen, no farmer identity, admin and app not wired to each other — with one real (still mock-data-backed) database that every screen reads and writes through.

---

## 1. The core diagnosis

Right now the project has three folders that each independently decided what "a farm," "a claim," "a policy" looks like, because `openapi.yaml` doesn't actually define those shapes (see the endpoint audit in section 6). The result:

- The app writes farm data nowhere real — it's local mock state.
- The admin site reads farm data from nowhere real — it's separate local mock state.
- **There is no `user_id` anchoring anything.** Farms page shows a farm ID, not a farmer name, because nothing joins a farm back to a person.
- Admin actions (approve claim, verify policy) don't write anywhere the app reads from, so the farmer never sees the result of a decision made about them.
- Blockchain fields (`tx_hash`, `canonical_hash`) exist in the schema but nothing populates them on the actual purchase/claim actions.

The fix is not "add more mock JSON." It's: **one Postgres schema, one backend, phone number is the only identity, every screen is a real query against that schema (even while `AI_MODE=mock`).**

---

## 2. Identity model — phone number is the account

No OTP verification for the hackathon build. The number itself *is* the login.

**Flow:**
1. Farmer enters phone number on the app.
2. Backend receives it at `POST /auth/register-or-login` (new endpoint — see section 6).
3. Backend does `SELECT * FROM users WHERE phone = ?`.
   - **Found** → issue a JWT for that existing `user_id`. This is a login.
   - **Not found** → `INSERT INTO users (phone, role='farmer')`, then issue a JWT for the new `user_id`. This is a registration.
4. A 6-digit code is shown/typed for UX realism but is never checked against anything (`MOCK_OTP=true`). Any code, or no code, passes.
5. Every subsequent request carries that JWT. **Every table that stores farmer data has a `user_id` foreign key**, and every backend query filters by the `user_id` from the JWT — never by a farm ID typed in a URL with no ownership check.

This single change is what makes the rest of the app "farmer-centric": once `user_id` is the anchor, farms, policies, claims, and notifications all naturally belong to *someone*, and the admin dashboard can join back to a name instead of showing a bare UUID.

Admin/insurer accounts go through the same table with `role='admin'`, but keep email/password login (`/auth/login`) since they're not farmers standing in a field with a feature phone.

---

## 3. Core schema (real Postgres, still fine to seed with fake data — but seeded *through the app*, not static JSON)

```
users
  id              uuid PK
  phone           text unique          -- farmer identity
  email           text unique nullable -- admin identity
  name            text                 -- nullable until farmer sets it in Profile
  role            enum(farmer, admin)
  language        text
  created_at

farms
  id              uuid PK
  user_id         uuid FK -> users.id      -- THE fix: every farm belongs to someone
  name            text
  crop            text nullable             -- null = unsown, triggers advisory-based recommendation
  sowing_date     date nullable
  boundary        geometry(Polygon,4326)
  area_m2         numeric                   -- server-computed, never trust client
  status          enum(PENDING, VERIFIED, BOUNDARY_INVALID)   -- see section 7, don't reuse UNAVAILABLE
  created_at

soil_reports
  id              uuid PK
  farm_id         uuid FK
  source          enum(ocr, soil_health_card_fallback)
  n, p, k, ph     numeric
  confidence      numeric
  raw_text        text
  created_at

ai_assessments
  id              uuid PK
  farm_id         uuid FK
  type            enum(crop_health, yield_prediction, risk_score, advisory, damage_assessment)
  payload         jsonb        -- whatever ai/ returned, stored as-is
  model_version   text
  confidence      numeric
  low_confidence  boolean
  created_at

policies
  id              uuid PK
  farm_id         uuid FK
  user_id         uuid FK              -- denormalized on purpose: admin lists policies by farmer without a join
  premium         numeric
  sum_insured     numeric
  risk_score_id   uuid FK -> ai_assessments.id
  status          enum(QUOTED, ACTIVE, EXPIRED)
  canonical_hash  text nullable
  tx_hash         text nullable
  created_at

claims
  id              uuid PK
  policy_id       uuid FK
  farm_id         uuid FK
  user_id         uuid FK              -- denormalized, same reason
  event_type      enum(hailstorm, drought, flood, pest, unseasonal_rain, other)
  description     text
  evidence_ids    uuid[]
  damage_pct      numeric nullable
  ai_confidence   numeric nullable
  status          enum(SUBMITTED, AI_ASSESSED, UNDER_REVIEW, APPROVED, REJECTED)
  canonical_hash  text nullable
  tx_hash         text nullable
  reviewed_by     uuid FK -> users.id nullable   -- WHICH admin approved/rejected
  reviewed_at     timestamp nullable
  created_at

notifications
  id              uuid PK
  user_id         uuid FK
  type            enum(claim_status, policy_status, weather_alert, risk_alert)
  ref_id          uuid          -- claim_id or policy_id this notification is about
  message         text
  read            boolean default false
  created_at
```

That last table, `notifications`, is the actual answer to *"whatever I approve from web goes to the app, that wiring is currently missing."* An admin action doesn't just `UPDATE claims SET status=...` — it also `INSERT INTO notifications`, and the app's Notifications screen and dashboard badge are just `SELECT * FROM notifications WHERE user_id = <me> ORDER BY created_at DESC`. No sockets or push infra needed for the hackathon; polling `GET /notifications` on app foreground is enough. Real push (FCM) is a stretch goal, not a blocker.

---

## 4. The two-way wiring, explicitly

This is the part that was missing. State the rule once and apply it everywhere:

> **Every write the backend accepts from the app updates the same row an admin read/write endpoint touches. Every write the backend accepts from the admin site inserts a notification row the app polls.**

Concretely:

| Farmer does (app) | Backend writes | Admin sees (web) |
|---|---|---|
| Registers a farm boundary | `INSERT farms (user_id=me)` | Farmers.tsx / FarmsMap.tsx now show it, joined to `users.name` and `users.phone` |
| Requests crop-health scan | `INSERT ai_assessments` | Farm detail (admin) can show the same assessment history |
| Buys a policy | `INSERT policies`, `INSERT notifications(type=policy_status)` to self (confirmation) | Policies.tsx lists it under that farmer's name |
| Files a claim | `INSERT claims (status=SUBMITTED)` | Claims.tsx dashboard shows it, filterable by farmer |
| — | Admin clicks **Assess AI** | `POST /claims/{id}/assess` → `UPDATE claims SET status=AI_ASSESSED, damage_pct=..., ai_confidence=...` → `INSERT notifications` to that claim's `user_id` |
| Farmer's claim_timeline_screen.dart polls `GET /notifications` | sees "Your claim is now AI-assessed" | — |
| — | Admin clicks **Approve** or **Reject** | `UPDATE claims SET status=..., reviewed_by=<admin_id>, reviewed_at=now()` → `INSERT notifications` |
| Farmer's dashboard badge updates | claim_timeline_screen shows APPROVED/REJECTED with the new status | — |
| — | Admin clicks **Verify Policy** | `UPDATE policies SET tx_hash=<mock hash>` (section 8) → `INSERT notifications(type=policy_status)` | Insurance quote/purchase screen shows the blockchain badge as "Verified" |

The rule of thumb for the coding agent: **no admin action button is allowed to only touch the row it's reviewing — it must also touch `notifications` for the farmer it belongs to.** That's the entire "missing wiring" fix in one sentence.

---

## 5. Farmer-centric principle, applied to the specific bug you flagged

> *"Whenever we open the farms page, it doesn't tell the farmer name."*

Fix: `GET /farms` (admin-scoped variant, see section 6) must return farms already joined to the owner:

```json
{
  "id": "farm-uuid",
  "farmer": { "id": "user-uuid", "name": "Ramesh Patel", "phone": "+91..." },
  "name": "North Field",
  "crop": "wheat",
  "status": "VERIFIED",
  "area_m2": 8200
}
```

Not a bare `farm_id` with a separate lookup the frontend forgot to do. `Farmers.tsx` (the farmer directory) becomes `SELECT users WHERE role='farmer'`, each row expandable to their farms/policies/claims — i.e. Farmers.tsx and FarmsMap.tsx should really be two views over the same farmer-first query, not two disconnected pages.

---

## 6. Endpoint gaps to close (these are the "blank pages, no logic" you're describing)

Audit against `current_design_features.md` — pages that exist with buttons wired to nothing:

| Screen | Missing endpoint | Add to contract |
|---|---|---|
| App: phone login | no register-or-login-by-phone endpoint exists | `POST /auth/register-or-login { phone }` → `{ user, access_token, is_new_user }` |
| Web: Farmers.tsx | `GET /farms` only returns *current user's* farms — no admin "list all farmers" endpoint | `GET /admin/farmers` (role=admin only) → users + farm/policy/claim counts |
| Web: Reports.tsx ("Generate Report" / "Download") | no reporting endpoint at all | `GET /admin/reports?type=claims_summary&format=csv` — even a stub that queries the real tables beats a dead button |
| Web: Profile.tsx ("Upload Photo") | no user profile/file endpoint | `PATCH /auth/me`, `POST /auth/me/avatar` |
| App: crop-health, yield, risk, advisory, soil-analyze | response bodies are undefined in the contract (`{ description: OK }` only) | Every AI-Assessment endpoint gets a real `content.schema` referencing `AIPredictionBase` + a typed payload, so app/web/backend stop guessing field names independently |
| `POST /claims` | request schema reuses the full `Claim` response schema, including server-owned fields (`id`, `status`, `tx_hash`) | Add `ClaimCreateRequest` schema with only farmer-supplied fields: `policy_id, incident_date, event_type, description, evidence_ids` |
| App: Notifications | exists as a screen but nothing pushes real events into it | Wired automatically once section 4's rule is implemented |

Anything the agent finds mid-build that has a button but no backing query should be treated as a bug against **this doc**, not shipped as a dead button — that was the whole complaint.

---

## 7. Small correctness fixes to apply while doing this

- **Farm `status` enum**: drop `UNAVAILABLE` (that word is reserved for external-provider fallback state on weather/satellite calls, not farm state). Use `PENDING | VERIFIED | BOUNDARY_INVALID`.
- **`low_confidence` contradiction**: pick one behavior. Recommendation — the AI service's `low_confidence: true` flag is the source of truth; the backend never converts it into an `AI_LOW_CONFIDENCE` *error*. The error code is reserved for when the backend itself refuses to call the AI at all (e.g. missing required field), not for a valid-but-uncertain AI response. UI always renders the result plus a "low confidence" badge, never a blank error screen for this case.
- **Boundary revalidation on edit**: `PATCH /farms/{id}` must re-run the same boundary check as `POST /farms` if `boundary` is in the request body — otherwise the validation you fixed on create is bypassable through edit.

---

## 8. Blockchain — mock but logically wired, not decorative

You don't need a real chain call for a hackathon demo. What you do need is for the *fields* to actually populate as a consequence of a real action, not sit null forever:

1. On `POST /insurance/policies` (purchase) and on claim `APPROVED`:
   - Backend computes `canonical_hash = sha256(json.dumps(canonical_fields, sort_keys=True))` over the immutable fields (farm_id, user_id, amount, timestamp).
   - `blockchain_service.py` writes that hash to a **mock ledger table** (`blockchain_records: id, ref_type, ref_id, hash, tx_hash, submitted_at, confirmed_at`), synchronously generating a fake `tx_hash` (e.g. `uuid4` prefixed `0x`) — no real Polygon call needed for demo, but the code path and table are real, so swapping in `web3.py` later is a one-file change, matching the `ai_client.py` mock/live pattern already established for AI.
2. `GET /insurance/policies/{id}/verification` and `GET /claims/{id}/verification` read from `blockchain_records`, not compute anything ad hoc — so the "Verify Policy" button on Verification.tsx and the blockchain badge on the app's policy detail screen are reading the *same row*, guaranteeing they never disagree.

---

## 9. Caching — why the admin site feels gimmicky/slow

If the web dashboard is calling Supabase directly per-page-load for things like farmer counts, claim lists, and dashboard aggregates, every navigation pays full round-trip + query cost. Fix in two layers, cheapest first:

1. **Frontend**: wrap all `web/src/api/` calls in React Query (or SWR) with `staleTime` — Dashboard aggregate numbers don't need to be sub-second fresh; 30–60s stale-while-revalidate removes the "spinner every click" feel immediately, no backend change required.
2. **Backend**: add a short-TTL in-memory cache (or Redis if already in the stack) in front of the expensive aggregate queries specifically — `GET /admin/dashboard-summary`, `GET /admin/farmers` counts, `GET /market/prices`. 15–30s TTL is plenty for a demo; it turns "hit Supabase on every admin click" into "hit Supabase once per 20 seconds no matter how many admins are clicking."

Don't cache anything in the claim-review action path itself (approve/reject must be immediately consistent) — only cache read-heavy list/summary views.

---

## 10. Migration steps, in order

1. Stand up the schema in section 3 for real (Postgres/Supabase), drop all static per-screen mock JSON files in both `app/` and `web/`.
2. Implement `POST /auth/register-or-login` (phone upsert) first — nothing else works without a real `user_id` to hang data on.
3. Wire farm creation end-to-end: app → `POST /farms` (with boundary validation) → row in `farms` with real `user_id` → confirm it shows up on Farmers.tsx / FarmsMap.tsx with the farmer's name attached.
4. Wire AI assessments (crop-health, yield, risk, advisory, soil-analyze) to `ai_assessments` table, using `MOCK_MODE=true` in `ai/` for now — payload shape locked per section 6 so nobody guesses.
5. Wire policy quote → purchase → `blockchain_records` (section 8) → confirm Policies.tsx (web) and insurance_quote_screen.dart (app) both read the same row.
6. Wire claim file → assess → review → approve/reject, with the `notifications` insert on every admin transition (section 4) → confirm claim_timeline_screen.dart on the app updates after an admin action on the web, without touching app code per-status.
7. Add React Query caching to the web dashboard (section 9).
8. Manually seed demo data **through the app itself** using real phone numbers (e.g. `+91XXXXXXXX01`, `02`, `03`) instead of a seed script — this doubles as your registration-flow test.
9. Sweep every page in `current_design_features.md` one more time and confirm every listed button fires a real request with a real response, not a stub.

Once this is done, the "some farmer has logged in → he has farms → we're buying policies for his farms → filing claims → admin approves → farmer sees it" loop is a single connected path through one schema, not four disconnected mock states.
