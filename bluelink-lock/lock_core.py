"""Shared Bluelink lock logic. LOCK ONLY — never unlocks.

One ccNC read per call. Locks only when the car reports itself unlocked AND
within HOME_RADIUS_M of home. ccNC reads wake the car, so callers must not loop.
"""
import math
import os

from hyundai_kia_connect_api import VehicleManager

# Home geofence center. Set via env in production; these are placeholders.
HOME_LAT = float(os.environ.get("HOME_LAT", "0.0"))
HOME_LON = float(os.environ.get("HOME_LON", "0.0"))
HOME_RADIUS_M = float(os.environ.get("HOME_RADIUS_M", "150"))


def _haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def run(do_lock=True):
    """Read once, lock if unlocked and home. Returns a result dict."""
    region = int(os.environ.get("BLUELINK_REGION", "3"))
    brand = int(os.environ.get("BLUELINK_BRAND", "2"))
    vm = VehicleManager(
        region=region,
        brand=brand,
        username=os.environ["BLUELINK_USERNAME"],
        password=os.environ["BLUELINK_PASSWORD"],
        pin=os.environ["BLUELINK_PIN"],
    )
    vm.check_and_refresh_token()
    vm.update_all_vehicles_with_cached_state()

    if not vm.vehicles:
        return {"ok": False, "reason": "no_vehicles"}

    vid, v = next(iter(vm.vehicles.items()))
    lat, lon = v.location_latitude, v.location_longitude
    result = {
        "ok": True,
        "vehicle": f"{v.name}",
        "locked": v.is_locked,
        "location": [lat, lon],
        "action": "none",
    }

    if v.is_locked:
        result["action"] = "already_locked"
        return result

    if lat is None or lon is None:
        result["action"] = "skipped_no_location"
        return result

    dist = _haversine_m(HOME_LAT, HOME_LON, lat, lon)
    result["distance_m"] = round(dist, 1)
    if dist > HOME_RADIUS_M:
        result["action"] = "skipped_not_home"
        return result

    if do_lock:
        vm.lock(vid)
        result["action"] = "locked"
    else:
        result["action"] = "would_lock"
    return result
