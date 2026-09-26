# Troop Expense Log — Spec (pre-code)

**Goal:** any troop adult texts a receipt photo to one number; it lands in a running log
that shows the true cost of running the troop, including money nobody asks back.
Reimbursement is a flag on the row, not the workflow.

**Design rule:** everything the treasurer needs lives in one Google Sheet owned by a troop
account. If the automation breaks, texts still sit in Twilio's log, emails in the inbox,
and the treasurer can type rows by hand. Nothing is lost; it just stops being automatic.

---

## 1. Architecture

```mermaid
flowchart LR
  A[Adult's phone] -- "MMS: photo + caption" --> T[Twilio toll-free number]
  A -. "email photo (backup door)" .-> G[receipts@ Google Group -> Gmail label]
  T -- "webhook POST" --> W["Apps Script web app<br/>doPost: append to Inbox, return empty TwiML"]
  W --> I[(Sheet: Inbox tab<br/>raw message)]
  G --> P
  I --> P["Apps Script 1-min trigger<br/>process queue"]
  P -- "image + caption + trips list" --> C[Claude API<br/>structured JSON]
  P --> D[(Drive folder<br/>receipt images)]
  P --> E[(Sheet: Expenses tab)]
  P -- "Twilio REST: confirmation / one follow-up" --> A
  E --> R[Sheet: Summary + Owed tabs<br/>pivots, read by treasurer]
```

One Google Sheet + its bound Apps Script + one Drive folder + a Twilio number + an Anthropic
API key. No servers, no databases, no app installs.

**Why the queue:** Twilio waits ~15 s for a webhook reply; a vision call plus Drive upload can
take longer. `doPost` only records the raw message (~1–2 s) and returns. A time-driven trigger
processes the queue every minute, so the confirmation text arrives 30–90 s after sending.
That's fine for receipts and makes retries trivial (a failed row stays `queued`/`error`).

---

## 2. Decisions

### D1. Inbound channel — **Twilio SMS/MMS on a toll-free number; email-in as a second door**

- **Twilio MMS webhook** is the only option that meets "text one number, zero installs."
- **Google Voice → email: rejected.** Tied to one person's account, MMS images forward
  unreliably, no API, and automating it is against GV's terms.
- **Plain email-in** (a `receipts@` Google Group delivering to a label the script reads) costs
  nothing, needs no registration, and handles PDFs/e-receipts naturally. It's good enough to
  *launch* with while SMS registration is pending, and worth keeping afterward for emailed
  receipts (Amazon, registration fees, etc.). It's not the main door: photo-to-email is more
  taps and people won't remember the address.
- **Registration friction (the real cost of SMS):** US carriers block outbound texts from
  unregistered numbers, so confirmations won't deliver until one of these is approved:
  - **Toll-free verification (recommended):** $2.15/mo number, no brand/campaign fees;
    approval typically takes days to a couple of weeks. Wants a legal name, and (as of recent
    rules) usually a business registration number — the troop's or chartered org's EIN.
  - **A2P 10DLC (local number):** $1.15/mo number + ~$24.50 one-time (brand + $15 campaign
    vetting) + ~$1.50–2/mo campaign fee. The **Sole Proprietor** path works with no EIN, in
    your name — the fallback if the troop has no EIN.
  - Submit on day one; build Phase 1 while it's in review. Inbound still works before
    approval, so the pipeline can be tested end to end, with replies logged instead of sent.

### D2. Where the logic runs — **Google Apps Script bound to the Sheet**

- $0, no deploy pipeline, lives inside the Sheet the treasurer already opens
  (Extensions → Apps Script). A successor can find it without knowing it exists.
- Runs as the troop's Google account: native Sheet/Drive/Gmail access, no service-account keys.
- Known caveats, both handled:
  - `doPost` can't read request headers, so it can't verify Twilio's signature. Mitigation: a
    long random secret in the webhook URL (`?k=...`), check `AccountSid` matches ours, and the
    sender allowlist. Low-value target; this is adequate.
  - Apps Script web apps answer via a 302 redirect. Twilio handles this in practice, but it's
    the first thing Phase 1 verifies. **Fallback:** a ~30-line Cloudflare Worker (free tier)
    that validates the signature and forwards to Apps Script. Not built unless needed.
- Rejected: **Twilio Functions** (10 s execution cap is too tight for vision + Drive, and it's
  another console to learn); **Netlify/Vercel/Workers as the main runtime** (fine tech, but they
  add a deploy, a Google service-account key, and a second place a successor has to find).
