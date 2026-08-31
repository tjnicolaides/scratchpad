# Scoutbook API — Auto-generated MCP Tool Surface

Source spec: `specs/scoutbook.openapi.yaml` (dlaporte, 3.0.3). **108 operations** across **13 categories**. Each becomes one MCP tool in the auto-generated server.

Write operations (non-GET, excl. auth): **11**. Everything else is read-only.

| Category | Ops |
|---|---|
| Activities | 3 |
| Advancement Catalog | 15 |
| Authentication | 1 |
| Bulk Advancement | 2 |
| Commissioners | 4 |
| Discovery & Profile | 11 |
| Events & Calendar | 5 |
| Lookups | 24 |
| Membership & Renewal | 14 |
| Organization Dashboards | 8 |
| Training & Compliance | 4 |
| Unit Roster | 8 |
| Youth Progress | 9 |


## Activities  (3)

- `POST /advancements/v2/activities` **[WRITE]** — Get activity logs
- `GET /advancements/activities/{activityId}` — Get activity details
- `GET /advancements/v2/{userId}/userActivitySummary` — Get activity summary totals

## Advancement Catalog  (15)

- `GET /advancements/ranks` — Get all ranks
- `GET /advancements/meritBadges` — Get all merit badges
- `GET /advancements/awards` — Get all awards
- `GET /advancements/awards/{awardId}` — Get awards
- `GET /advancements/adventures` — Get all Cub Scout adventures
- `GET /advancements/ssElectives` — Get Sea Scout electives
- `GET /advancements/v2/meritBadges` — Get merit badges
- `GET /advancements/v2/meritBadges/{meritBadgeId}` — Get merit badges
- `GET /advancements/v2/ranks/{rankId}` — Get ranks
- `GET /advancements/ranks/{rankId}/requirements` — Get rank requirements
- `GET /advancements/meritBadges/{meritBadgeId}/requirements` — Get merit badge requirements
- `GET /advancements/awards/{awardId}/requirements` — Get award requirements
- `GET /advancements/adventures/{adventureId}/requirements` — Get adventure requirements
- `GET /advancements/v2/ranks/{rankId}/requirements` — Get requirements
- `GET /advancements/meritBadges/counselors/{userId}/profile` — Get profile

## Authentication  (1)

- `POST /api/users/{username}/authenticate` — Authenticate user and obtain JWT token

## Bulk Advancement  (2)

- `POST /advancements/advancementHistory` **[WRITE]** — Bulk advancement history for an organization
- `POST /organizations/{organizationGuid}/advancementsReadyToBeAwarded` **[WRITE]** — Get advancements ready to be awarded

## Commissioners  (4)

- `GET /commissioners/v2/organizations/{organizationGuid}/units/assignedCommissioners` — Get commissioners assigned to a unit
- `GET /commissioners/v2/organizations/{organizationGuid}/roundtable` — Get roundtable
- `GET /commissioners/v2/organizations/{organizationGuid}/unitsHealth/details` — Get details
- `GET /commissioners/v2/organizations/{organizationGuid}/unitsHealth/manualEntry` — Get manual entry

## Discovery & Profile  (11)

- `GET /persons/{personGuid}/profile` — Get profile
- `GET /persons/{personGuid}/roleTypes` — Get role types
- `GET /persons/{personGuid}/subscriptions` — Get subscriptions
- `GET /persons/{personGuid}/renewalRelationships` — Get renewal relationships
- `GET /persons/{userId}/myScout` — Get my scout
- `GET /persons/v2/{personGuid}/personprofile` — Get detailed person profile
- `GET /persons/v2/{userId}/personprofile` — Get personprofile
- `GET /persons/v2/{personGuid}/parentGuardianInvitation` — Get parent guardian invitation
- `GET /persons/v2/{personGuid}/relationships` — Get relationships
- `GET /persons/v2/{personGuid}/toolkits` — Get organizations person can access
- `GET /persons/v2/{personGuid}/{organizationGuid}/tools` — Get available tools for person in specific organization

## Events & Calendar  (5)

- `POST /advancements/events` **[WRITE]** — Get events for date range
- `GET /advancements/events/{eventId}` — Get events
- `GET /advancements/v2/events/{eventId}/guests` — Get external event guests
- `GET /advancements/v2/users/{userId}/calendars` — Get user calendars
- `GET /events/communications/organizations` — Get organizations

## Lookups  (24)

- `GET /lookups/address/countries` — Get countries
- `GET /lookups/address/states` — Get US states
- `GET /lookups/advancements/activityCategories` — Get activity categories
- `GET /lookups/advancements/activityCollaborativeOrganizations` — Get activity collaborative organizations
- `GET /lookups/advancements/activityTypes` — Get activity types
- `GET /lookups/advancements/meritBadgeCategories` — Get merit badge categories
- `GET /lookups/advancements/positions` — Get BSA positions
- `GET /lookups/advancements/ranks` — Get ranks (lightweight)
- `GET /lookups/advancements/swimmingClassification` — Get swimming classifications
- `GET /lookups/advancements/unitTimezone` — Get unit timezone
- `GET /lookups/advancements/youthLeadershipPositions` — Get youth leadership positions
- `GET /lookups/communications/communicationTypes` — Get communication types
- `GET /lookups/communications/mobilePhoneCarrier` — Get mobile carriers
- `GET /lookups/communications/phoneCountryCodes` — Get phone country codes
- `GET /lookups/organizations/unitTypes` — Get unit types
- `GET /lookups/organizations/units/specialInterestTypes` — Get special interest unit types
- `GET /lookups/person/ethnicities` — Get ethnicities
- `GET /lookups/person/genders` — Get genders
- `GET /lookups/person/grades` — Get grades
- `GET /lookups/person/nameSuffixes` — Get name suffixes
- `GET /lookups/person/positions` — Get positions
- `GET /lookups/person/titlePrefixes` — Get title prefixes
- `GET /lookups/registrations/applicationStatus` — Get application status
- `GET /lookups/trainings/courses` — Get training courses

