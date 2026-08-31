"""Flask endpoint for iOS Arrive-Home Shortcut. POST /arrived -> lock if needed.

Auth: shared secret in the X-Auth header (compared constant-time).
De-dupe: ignores calls within DEDUPE_SECONDS of the last accepted one, so two
phones arriving together don't double-wake the car.
"""
import hmac
import os
import time

from flask import Flask, jsonify, request

import lock_core

app = Flask(__name__)

SHARED_SECRET = os.environ.get("SHARED_SECRET", "")
DEDUPE_SECONDS = int(os.environ.get("DEDUPE_SECONDS", "300"))
_last_accept = {"t": 0.0}


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/arrived")
def arrived():
    provided = request.headers.get("X-Auth", "")
    if not SHARED_SECRET or not hmac.compare_digest(provided, SHARED_SECRET):
        return jsonify({"ok": False, "reason": "unauthorized"}), 401

    now = time.time()
    if now - _last_accept["t"] < DEDUPE_SECONDS:
        return jsonify({"ok": True, "action": "deduped"}), 200
    _last_accept["t"] = now

    try:
        return jsonify(lock_core.run(do_lock=True)), 200
    except Exception as e:  # report, don't crash the worker
        return jsonify({"ok": False, "reason": "exception", "detail": str(e)}), 500


@app.post("/sweep")
def sweep():
    """Nightly backstop. Same auth, but no de-dupe window — always does its one
    read when the scheduler fires, to catch arrivals iOS missed."""
    provided = request.headers.get("X-Auth", "")
    if not SHARED_SECRET or not hmac.compare_digest(provided, SHARED_SECRET):
        return jsonify({"ok": False, "reason": "unauthorized"}), 401
    try:
        return jsonify(lock_core.run(do_lock=True)), 200
    except Exception as e:
        return jsonify({"ok": False, "reason": "exception", "detail": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
