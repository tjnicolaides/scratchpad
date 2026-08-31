# Curated MCP Tool Design

A task-shaped tool set for a Scoutbook MCP server, composed from the 108 raw
`api.scouting.org` endpoints in [`tool-surface.md`](./tool-surface.md). Goal:
**~20 tools an agent can actually reason about**, instead of 108 flat
pass-throughs.

Design rules:
- **Task-shaped, not endpoint-shaped.** One tool answers one question a leader
  actually asks ("what does this Scout still need for First Class?"), fanning
  out to several endpoints under the hood.
- **Read-first.** Phase 1 is entirely read-only. Writes are a separate,
  opt-in Phase 2 behind confirmation.
- **Identity is resolved for the agent**, not pushed onto it. GUIDs come from
  login + roster; tools accept human-friendly inputs (a name, a rank) and
  resolve them internally.
- **Lookups are a resource, not 24 tools.**

## Identity model (why the tools take what they take)

Login returns a JWT carrying three IDs that the rest of the API keys off of:
- **`personGuid`** — the logged-in user (profile, roles, YPT, org access).
- **`organizationGuid`** — the active unit (roster, dashboards, reports).
- **`userId`** — the numeric id used by all `/advancements/**` youth calls.

Each roster member also has their own `userId` / `personGuid`. So the flow is:
`authenticate → get_my_context (which units) → get_unit_roster (member ids) →
per-youth advancement tools`. Tools resolve names→ids off the cached roster so
the agent never handles a raw GUID.

---

## Phase 1 — Read tools (ship these)

### Session & identity