## Membership & Renewal  (14)

- `POST /persons/{personGuid}/memberships` **[WRITE]** — Query memberships
- `GET /persons/{personGuid}/positions` — Get positions
- `POST /persons/v2/{personGuid}/membershipRegistrations` **[WRITE]** — Query membership registrations
- `GET /organizations/{organizationGuid}/leads` — Get leads
- `GET /organizations/{organizationGuid}/membershipSummary` — Get membership summary
- `GET /organizations/{organizationGuid}/olrSettings` — Get online registration settings
- `GET /organizations/{organizationGuid}/pin` — Get unit registration PIN
- `GET /organizations/v2/{organizationGuid}/OLRDashboard` — Get online registration dashboard
- `GET /organizations/v2/{organizationGuid}/OLRLeadsDashboard` — Get online registration leads dashboard
- `GET /organizations/v2/{organizationGuid}/leadDashboard` — Get lead dashboard
- `GET /organizations/v2/{organizationGuid}/registrations` — Get registrations
- `GET /organizations/v2/{organizationGuid}/renewalDashboard` — Get renewal dashboard
- `GET /organizations/v2/{organizationGuid}/youthMembershipDashboard` — Get youth membership dashboard
- `POST /registrations/v2/{organizationGuid}/validateForRecharter` **[WRITE]** — Query or create validate for recharter

## Organization Dashboards  (8)

- `GET /organizations/councils` — Get councils
- `GET /organizations/positions/{guid}` — Get positions
- `GET /organizations/v2/{organizationGuid}/advancementDashboard` — Get advancement dashboard
- `GET /organizations/v2/{organizationGuid}/unitAdvancementDashboard` — Get unit advancement dashboard (alternate)
- `GET /organizations/v2/{organizationGuid}/unitActivitiesDashboard` — Get unit activities dashboard
- `GET /organizations/v2/{organizationGuid}/unitRenewalStatusDashboard` — Get unit renewal status dashboard (alternate)
- `GET /organizations/v2/{organizationGuid}/unitRoundtableAttendance` — Get roundtable attendance
- `GET /organizations/v2/{organizationGuid}/orders` — Get advancement orders

## Training & Compliance  (4)

- `POST /persons/{personGuid}/trainings` **[WRITE]** — Query trainings
- `GET /persons/v2/{personGuid}/trainings/ypt` — Get Youth Protection Training status
- `POST /persons/v2/{personGuid}/trainings/positionTrainingRequirements` **[WRITE]** — Query position training requirements
- `GET /organizations/{organizationGuid}/orgTrainingSummary` — Get org training summary

## Unit Roster  (8)

- `GET /organizations/v2/{organizationGuid}/profile` — Get organization profile
- `GET /organizations/v2/{organizationGuid}/key3` — Get Key 3 leaders
- `POST /organizations/v2/{organizationGuid}/orgAdults` **[WRITE]** — Get adult members with full details
- `POST /organizations/v2/{organizationGuid}/orgYouths` **[WRITE]** — Get youth members with full details
- `GET /organizations/v2/units/{organizationGuid}/adults` — Get adult members (basic)
- `GET /organizations/v2/units/{organizationGuid}/parents` — Get parents/guardians
- `GET /organizations/v2/units/{organizationGuid}/subUnits` — Get sub-units (patrols/dens)
- `GET /organizations/v2/units/{organizationGuid}/youths` — Get youth members (basic)

## Youth Progress  (9)

- `GET /advancements/v2/youth/{userId}/ranks` — Get youth rank progress
- `GET /advancements/v2/youth/{userId}/meritBadges` — Get youth merit badges
- `GET /advancements/v2/youth/{userId}/meritBadges/{meritBadgeId}` — Get merit badges
- `GET /advancements/v2/youth/{userId}/awards` — Get youth awards
- `GET /advancements/v2/youth/{userId}/adventures` — Get youth adventures
- `GET /advancements/v2/youth/{userId}/ranks/{rankId}/requirements` — Get youth rank requirements progress
- `GET /advancements/v2/youth/{userId}/meritBadges/{meritBadgeId}/requirements` — Get requirements
- `GET /advancements/v2/youth/{userId}/awards/{awardId}/requirements` — Get requirements
- `GET /advancements/youth/{userId}/leadershipPositionHistory` — Get youth leadership history


## Write surface (non-GET)

- `POST /organizations/v2/{organizationGuid}/orgAdults` — Get adult members with full details
- `POST /organizations/v2/{organizationGuid}/orgYouths` — Get youth members with full details
- `POST /persons/{personGuid}/trainings` — Query trainings
- `POST /persons/v2/{personGuid}/trainings/positionTrainingRequirements` — Query position training requirements
- `POST /persons/{personGuid}/memberships` — Query memberships
- `POST /persons/v2/{personGuid}/membershipRegistrations` — Query membership registrations
- `POST /registrations/v2/{organizationGuid}/validateForRecharter` — Query or create validate for recharter
- `POST /advancements/advancementHistory` — Bulk advancement history for an organization
- `POST /organizations/{organizationGuid}/advancementsReadyToBeAwarded` — Get advancements ready to be awarded
- `POST /advancements/events` — Get events for date range
- `POST /advancements/v2/activities` — Get activity logs