- Source is plain JavaScript kept in this repo under `packages/troop-expenses/apps-script/` and
  pushed with `clasp`. Plain JS (not TS) so anyone can hot-fix in the browser editor.

### D3. Datastore — **Google Sheet** (link to it from the troop Notion)

- Treasurers keep books in spreadsheets. Pivot tables give category/trip/month rollups with
  no code, and CSV/XLSX export covers audits and the annual committee report.
- Apps Script writes to it natively; Notion would need an integration token, has weaker
  rollups (no real pivots), and is awkward for the treasurer to reconcile against a bank
  statement.
- Notion gets a link (or embed) on the troop's committee page; that's the whole integration.

### D4. Extraction — **Claude vision with structured outputs**

- One call does both jobs: reads the image *and* interprets the caption
  ("$42 gas, reimburse me, Oct campout") against the list of active trips. A receipt-OCR API
  (Veryfi, Mindee, Taggun) does only the first and still needs caption parsing; it also costs
  more at this volume ($0.05–0.10/receipt or monthly minimums).
- Handles photos, screenshots, and emailed PDFs (Claude takes PDFs as document input).
- Uses `output_config.format` with a JSON schema, so the response always parses:
  `vendor, date, total, currency, category, trip_code, reimburse, description,
  confidence{vendor,date,total}: high|medium|low, notes`.
- Deterministic checks after the model: total > 0; date not in the future and not more than
  120 days old; caption amount vs. receipt total disagree by more than $1 → low confidence;
  same sender + amount + date within 7 days → flag possible duplicate.
- Image prep: save the original to Drive, send Claude the Drive-rendered JPEG thumbnail at
  ~1600 px. This also converts iPhone HEIC and shrinks 8 MB email attachments.
- Model: **`claude-opus-5` at `effort: low`** by default (it's a config value in Script
  Properties). Around $0.025/receipt. Sonnet 5 or Haiku 4.5 would cut that to roughly $0.01 or
  $0.004 — see Blocking Q4. Calls are raw `UrlFetchApp` HTTP since Apps Script can't load
  the npm SDK.

### D5. Sender allowlist — **People tab; unknown senders are quarantined, not processed**

- `People` tab: name, mobile (E.164), email, role, active. Only active rows are processed.
- Unknown number/email: raw message is stored in Inbox as `quarantined` (no Claude call, no
  row in Expenses). It gets **one** reply per 24 h (copy below) and the chair/treasurer get an
  email. To approve, add them to People, then run *Expenses → Reprocess quarantined*
  from the Sheet menu.
- Youth protection: the system only converses with listed adults. Don't add scouts' numbers.
- STOP/HELP/START are handled by Twilio's built-in opt-out, as carriers require.

### D6. Categories and trip tagging

Category (what it was) and trip (what it was for) are independent. Gas for the October
campout is `Transportation` + trip `OCT26`. That's what makes both rollups work.

| Category | Examples |
|---|---|
| Campouts & Trips | campsite/cabin fees, park admission, summer camp fees, activity fees |
| Food | grocery runs, patrol food, cracker barrel, COH refreshments |
| Gear & Equipment | tents, stoves, trailer supplies, repairs, propane |
| Transportation | gas, tolls, parking, van/trailer rental |
| Advancement & Awards | badges, rank patches, merit badge supplies, Eagle/COH items |
| Training | NYLT, Wood Badge, first aid/CPR course fees |
| Fundraising Costs | popcorn/wreath inventory, table fees, supplies for fundraisers |
| Charter, Registration & Admin | recharter, insurance, bank fees, printing, postage, website |
| Other | anything else; treasurer re-sorts |

**Trips:** a `Trips` tab with `code, name, start, end, active` (e.g. `OCT26 | October
Campout | 10/16 | 10/18`). The treasurer or scoutmaster adds trips as they're scheduled.
Claude gets the active list and matches loose captions ("oct campout", "for Philmont",
"#phil26"). No trip in the caption → match by receipt date within a trip's dates ±7 days,
otherwise `GENERAL`. Submitters never have to know a code.

---

## 3. Data schema (one Sheet, these tabs)

**Expenses** — one row per expense; the ledger.

