# Bluelink auto-lock

Locks the 2024 Ioniq 5 when it's left unlocked at home. Solves "the car won't auto-lock."

Live: `https://bluelink-lock.fly.dev` (Fly app `bluelink-lock`, personal org, region `iad`).

## How it works

Two triggers, one shared lock rule. The rule (`lock_core.py`): read the car **once**, lock **only if** it reports unlocked AND within 150m of home. Never unlocks.

1. **Arrival** — iOS "Arrive Home" Shortcut on each phone → waits 10 min → `POST /arrived`.
2. **Nightly backstop** — Fly scheduled machine runs `sweep.py` once daily, for arrivals iOS missed.

### Why single-read, never poll

ccNC reads wake the car and drain the 12V battery. Every path does exactly **one** read per trigger. `/arrived` also has a 5-min de-dupe so both phones arriving together don't double-wake it. Do not add polling.

## Config (Fly secrets — set, not in git)

`BLUELINK_USERNAME` `BLUELINK_PASSWORD` `BLUELINK_PIN` `BLUELINK_REGION=3` (USA) `BLUELINK_BRAND=2` (Hyundai) `HOME_LAT=39.99639` `HOME_LON=-75.29487` (2431 Avon Rd, rooftop geocode) `HOME_RADIUS_M=150` `SHARED_SECRET=...` `DEDUPE_SECONDS=300`

Update one: `flyctl secrets set NAME='val' -a bluelink-lock` (triggers a redeploy).

## iOS Shortcut (do this on BOTH phones)

Shortcuts → Automation → + → **Create Personal Automation** → **Arrive** (location = home) → **Run Immediately** → Next.
1. **Wait** 600s.
2. **Get Contents of URL**: URL `https://bluelink-lock.fly.dev/arrived`, Method **POST**, Header `X-Auth` = the SHARED_SECRET value.

The secret is a Fly secret; read it with `flyctl secrets list -a bluelink-lock` (shows a digest, not the value — keep your own copy when you set it).

## Deploy / operate

All `flyctl` commands need Fly auth (`~/.fly/bin/flyctl`, token in `~/.fly/config.yml`).

- Redeploy: `cd bluelink-lock && flyctl deploy --ha=false`
- Logs: `flyctl logs -a bluelink-lock`
- Machines: `flyctl machine list -a bluelink-lock` — expect two: the web `app` (serves `/arrived`) and the scheduled sweep.
- Run sweep now (wakes car once, locks if needed): `flyctl machine start <sweep-machine-id> -a bluelink-lock`

## Gotchas / decisions (why it's built this way)

- **Must run on real OpenSSL.** macOS system Python is LibreSSL and can't build the USA Bluelink client's cipher context (`ssl.SSLError: No cipher can be selected`). The container is `python:3.12-slim` (Debian/OpenSSL), so fine. Locally, use the pyenv 3.12.10 venv, not system python3.
- **Nightly is a Fly scheduled machine, NOT a Claude cloud routine.** The cloud env's egress proxy blocks outbound to fly.dev/Hyundai (`connect_rejected — organization policy`). The disabled routine `trig_016TuZMKuDPisvPuazzDp4z5` is the dead attempt — leave disabled or delete at https://claude.ai/code/routines.
- **Fly `--schedule daily` fires at a Fly-picked hour, not a time you set.** Fine for a backstop. For an exact time (e.g. 11pm), switch to a launchd job on the always-on Mac.
- **iOS Arrive automations can occasionally delay/skip.** That's why the nightly backstop exists.
- Single gunicorn worker/thread + one machine (`--ha=false`) so the car never gets concurrent reads.

## Security TODO (outstanding as of 2026-08-31)

- **Fly org deploy token** `APJqJeOaDBVgOH3KYjRMemYvLQHMZ5l31Vj56Q5iBK` (expires 2046) was pasted into a chat transcript. Revoke at https://fly.io/dashboard → Account → Access Tokens. App + sweep keep running without it; re-auth (`flyctl auth login` in a real terminal → `flyctl tokens org personal`) only when you next need to deploy.
- **Bluelink password** was also in that transcript. Consider changing it; then `flyctl secrets set BLUELINK_PASSWORD='new' -a bluelink-lock`.

## Files

- `lock_core.py` — the read-once + geofence + lock-only rule (shared)
- `app.py` — Flask: `POST /arrived` (de-duped), `POST /sweep` (not), `GET /health`
- `sweep.py` — nightly one-shot entrypoint
- `Dockerfile` `fly.toml` `requirements.txt` — deploy (versions pinned to what was validated)