**1. `authenticate`**
Log in and establish the session.
- In: `username`, `password`
- Composes: `POST /api/users/{username}/authenticate`
- Out: session established; returns display name + the units the user can act in.
- Note: in a hosted server this is the OAuth browser-login step, not a raw
  password tool (mirror `scoutbook-ai-test`'s provider).

**2. `get_my_context`**
"Who am I, what units do I have, in what roles?"
- Composes: `GET /persons/v2/{personGuid}/toolkits` (accessible orgs) +
  `GET /persons/{personGuid}/roleTypes` +
  `GET /persons/v2/{personGuid}/personprofile`
- Out: person profile, list of units with the user's role in each. Drives unit
  selection for every later call.

### Roster & people

**3. `get_unit_roster`**
The whole unit in one call.
- In: `organizationGuid` (defaults to active unit), optional `include=[youth,adults,parents,subunits]`
- Composes: `GET /organizations/v2/units/{org}/youths` + `/adults` + `/parents` + `/subUnits`
- Out: unified roster with each member's `userId`/`personGuid`, den/patrol, positions.
- Caches the roster so `find_member` and name→id resolution are local.

**4. `find_member`**
Resolve a name (or partial) to a member + ids. Local over cached roster; no
network call unless the roster is cold. Composes `get_unit_roster`.

**5. `get_person_profile`**
Full detail on one person.
- In: `personGuid`
- Composes: `GET /persons/v2/{personGuid}/personprofile` +
  `GET /persons/{personGuid}/positions` + `GET /persons/{personGuid}/roleTypes`

### Youth advancement (the core value)

**6. `get_youth_advancement`**
One Scout's complete progress at a glance.
- In: `userId` (or a name, via `find_member`)
- Composes: `GET /advancements/v2/youth/{userId}/ranks` + `/meritBadges` +
  `/awards` + `/adventures`
- Out: current rank, % complete, MBs earned/in-progress, awards, adventures.

**7. `get_youth_needs`**
"What's left for <Scout> to earn <rank/MB/award>?" — the single most-asked
question.
- In: `userId`, `target` (rank | meritBadge | award id or name)
- Composes: `GET /advancements/v2/youth/{userId}/ranks/{rankId}/requirements`
  (or `/meritBadges/{id}/requirements`, `/awards/{id}/requirements`)
- Out: only the **incomplete** requirements, with descriptions. Resolves the
  target name→id via the catalog.

**8. `get_youth_leadership_history`**
- Composes: `GET /advancements/youth/{userId}/leadershipPositionHistory`
  (adopt the `v2` variant from PR #9 when merged).

**9. `get_youth_activity_summary`**
Camping / hiking / service-hour totals for a Scout.
- Composes: `GET /advancements/v2/{userId}/userActivitySummary`

### Unit-wide advancement & reporting

**10. `get_unit_advancement_dashboard`**
Unit-level rollup for the active org.
- Composes: `GET /organizations/v2/{org}/advancementDashboard` +
  `/unitAdvancementDashboard`

**11. `get_advancements_ready_to_award`**
The "purchase order" report — what's completed but not yet awarded (needs a
trip to the Scout Shop).
- In: `organizationGuid`, `advancementType` (rank|meritBadge|award|adventure)
- Composes: `POST /organizations/{org}/advancementsReadyToBeAwarded`
- Read-only despite being a POST (filter body).

**12. `get_unit_advancement_history`**
Recent advancement activity across the unit.
- In: `organizationGuid`, `advancementType`, paging
- Composes: `POST /advancements/advancementHistory` (POST = filtered query).

### Catalog & reference

**13. `list_advancements`**
Browse the catalog (definitions, not a specific Scout).
- In: `type` (ranks|meritBadges|awards|adventures), optional search
- Composes: `GET /advancements/ranks` | `/advancements/v2/meritBadges` |
  `/advancements/awards` | `/advancements/adventures`

**14. `get_requirements_template`**
The full requirement list for a rank/MB/award (blank template, all Scouts).
- Composes: `GET /advancements/ranks/{id}/requirements` |
  `/advancements/meritBadges/{id}/requirements` | `/advancements/awards/{id}/requirements`

**15. `find_merit_badge_counselor`**
- Composes: `GET /advancements/meritBadges/counselors/{userId}/profile`

### Compliance

**16. `get_training_status`**
YPT + training for a person, or the unit's training summary.
- In: `personGuid` (individual) **or** `organizationGuid` (whole unit)
- Composes: `GET /persons/v2/{personGuid}/trainings/ypt` +
  `GET /organizations/{org}/orgTrainingSummary`

### Renewal (read)

**17. `get_renewal_status`**
Who's due / lapsed for the unit.
- Composes: `GET /organizations/v2/{org}/renewalDashboard` +
  `/unitRenewalStatusDashboard` + `GET /organizations/{org}/membershipSummary`

### Lookups (as a resource, not tools)

**18. `lookup`** (single tool) — or expose as MCP **resources**.
- In: `category` (enum of the 24 `/lookups/**` sets: ranks, genders, positions,
  activityTypes, unitTypes, grades, …)
- Composes: the matching `GET /lookups/**` endpoint.
- These are static enums — **cache aggressively** (long TTL); prefer MCP
  resources so they don't compete for the model's tool-selection attention.

---

## Phase 2 — Writes (opt-in, gated, later)

Ship only behind an explicit `--enable-writes` flag **and** per-call
confirmation (mirror `scouts-cli`'s confirmation dialogs), because these touch
real youth/membership records.

- **`record_training`** — `POST /persons/{personGuid}/trainings`
- **`log_activity`** — `POST /advancements/v2/activities` (camping/hiking/service)
- **`create_event`** — `POST /advancements/events`
- **`add_member` / `register_member`** — `POST /persons/{personGuid}/memberships`,
  `POST /persons/v2/{personGuid}/membershipRegistrations`
- **`validate_recharter`** — `POST /registrations/v2/{org}/validateForRecharter`
  (validation only, no commit — safe-ish, but org-wide)

### ⚠ Gap to resolve before promising "advancement entry"
The 108-path spec has **no clean per-requirement "mark complete" mutation** —
its advancement POSTs (`advancementHistory`, `advancementsReadyToBeAwarded`)
are reports, not writes. But **`natbros-git/scouts-cli` does bulk requirement
entry**, so a mutating advancement endpoint exists and is simply **undocumented
in this spec**. Action: capture it from `scouts-cli` (MIT) before scoping any
"record advancement" tool. This is the biggest unknown in the write surface.

---

## Coverage summary

| Phase | Tools | Underlying endpoints | Posture |
|---|---|---|---|
| 1 — Read | 18 | ~45 of 108 | Ship first |
| 2 — Write | ~6 | ~7 | Opt-in + confirm |
| (dropped) | — | ~55 dashboards/lookups/rare | Fold into resources or skip |

18 task tools cover the endpoints leaders actually use; the remaining ~55
(granular dashboards, per-enum lookups, commissioner/OLR admin) collapse into
resources or are deferred until a concrete need appears.

## Open design questions

1. **One `lookup` tool vs. MCP resources** for the 24 enums — resources are
   cleaner but not every client surfaces them well.
2. **`v1` vs `v2` endpoints** — several tools have both; default to `v2`
   (richer payloads), keep `v1` as fallback. PR #9 fills the `v2` gaps.
3. **Active-unit statefulness** — hold `organizationGuid` as session state so
   most tools need no org arg, or require it explicitly every call?
4. **Requirement-entry endpoint** — resolve the gap above before committing to
   a write-advancement feature.