| Column | Notes |
|---|---|
| id | `E0123`, sequential; used in texts |
| received_at | timestamp message arrived |
| submitter | name from People |
| channel | `sms` / `email` / `manual` |
| expense_date | from receipt; blank → received date, flagged |
| vendor | |
| amount | number, USD |
| category | from list above (data validation dropdown) |
| trip_code | from Trips or `GENERAL` (dropdown) |
| description | short, e.g. "gas for Oct campout" |
| reimburse_requested | checkbox, default unchecked |
| reimbursed | checkbox |
| reimbursed_date / method | date, "check 1043" / "Venmo" |
| status | `logged` / `needs_info` / `needs_review` / `void` |
| confidence | `high` / `medium` / `low` |
| flags | e.g. `possible duplicate of E0119`, `date guessed` |
| receipt_link | Drive URL to original image/PDF |
| caption | submitter's text, verbatim |
| inbox_id | link back to the raw message |

**Inbox** — append-only raw log of every inbound message: `inbox_id, received_at, channel,
from, body, media_urls, provider_id (Twilio MessageSid / Gmail id), state
(queued/done/quarantined/error), expense_id, error, raw_json`. Never edited by hand.

**People**, **Trips**, **Categories** — lookup tabs above. **Outbox** — every text we send
(helps "did they get a reply?" questions). **Summary**, **Owed** — rollups (§6).
**README** tab — a half-page "how this works / who to call / how to add a person" for successors.

Drive: `Troop Expenses/Receipts/YYYY-MM/E0123_vendor.jpg`, folder shared with the committee
only (receipts can show partial card numbers and home addresses).

---

## 4. Text copy

All replies are plain ASCII so they stay one 160-character GSM segment. One emoji or
curly quote switches to 70-character segments and doubles the cost.

| Situation | Reply |
|---|---|
| Logged | `Logged E0123: $42.18 Shell 9/24, Transportation, Oct Campout, reimburse: YES. Wrong? Reply FIX + the change, or UNDO.` |
| Logged, not reimbursing | `Logged E0124: $18.40 Kroger 9/24, Food, Oct Campout. Thanks - it counts toward what the troop really costs. FIX or UNDO to change.` |
| Missing/unclear total (the one follow-up) | `Got your Shell receipt from 9/24 but couldn't read the total. What was the amount? (e.g. 42.18)` |
| Answered follow-up | `Thanks - E0123 updated to $42.18. Logged.` |
| No answer in 48 h | (no text) row goes to `needs_review` for the treasurer |
| FIX applied | `Updated E0123: trip Summer Camp (was Oct Campout).` |
| UNDO | `Removed E0123 ($42.18 Shell).` (row set to `void`, never deleted) |
| Text only, no photo | `Logged E0125: $30.00 gas 9/24, no receipt photo. Send one anytime and reply E0125.` |
| Unknown sender | `This number logs expenses for Troop 123. If you're a troop adult, reply with your full name and the committee will add you.` |
| HELP | `Troop 123 expenses: text a receipt photo, add a note like "reimburse me" or the trip name. FIX/UNDO to change the last one. Questions: <treasurer name/phone>` |
| Reimbursed (Phase 4, optional) | `Troop 123 paid your $42.18 reimbursement (E0123) by check 1043.` |

Reply rules: text with no photo from a known sender answers the open `needs_info` question
if there is one. Otherwise `FIX`/`UNDO`/`E0123 ...` apply to that expense (or the sender's
latest). Anything else is a new expense without a receipt. Claude interprets the free text
of FIX ("trip summer camp", "total 41.18") into a field patch.

---

## 5. Monthly cost estimate

Assumes 60 receipts/month, ~20 follow-up/correction texts in, ~80 texts out.
Twilio rates from its US pricing page (Sept 2026). Claude rates are list prices.

| Item | Toll-free path | 10DLC path |
|---|---|---|
| Phone number | $2.15 | $1.15 |
| 10DLC campaign fee | — | ~$1.50–2.00 |
| Inbound MMS 60 × $0.0165 | $0.99 | $0.99 |
| Inbound SMS 20 × $0.0083 | $0.17 | $0.17 |
| Outbound SMS 80 × ($0.0083 + ~$0.0045 carrier fee) | $1.02 | $1.02 |
| Claude, `claude-opus-5` low effort (~$0.025/receipt + corrections) | ~$1.70 | ~$1.70 |
| Google Sheet/Drive/Apps Script (existing Workspace) | $0 | $0 |
| **Monthly total** | **~$6** | **~$6.50** |
| One-time | $0 | ~$24.50 |

- A busy month (summer camp, 150 receipts) comes to about $11–12. A year comes to about **$75–90**.
- Using Sonnet 5 instead of Opus 5 saves about $1/month; Haiku 4.5 saves about $1.40.
- Email-only launch: Claude cost alone, about $1.70/month.
- Set a $20/month spend limit on the Anthropic key and a low-balance alert on Twilio.

