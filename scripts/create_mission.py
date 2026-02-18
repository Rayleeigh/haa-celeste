import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MISSIONS_PATH = ROOT / "data" / "missions.json"
TYPES_PATH = ROOT / "data" / "mission_types.json"

def main():
    print("\n--- INITIATING NEW MISSION PROTOCOL ---\n")

    mission_id = input("Mission ID (e.g., project-omega): ").strip()
    if not mission_id:
        print("ID is required.")
        return

    name = input("Mission Name (e.g., Project Omega): ").strip()
    title = input("Mission Title (e.g., Omega Protocol): ").strip()
    desc = input("Description: ").strip()
    link = input("Link (URL or path): ").strip()
    link_text = input("Link Button Text (e.g., ACCESS TERMINAL): ").strip()
    
    # Load available types
    available_types = []
    if TYPES_PATH.exists():
        try:
            with open(TYPES_PATH, "r", encoding="utf-8") as f:
                types_data = json.load(f)
                available_types = [t["id"] for t in types_data]
        except:
            pass
            
    print(f"\nAvailable Mission Types: {', '.join(available_types)}")
    mission_type = input("Mission Type ID (e.g., project): ").strip()
    # icon = input("Icon Path (relative to root, e.g., mission-icons/omega.png): ").strip() # Removed
    
    print("\nCoordinates (Lat/Lon):")
    print("  Examples: NY (40, -74), London (51, 0), Tokyo (35, 139), Sydney (-33, 151)")
    try:
        lat = float(input("Latitude: ").strip())
        lon = float(input("Longitude: ").strip())
    except ValueError:
        print("Invalid coordinates.")
        return

    new_mission = {
        "id": mission_id,
        "name": name,
        "title": title,
        "description": desc,
        "link": link,
        "link_text": link_text,
        "type": mission_type,
        "lat": lat,
        "lon": lon
    }

    missions = []
    if MISSIONS_PATH.exists():
        try:
            with open(MISSIONS_PATH, "r", encoding="utf-8") as f:
                missions = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            print("Warning: missions.json was invalid. Starting fresh.")

    # Check for duplicate ID
    for m in missions:
        if m["id"] == mission_id:
            print(f"Error: Mission ID '{mission_id}' already exists.")
            return

    missions.append(new_mission)

    # Ensure directory exists
    MISSIONS_PATH.parent.mkdir(exist_ok=True)

    with open(MISSIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(missions, f, indent=2)
        f.write("\n")

    print(f"\n[SUCCESS] Mission '{name}' added to missions.json.")

if __name__ == "__main__":
    main()