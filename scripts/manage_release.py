import argparse
import json
import pathlib
import re
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
VERSION_PATH = ROOT / "version.json"
RELEASE_DOC_DIR = ROOT / "release-doc"


SEMVER_RE = re.compile(r"^v?(?P<major>\\d+)\\.(?P<minor>\\d+)\\.(?P<patch>\\d+)$")


def run_git(args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def load_version():
    with VERSION_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_version(payload):
    with VERSION_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def parse_tag(tag):
    tag = tag.strip()
    if tag in {"major", "minor", "patch"}:
        return tag, None

    match = SEMVER_RE.match(tag)
    if not match:
        return None, None

    major = int(match.group("major"))
    minor = int(match.group("minor"))
    patch = int(match.group("patch"))

    if minor == 0 and patch == 0:
        return "major", (major, minor, patch)
    if patch == 0:
        return "minor", (major, minor, patch)
    return "patch", (major, minor, patch)


def bump(version, bump_type):
    major = int(version.get("major", 0))
    minor = int(version.get("minor", 0))
    patch = int(version.get("patch", 0))

    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    else:
        patch += 1

    return {"major": major, "minor": minor, "patch": patch}


def version_string(version):
    return f"{version['major']}.{version['minor']}.{version['patch']}"


def list_release_docs():
    if not RELEASE_DOC_DIR.exists():
        return []
    return sorted(
        str(path.relative_to(ROOT))
        for path in RELEASE_DOC_DIR.glob("**/*")
        if path.is_file() and path.name != ".gitkeep"
    )


def find_new_release_docs(previous_commit):
    if not RELEASE_DOC_DIR.exists():
        return []

    if not previous_commit:
        return list_release_docs()

    try:
        diff = run_git(
            [
                "diff",
                "--name-status",
                f"{previous_commit}..HEAD",
                "--",
                str(RELEASE_DOC_DIR.relative_to(ROOT)),
            ]
        )
    except subprocess.CalledProcessError:
        return []

    added = []
    for line in diff.splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2 and parts[0] == "A":
            added.append(parts[1])
    return added


def read_file(path):
    return pathlib.Path(path).read_text(encoding="utf-8").strip()


def build_release_notes(version_payload, bump_type, message, commit_subject, new_docs, static_notes):
    notes = [
        f"## Release v{version_string(version_payload)}",
        "",
        f"Version: {version_string(version_payload)}",
        "",
        "Static Notes:",
        static_notes.strip() or "None",
        "",
        f"Commit Message: {commit_subject}",
    ]

    if message:
        notes.extend(["", f"Release Message: {message}"])

    notes.extend(["", f"Version Type: {bump_type}", "", "Version File: [version.json](version.json)"])

    if bump_type == "major" and new_docs:
        notes.extend(["", "Release Docs:", ""])
        for doc in new_docs:
            notes.append(f"- [{doc}]({doc})")
        notes.append("")
        for doc in new_docs:
            notes.extend([f"### {doc}", "", read_file(ROOT / doc), ""])

    return "\n".join(notes).strip() + "\n"


def main():
    parser = argparse.ArgumentParser(description="Manage releases and bump versions.")
    parser.add_argument("--tag", required=True, help="Release tag or semver.")
    parser.add_argument(
        "-m",
        "--message",
        default="",
        help="Custom release message to include in notes.",
    )
    parser.add_argument(
        "--output",
        default="RELEASE_NOTES.md",
        help="Output file for release notes.",
    )
    args = parser.parse_args()

    bump_type, _ = parse_tag(args.tag)
    if bump_type is None:
        print("Tag must be major, minor, patch, or vX.Y.Z.", file=sys.stderr)
        return 2

    if not VERSION_PATH.exists():
        print("version.json is missing.", file=sys.stderr)
        return 1

    payload = load_version()
    static_notes = payload.get("static_notes", "")
    previous_commit = payload.get("previous_commit", "")

    try:
        commit_subject = run_git(["log", "-1", "--pretty=%s"])
        current_commit = run_git(["rev-parse", "HEAD"])
    except subprocess.CalledProcessError:
        print("Git is required to generate release notes.", file=sys.stderr)
        return 1

    next_version = bump(payload.get("version", {}), bump_type)
    new_docs = find_new_release_docs(previous_commit) if bump_type == "major" else []

    payload["version"] = next_version
    payload["previous_commit"] = current_commit
    save_version(payload)

    notes = build_release_notes(
        next_version, bump_type, args.message, commit_subject, new_docs, static_notes
    )
    output_path = ROOT / args.output
    output_path.write_text(notes, encoding="utf-8")

    print(f"Bumped to v{version_string(next_version)} and wrote {output_path}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