---

## 6. Rollups (what the treasurer reads)

Native pivot tables on `Expenses` (filtered to `status != void`), so the treasurer can change
them without editing formulas:

- **By category × month**, current fiscal year, with YTD column and grand total.
- **By trip**: total, count, and $ reimbursed vs. unreimbursed ("true cost of Oct campout").
- **Owed** tab: `reimburse_requested` and not `reimbursed`, grouped by person, with a total
  owed and oldest date. The treasurer pays and ticks the checkbox; the row drops off.
- **Unreimbursed contributions YTD** by person, the "money that never comes back." Useful
  for the annual report (and for the donor's own records, though that isn't tax advice).
- Optional: an email digest on the 1st of each month to the treasurer with month and YTD
  totals and the `needs_review` count.

---

## 7. Phased build plan

**Phase 0: accounts (day 1, mostly waiting).** Create the Sheet/Drive folder under the troop
Google account. Twilio account (troop card), buy the toll-free number, **submit verification**.
Anthropic API key with spend cap. `receipts@` group. Put secrets in Script Properties.

**Phase 1: thin slice (one number → one photo → one row → one reply).** `doPost` appends to
Inbox and returns empty TwiML. The trigger saves the image to Drive, writes an Expenses row
(amount pulled from the caption by regex only), and sends
`Got it - logged as E0001. Details coming soon.` A hard-coded allowlist of just your number
keeps the endpoint closed from the start. Verify the Apps Script 302 works with Twilio (else
add the Worker relay). *Done when* your text produces a row with a working receipt link and a
reply (or an Outbox row while verification is pending).

**Phase 2: extraction.** Claude call with the schema, trips list, validation checks, the
single follow-up question, FIX/UNDO, duplicate flag, text-only expenses, email-in door.
*Done when* 20 real receipts from your wallet (kept as a test set) come back with ≥95%
correct totals and dates, and the rest are asked about or flagged rather than wrong.

**Phase 3: rollups.** Categories/Trips tabs with dropdowns, the Summary pivots, monthly and YTD,
monthly digest email. *Done when* the treasurer can answer "what did October cost?" without you.

**Phase 4: allowlist and reimbursements.** People tab replaces the hard-coded list, quarantine +
reprocess menu, Owed view, optional "you've been paid" text, HELP copy, README tab. Load
the roster, then announce with one text: "Text receipts to (xxx) xxx-xxxx."

Rough effort: Phase 1 one evening; Phase 2 a weekend; Phases 3–4 an evening each.

---

## 8. Handoff / keeping it running

- Everything is owned by a troop account, not a personal one: Sheet, Drive, script,
  Twilio billing, Anthropic key. Credentials are in the troop's password manager.
- The README tab in the Sheet covers adding/removing a person, adding a trip, marking
  reimbursed, where the code is, and "if texts stop working, check Twilio → Monitor → Logs,
  then Extensions → Apps Script → Executions."
- Failure is soft. Messages queue in Inbox or Twilio's log, and a single *Reprocess errors*
  menu item replays them. Manual rows (`channel = manual`) are first-class.
- Annual chores: renew the Twilio card, re-check the spend cap, archive last year's rows
  to a `FY2026` tab after the treasurer closes the books.

---

## 9. Blocking questions

1. **Legal identity for SMS registration.** Does the troop (or its chartered organization)
   have an EIN and legal name you can use for Twilio verification? If yes → toll-free. If no
   → 10DLC Sole Proprietor registered to you personally (works, but ties the number to you).
2. **Which Google account owns this?** Is there a troop Workspace domain/account (e.g.
   `treasurer@troopNNN.org`) to own the Sheet, script, and `receipts@` group, or would it
   live in your personal Workspace for now?
3. **Treasurer's books.** Does the treasurer already use budget line items (a spreadsheet,
   QuickBooks, Scoutbook/TroopWebHost)? If so I'll map the categories 1:1 to those instead of
   the starter set. Also: fiscal year Jan–Dec, or Sep–Aug?
4. **Model.** OK to default to `claude-opus-5` (~$1.70/mo)? Or do you want to name Sonnet 5
   (~$0.70) or Haiku 4.5 (~$0.35)? Any of them should read receipts well. I'd confirm against
   your 20-receipt test set in Phase 2 either way.

Non-blocking, needed by Phase 4: the adult roster (name, mobile, email), the current trip list,
and the troop number/treasurer contact for the reply copy.
