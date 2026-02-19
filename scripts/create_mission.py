import json
import pathlib
import random
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MISSIONS_PATH = ROOT / "data" / "missions.json"
TYPES_PATH = ROOT / "data" / "mission_types.json"


def load_json(path):
    """Load and return parsed JSON, or None on failure."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"  Error reading {path.name}: {e}")
        return None


def validate_json(path):
    """Re-read the file and confirm it parses without error."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            json.load(f)
        return True
    except json.JSONDecodeError as e:
        print(f"  JSON validation failed: {e}")
        return False


def random_coords():
    """Generate random lat/lon that avoid ocean-heavy zones."""
    lat = round(random.uniform(-50, 60), 4)
    lon = round(random.uniform(-140, 160), 4)
    return lat, lon


def main():
    print("\n--- INITIATING NEW MISSION PROTOCOL ---\n")

    # Load available types
    types_data = load_json(TYPES_PATH)
    if not types_data:
        print("Cannot proceed without valid mission_types.json.")
        return
    type_ids = [t["id"] for t in types_data]

    # Load existing missions
    missions = load_json(MISSIONS_PATH)
    if missions is None:
        print("Warning: missions.json missing or invalid. Starting fresh.")
        missions = []

    existing_ids = {m["id"] for m in missions}

    # --- Collect input ---
    mission_id = input("Mission ID (e.g., project-omega): ").strip()
    if not mission_id:
        print("ID is required.")
        return
    if mission_id in existing_ids:
        print(f"Error: Mission ID '{mission_id}' already exists.")
        return

    name = input("Mission Name (e.g., Project Omega): ").strip() or mission_id
    title = input("Mission Title (e.g., Omega Protocol): ").strip() or name
    desc = input("Description (optional): ").strip()
    link = input("Link (URL or path): ").strip()
    link_text = input("Link Button Text [INITIATE PROTOCOL]: ").strip() or "INITIATE PROTOCOL"

    # Mission type selection
    print(f"\n  Available types:")
    for i, t in enumerate(types_data, 1):
        print(f"    {i}. {t['id']} — {t['name']}")

    type_input = input("Mission Type (number or ID): ").strip()
    if type_input.isdigit() and 1 <= int(type_input) <= len(type_ids):
        mission_type = type_ids[int(type_input) - 1]
    elif type_input in type_ids:
        mission_type = type_input
    else:
        print(f"Invalid type '{type_input}'. Must be one of: {', '.join(type_ids)}")
        return

    # Coordinates
    print("\n  Coordinates (leave both blank for random placement)")
    print("  Examples: NY (40, -74), London (51, 0), Tokyo (35, 139)")
    lat_input = input("Latitude: ").strip()
    lon_input = input("Longitude: ").strip()

    if not lat_input and not lon_input:
        lat, lon = random_coords()
        print(f"  Generated random coords: {lat}, {lon}")
    else:
        try:
            lat = float(lat_input)
            lon = float(lon_input)
        except ValueError:
            print("Invalid coordinates. Provide both as numbers or leave both blank.")
            return

    # Build entry
    new_mission = {
        "id": mission_id,
        "name": name,
        "title": title,
        "description": desc,
        "link": link,
        "link_text": link_text,
        "type": mission_type,
        "lat": lat,
        "lon": lon,
    }

    # Preview
    print("\n--- MISSION PREVIEW ---")
    print(json.dumps(new_mission, indent=2))
    confirm = input("\nDeploy this mission? [Y/n]: ").strip().lower()
    if confirm and confirm != "y":
        print("Mission aborted.")
        return

    # Write
    missions.append(new_mission)
    MISSIONS_PATH.parent.mkdir(exist_ok=True)
    with open(MISSIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(missions, f, indent=2)
        f.write("\n")

    # Validate written file
    if not validate_json(MISSIONS_PATH):
        print("[FAIL] missions.json is corrupted after write!")
        sys.exit(1)

    print(f"\n[SUCCESS] Mission '{name}' deployed to missions.json.")
    print(f"  Total missions: {len(missions)}")


if __name__ == "__main__":
    main()
