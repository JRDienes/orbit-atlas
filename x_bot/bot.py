import os
from datetime import date, timedelta
from dotenv import load_dotenv
import requests
import tweepy

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
X_CONSUMER_KEY = os.environ["X_CONSUMER_KEY"]
X_CONSUMER_SECRET = os.environ["X_CONSUMER_SECRET"]
X_ACCESS_TOKEN = os.environ["X_ACCESS_TOKEN"]
X_ACCESS_TOKEN_SECRET = os.environ["X_ACCESS_TOKEN_SECRET"]

MAX_CHARS = 240

COUNTRY_EMOJI = {
    # ISO codes
    "US": "🇺🇸", "CN": "🇨🇳", "RU": "🇷🇺", "GB": "🇬🇧",
    "FR": "🇫🇷", "DE": "🇩🇪", "IN": "🇮🇳", "JP": "🇯🇵", "KR": "🇰🇷",
    "CA": "🇨🇦", "AU": "🇦🇺", "IL": "🇮🇱", "IT": "🇮🇹", "ES": "🇪🇸",
    "AR": "🇦🇷", "BR": "🇧🇷", "NZ": "🇳🇿", "SG": "🇸🇬", "AE": "🇦🇪",
    "LU": "🇱🇺", "NL": "🇳🇱", "SE": "🇸🇪", "NO": "🇳🇴", "FI": "🇫🇮",
    "PL": "🇵🇱", "UA": "🇺🇦", "TW": "🇹🇼", "TH": "🇹🇭", "MY": "🇲🇾",
    "ID": "🇮🇩", "PH": "🇵🇭", "VN": "🇻🇳", "BD": "🇧🇩", "PK": "🇵🇰",
    "ZA": "🇿🇦", "NG": "🇳🇬", "EG": "🇪🇬", "KE": "🇰🇪", "ET": "🇪🇹",
    "BG": "🇧🇬", "CZ": "🇨🇿", "HU": "🇭🇺", "RO": "🇷🇴", "AT": "🇦🇹",
    "BE": "🇧🇪", "CH": "🇨🇭", "DK": "🇩🇰", "PT": "🇵🇹", "GR": "🇬🇷",
    # Space-Track non-standard codes
    "PRC": "🇨🇳",
    "CIS": "🇷🇺",
    "UK": "🇬🇧",
    "IND": "🇮🇳",
    "SKOR": "🇰🇷",
    "GER": "🇩🇪",
    "SPN": "🇪🇸",
    "BGR": "🇧🇬",
    "GREC": "🇬🇷",
    "SING": "🇸🇬",
    "ESA": "🇪🇺",
    "EUTE": "🇪🇺",
    "ITSO": "🌐",
    "NATO": "🌐",
    "FRAN": "🇫🇷",
    "NETH": "🇳🇱",
    "SWTZ": "🇨🇭",
    "SWD": "🇸🇪",
    "BRAZ": "🇧🇷",
    "ISRA": "🇮🇱",
    "IRAN": "🇮🇷",
    "PAKI": "🇵🇰",
    "TURK": "🇹🇷",
    "ARAB": "🇦🇪",
    "ARGN": "🇦🇷",
    "CHLE": "🇨🇱",
    "VTNM": "🇻🇳",
    "THAI": "🇹🇭",
    "MALA": "🇲🇾",
    "INDO": "🇮🇩",
    "EGYP": "🇪🇬",
    "SAFR": "🇿🇦",
    "NKOR": "🇰🇵",
    "JPN": "🇯🇵",
    "AUS": "🇦🇺",
    "CAN": "🇨🇦",
    "MEX": "🇲🇽",
    "UAE": "🇦🇪",
    "ISS": "🏳️",
}

