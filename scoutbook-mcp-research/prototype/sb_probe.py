"""Throwaway live probe for the Scoutbook API. Reads creds from env.
Prints structure/shape only — never the token or password."""
import os, json, ssl, urllib.request, urllib.error

AUTH="https://auth.scouting.org"; API="https://api.scouting.org"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
U=os.environ["SB_USER"]; P=os.environ["SB_PASS"]

ctx=ssl.create_default_context()
ca=os.environ.get("SB_CA")
if ca and os.path.exists(ca):
    try: ctx.load_verify_locations(ca)
    except Exception as e: print("ca load warn:",e)

def req(method,url,token=None,body=None,accept="application/json"):
    data=json.dumps(body).encode() if body is not None else None
    h={"User-Agent":UA,"Accept":accept}
    if body is not None: h["Content-Type"]="application/json"
    if token: h["Authorization"]=f"Bearer {token}"
    r=urllib.request.Request(url,data=data,headers=h,method=method)
    try:
        with urllib.request.urlopen(r,context=ctx,timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:300].decode(errors="replace")
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"

def keys(o):
    if isinstance(o,dict): return sorted(o.keys())
    if isinstance(o,list): return f"[list len={len(o)}]"+ (" item0keys="+str(sorted(o[0].keys())) if o and isinstance(o[0],dict) else "")
    return type(o).__name__

# 1. authenticate
st,d=req("POST",f"{AUTH}/api/users/{U}/authenticate",body={"password":P},accept="application/json; version=2")
print("=== authenticate ===", st)
if not isinstance(d,dict):
    print("  FAILED:",d); raise SystemExit
tok=d.get("token"); pg=d.get("personGuid"); uid=(d.get("account") or {}).get("userId")
print("  top-level keys:",keys(d))
print(f"  personGuid={pg}  userId={uid}  token_present={bool(tok)} token_len={len(tok) if tok else 0}")

# 2. org guid via renewalRelationships
st,d=req("GET",f"{API}/persons/{pg}/renewalRelationships",token=tok)
print("=== renewalRelationships ===",st,"| shape:",keys(d))
org=None
if isinstance(d,list):
    for e in d:
        if isinstance(e,dict) and e.get("relationshipTypeId") is None:
            org=e.get("organizationGuid"); break
    if org is None and d and isinstance(d[0],dict):
        org=d[0].get("organizationGuid")
print("  chosen organizationGuid=",org)

# 3. toolkits (accessible units)  -> get_my_context
st,d=req("GET",f"{API}/persons/v2/{pg}/toolkits",token=tok)
print("=== toolkits (units) ===",st,"| shape:",keys(d))
if isinstance(d,list):
    for e in d[:6]:
        if isinstance(e,dict):
            print("   unit:",{k:e.get(k) for k in ("organizationGuid","organizationName","unitTypeId","programId") if k in e})

# 4. roster youths -> get_unit_roster
if org:
    st,d=req("GET",f"{API}/organizations/v2/units/{org}/youths",token=tok)
    print("=== roster youths ===",st,"| shape:",keys(d))
    ex=None
    if isinstance(d,list) and d:
        ex=d[0]
        print("   sample youth keys:",sorted(ex.keys()))
    # 5. one youth's advancement -> get_youth_advancement
    yid=None
    if isinstance(ex,dict):
        for k in ("userId","memberId","personGuid"):
            if ex.get(k): yid=ex[k]; ykey=k; break
    if yid:
        st,d=req("GET",f"{API}/advancements/v2/youth/{yid}/ranks",token=tok)
        print(f"=== youth ranks (via {ykey}={yid}) ===",st,"| shape:",keys(d))
print("=== done ===")
