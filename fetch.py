import requests
import os
from dotenv import load_dotenv
from supabase import create_client

# Load credentials from .env
load_dotenv()

USERNAME = os.getenv("SPACETRACK_USER")
PASSWORD = os.getenv("SPACETRACK_PASS")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Connect to Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LOGIN_URL = "https://www.space-track.org/ajaxauth/login"
DATA_URL = "https://www.space-track.org/basicspacedata/query/class/gp/decay_date/null-val/epoch/>now-30/orderby/norad_cat_id/format/json"

def fetch_and_store():
    session = requests.Session()

    # Log in to Space-Track
    print("Logging in to Space-Track...")
    login = session.post(LOGIN_URL, data={
        "identity": USERNAME,
        "password": PASSWORD
    })

    if login.status_code != 200:
        print("Login failed:", login.status_code)
        return

    print("Logged in! Fetching data...")
    response = session.get(DATA_URL)
    data = response.json()
    print(f"Fetched {len(data)} objects from Space-Track")

    # Shape each object into only the fields we need
    records = []
    for obj in data:
        records.append({
            "norad_cat_id": obj.get("NORAD_CAT_ID"),
            "object_name": obj.get("OBJECT_NAME"),
            "object_type": obj.get("OBJECT_TYPE"),
            "country_code": obj.get("COUNTRY_CODE"),
            "launch_date": obj.get("LAUNCH_DATE"),
            "decay_date": obj.get("DECAY_DATE"),
            "period": obj.get("PERIOD"),
            "inclination": obj.get("INCLINATION"),
            "apoapsis": obj.get("APOAPSIS"),
            "periapsis": obj.get("PERIAPSIS"),
            "rcs_size": obj.get("RCS_SIZE"),
            "tle_line0": obj.get("TLE_LINE0"),
            "tle_line1": obj.get("TLE_LINE1"),
            "tle_line2": obj.get("TLE_LINE2"),
            "epoch": obj.get("EPOCH"),
        })

    # Upload in batches of 500 (Supabase has a row limit per request)
    print("Uploading to Supabase...")
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        supabase.table("satellites").upsert(batch, on_conflict="norad_cat_id").execute()
        print(f"Uploaded rows {i} to {i + len(batch)}")

    print("Done! All objects saved to Supabase.")

fetch_and_store()