CONSTELLATIONS = [
    {"prefix": "STARLINK",     "label": "Starlink",       "flag": "🇺🇸", "always_show_total": True},
    {"prefix": "ONEWEB",       "label": "OneWeb",         "flag": "🇬🇧", "always_show_total": True},
    {"prefix": "KUIPER",       "label": "Kuiper",         "flag": "🇺🇸", "always_show_total": True},
    {"prefix": "HULIANWANG",   "label": "Hulianwang",     "flag": "🇨🇳", "always_show_total": True},
    {"prefix": "QIANFAN",      "label": "Qianfan",        "flag": "🇨🇳", "always_show_total": True},
    {"prefix": "YAOGAN",       "label": "Yaogan",         "flag": "🇨🇳", "always_show_total": True},
    {"prefix": "BLUEBIRD",     "label": "AST SpaceMobile","flag": "🇺🇸", "always_show_total": True},
    {"prefix": "SPACEMOBILE",  "label": "AST SpaceMobile","flag": "🇺🇸", "always_show_total": True},
    {"prefix": "IRIDE",        "label": "IRIDE",          "flag": "🇮🇹", "always_show_total": False},
    {"prefix": "YAM",          "label": "YAM",            "flag": "🇮🇱", "always_show_total": False},
    {"prefix": "LEMUR",        "label": "Lemur",          "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "FLOCK",        "label": "Flock",          "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "SKYSAT",       "label": "SkySat",         "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "SUPERDOVE",    "label": "SuperDove",      "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "UMBRA",        "label": "Umbra",          "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "CAPELLA",      "label": "Capella",        "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "HAWK",         "label": "Hawk",           "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "ICEYE",        "label": "ICEYE",          "flag": "🇫🇮", "always_show_total": False},
    {"prefix": "OMNISPACE",    "label": "Omnispace",      "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "SATELLOGIC",   "label": "Satellogic",     "flag": "🇦🇷", "always_show_total": False},
    {"prefix": "SWARM",        "label": "Swarm",          "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "TELESAT",      "label": "Telesat",        "flag": "🇨🇦", "always_show_total": False},
    {"prefix": "VIASAT",       "label": "ViaSat",         "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "GLOBALSTAR",   "label": "Globalstar",     "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "IRIDIUM",      "label": "Iridium",        "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "ORBCOMM",      "label": "OrbComm",        "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "O3B",          "label": "O3b",            "flag": "🇱🇺", "always_show_total": False},
    {"prefix": "GONETS",       "label": "Gonets",         "flag": "🇷🇺", "always_show_total": False},
    {"prefix": "GLONASS",      "label": "GLONASS",        "flag": "🇷🇺", "always_show_total": False},
    {"prefix": "GPS",          "label": "GPS",            "flag": "🇺🇸", "always_show_total": False},
    {"prefix": "GALILEO",      "label": "Galileo",        "flag": "🇪🇺", "always_show_total": False},
    {"prefix": "BEIDOU",       "label": "BeiDou",         "flag": "🇨🇳", "always_show_total": False},
    {"prefix": "JILIN",        "label": "Jilin",          "flag": "🇨🇳", "always_show_total": False},
    {"prefix": "TIANQI",       "label": "Tianqi",         "flag": "🇨🇳", "always_show_total": False},
    {"prefix": "GEELY",        "label": "Geely",          "flag": "🇨🇳", "always_show_total": False},
    {"prefix": "HONGHU",       "label": "Honghu",         "flag": "🇨🇳", "always_show_total": False},
]

PREFIX_MAP = {c["prefix"]: c for c in CONSTELLATIONS}


def x_char_weight(text: str) -> int:
    count = 0
    for ch in text:
        cp = ord(ch)
        if cp > 0xFFFF:
            count += 2
        elif 0x1F000 <= cp <= 0x1FFFF or 0x2600 <= cp <= 0x27BF or 0xFE00 <= cp <= 0xFE0F:
            count += 2
        else:
            count += 1
    return count


def fmt_total(n: int) -> str:
    if n >= 1000:
        return f"↑{n:,}"
    return f"↑{n}"


def get_weekly_window():
    today = date.today()
    end = today - timedelta(days=7)
    start = today - timedelta(days=14)
    return start, end


def get_monthly_window():
    today = date.today()
    last_day_prev = today.replace(day=1) - timedelta(days=1)
    start = last_day_prev.replace(day=1)
    return start, last_day_prev


def is_first_sunday_of_month():
    return date.today().day <= 7


def _sb_get(path: str, params) -> list:
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    rows = []
    offset = 0
    page = 1000
    while True:
        if isinstance(params, list):
            p = params + [("offset", offset), ("limit", page)]
        else:
            p = {**params, "offset": offset, "limit": page}
        r = requests.get(url, headers=headers, params=p)
        r.raise_for_status()
        batch = r.json()
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def fetch_launches(start: date, end: date):
    return _sb_get("satellites", [
        ("select", "object_name,country_code,launch_date"),
        ("object_type", "eq.PAYLOAD"),
        ("launch_date", f"gte.{start.isoformat()}"),
        ("launch_date", f"lte.{end.isoformat()}"),
    ])


def fetch_constellation_totals(prefixes):
    totals = {}
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Prefer": "count=exact"}
    url = f"{SUPABASE_URL}/rest/v1/satellites"
    for prefix in prefixes:
        r = requests.get(url, headers=headers, params=[
            ("select", "norad_cat_id"),
            ("object_type", "eq.PAYLOAD"),
            ("object_name", f"ilike.{prefix}%"),
            ("limit", 1),
        ])
        r.raise_for_status()
        content_range = r.headers.get("content-range", "")
        try:
            totals[prefix] = int(content_range.split("/")[1])
        except (IndexError, ValueError):
            totals[prefix] = len(r.json())
    return totals


def classify(rows):
    const_rows = {}
    oneoff_rows = []
    for row in rows:
        name = (row.get("object_name") or "").upper().strip()
        matched = None
        for prefix in PREFIX_MAP:
            if name.startswith(prefix):
                matched = prefix
                break
        if matched:
            const_rows.setdefault(matched, []).append(row)
        else:
            oneoff_rows.append(row)
    return const_rows, oneoff_rows


def build_tweet_body(const_rows, oneoff_rows, db_totals, expand_oneoffs=True):
    lines = []
    for prefix, rows in sorted(const_rows.items(), key=lambda x: -len(x[1])):
        meta = PREFIX_MAP[prefix]
        count = len(rows)
        total = db_totals.get(prefix, 0)
        show_total = meta["always_show_total"] or total > 100
        total_str = f" {fmt_total(total)}" if show_total else ""
        lines.append(f"{count} {meta['label']} {meta['flag']}{total_str}")

    if oneoff_rows:
        if expand_oneoffs:
            for row in sorted(oneoff_rows, key=lambda r: (r.get("country_code") or "")):
                name = (row.get("object_name") or "").strip().title()
                cc = (row.get("country_code") or "").upper()
                flag = COUNTRY_EMOJI.get(cc, cc)
                lines.append(f"{name} {flag}")
        else:
            country_counts = {}
            for row in oneoff_rows:
                cc = (row.get("country_code") or "").upper()
                country_counts[cc] = country_counts.get(cc, 0) + 1
            oneoff_parts = []
            for cc, cnt in sorted(country_counts.items(), key=lambda x: -x[1]):
                flag = COUNTRY_EMOJI.get(cc, cc)
                oneoff_parts.append(f"{cnt}{flag}")
            lines.append(" ".join(oneoff_parts))

    return lines


def format_date_range(start: date, end: date) -> str:
    return f"{start.month}/{start.day}-{end.month}/{end.day}, '{str(end.year)[2:]}"


def compose_posts(start: date, end: date, const_rows, oneoff_rows, db_totals, label="Weekly"):
    header = f"🛰️ {label} launches {format_date_range(start, end)}\n"
    # Try expanded one-off names first; fall back to compact flags if over limit
    body_lines = build_tweet_body(const_rows, oneoff_rows, db_totals, expand_oneoffs=True)
    if x_char_weight(header + "\n" + "\n".join(body_lines)) > MAX_CHARS:
        body_lines = build_tweet_body(const_rows, oneoff_rows, db_totals, expand_oneoffs=False)
    body = "\n".join(body_lines)
    full = header + "\n" + body

    if x_char_weight(full) <= MAX_CHARS:
        return [full]

    tweet1_lines = []
    tweet2_lines = []
    current = header + "\n"
    in_tweet2 = False

    for line in body_lines:
        candidate = current + line + "\n"
        if not in_tweet2 and x_char_weight(candidate) <= MAX_CHARS:
            current = candidate
            tweet1_lines.append(line)
        else:
            in_tweet2 = True
            tweet2_lines.append(line)

    tweets = [header + "\n" + "\n".join(tweet1_lines)]
    if tweet2_lines:
        tweets.append("\n".join(tweet2_lines))
    return tweets


def post_thread(tweets):
    client = tweepy.Client(
        consumer_key=X_CONSUMER_KEY,
        consumer_secret=X_CONSUMER_SECRET,
        access_token=X_ACCESS_TOKEN,
        access_token_secret=X_ACCESS_TOKEN_SECRET,
    )
    prev_id = None
    for tweet in tweets:
        kwargs = {"text": tweet}
        if prev_id:
            kwargs["in_reply_to_tweet_id"] = prev_id
        resp = client.create_tweet(**kwargs)
        prev_id = resp.data["id"]
        print(f"Posted tweet {prev_id}:\n{tweet}\n")


def build_post(start, end, label):
    rows = fetch_launches(start, end)
    print(f"{label} window {start} to {end}: {len(rows)} launches")
    if not rows:
        return []
    const_rows, oneoff_rows = classify(rows)
    db_totals = fetch_constellation_totals(list(const_rows.keys()))
    return compose_posts(start, end, const_rows, oneoff_rows, db_totals, label)


def main():
    weekly_start, weekly_end = get_weekly_window()
    tweets = build_post(weekly_start, weekly_end, "Weekly")

    if is_first_sunday_of_month():
        monthly_start, monthly_end = get_monthly_window()
        tweets += build_post(monthly_start, monthly_end, "Monthly")

    if not tweets:
        print("No launches in window — skipping post.")
        return

    print("\n--- Preview ---")
    for i, t in enumerate(tweets, 1):
        print(f"Tweet {i} ({x_char_weight(t)} chars):\n{t}\n---")

    if os.environ.get("GITHUB_ACTIONS") == "true":
        post_thread(tweets)
    else:
        confirm = input("Post to X? (y/N): ").strip().lower()
        if confirm == "y":
            post_thread(tweets)
        else:
            print("Aborted.")


if __name__ == "__main__":
    main()
