import json
import pathlib
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
VERSION_PATH = ROOT / "version.json"


def run_git(args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()

def has_command(name):
    try:
        subprocess.check_output(["where", name], cwd=ROOT, text=True)
        return True
    except subprocess.CalledProcessError:
        return False


def ensure_gh():
    if has_command("gh"):
        return True

    print("GitHub CLI not found. Attempting to install via winget...")
    try:
        subprocess.check_call(
            ["winget", "install", "--id", "GitHub.cli", "-e", "--source", "winget"],
            cwd=ROOT,
        )
    except FileNotFoundError:
        print("winget not available. Install GitHub CLI manually.", file=sys.stderr)
        return False
    except subprocess.CalledProcessError as exc:
        print(f"Failed to install GitHub CLI: {exc}", file=sys.stderr)
        return False

    if not has_command("gh"):
        print("GitHub CLI installation did not complete.", file=sys.stderr)
        return False

    try:
        subprocess.check_call(["gh", "auth", "login"], cwd=ROOT)
    except subprocess.CalledProcessError as exc:
        print(f"GitHub CLI login failed: {exc}", file=sys.stderr)
        return False

    return True


def has_changes():
    status = run_git(["status", "--porcelain"])
    return bool(status.strip())


def read_version():
    with VERSION_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def next_version(current, bump_type):
    major = int(current.get("major", 0))
    minor = int(current.get("minor", 0))
    patch = int(current.get("patch", 0))

    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    else:
        patch += 1

    return f"{major}.{minor}.{patch}"


def main():
    if not VERSION_PATH.exists():
        print("version.json is missing.", file=sys.stderr)
        return 1

    prompt = "Select release type (M=major, m=minor, p=patch): "
    raw_choice = input(prompt).strip()
    choice = raw_choice.lower()
    if raw_choice == "M":
        bump_type = "major"
    elif choice == "m":
        bump_type = "minor"
    elif choice == "p":
        bump_type = "patch"
    elif choice in {"major", "minor", "patch"}:
        bump_type = choice
    else:
        print("Invalid choice. Use M, m, or p.", file=sys.stderr)
        return 2

    payload = read_version()
    current = payload.get("version", {})
    new_version = next_version(current, bump_type)

    if not has_changes():
        print("No changes to commit.")
        return 0

    subprocess.check_call(["git", "add", "-A"], cwd=ROOT)
    commit_message = f"release: v{new_version}"
    subprocess.check_call(["git", "commit", "-m", commit_message], cwd=ROOT)
    print(f"Committed {commit_message}")

    tag = f"v{new_version}"
    if not ensure_gh():
        print("Skipping release creation. Create the release manually.", file=sys.stderr)
        return 0

    try:
        subprocess.check_call(["gh", "release", "create", tag, "-t", tag, "-n", ""], cwd=ROOT)
        print(f"Created GitHub release {tag}")
    except subprocess.CalledProcessError as exc:
        print(f"Failed to create GitHub release: {exc}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
