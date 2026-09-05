"""Nightly backstop one-shot: read once, lock if unlocked and home.

Runs as a scheduled Fly machine (`fly machine run --schedule daily`). Same
guards as the endpoint. No de-dupe — it's the missed-arrival safety net.
"""
import json
import sys

import lock_core

if __name__ == "__main__":
    result = lock_core.run(do_lock=True)
    print(json.dumps(result))
    sys.exit(0 if result.get("ok") else 1)
