import argparse
import json
import pathlib
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
VERSION_PATH = ROOT / "version.json"
RELEASE_DOC_DIR = ROOT / "release-doc"


def run_git(args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def load_version():
    with VERSION_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_version(payload):
    with VERSION_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


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


def find_new_release_docs(previous_commit):
    if not previous_commit or not RELEASE_DOC_DIR.exists():
        return []

    diff = run_git(
        [
            "diff",
            "--name-status",
            f"{previous_commit}..HEAD",
            "--",
            str(RELEASE_DOC_DIR.relative_to(ROOT)),
        ]
    )
    added = []
    for line in diff.splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2 and parts[0] == "A":
            added.append(parts[1])
    return added


def read_file(path):
    return pathlib.Path(path).read_text(encoding="utf-8").strip()


def build_release_notes(version_payload, bump_type, message, commit_subject, new_docs):
    note_lines = [
        f"## Release v{version_string(version_payload)}",
        "",
        version_payload.get("static_note", "").strip() or "",
        "",
        f"Version file: [version.json](version.json)",
        "",
        "Version details:",
        f"- major: {version_payload['major']}",
        f"- minor: {version_payload['minor']}",
        f"- patch: {version_payload['patch']}",
        "",
        f"Bump type: {bump_type}",
        f"Latest commit: {commit_subject}",
    ]

    if message:
        note_lines.extend(["", f"Release message: {message}"])

    if bump_type == "major" and new_docs:
        note_lines.extend(["", "Release documentation:"])
        for doc in new_docs:
            note_lines.append(f"- [{doc}]({doc})")
        note_lines.append("")
        for doc in new_docs:
            note_lines.extend([f"### {doc}", "", read_file(ROOT / doc), ""])

    return "\n".join(line for line in note_lines if line is not None).strip() + "\n"


def main():
    parser = argparse.ArgumentParser(description="Bump version and generate release notes.")
    parser.add_argument(
        "--bump",
        choices=["major", "minor", "patch"],
        required=True,
        help="Version bump type.",
    )
    parser.add_argument(
        "-m",
        "--message",
        default="",
        help="Custom release message to include in notes.",
    )
    parser.add_argument(
        "--output",
        default="release-notes.md",
        help="Output file for release notes.",
    )
    args = parser.parse_args()

    if not VERSION_PATH.exists():
        print("version.json is missing.", file=sys.stderr)
        return 1

    payload = load_version()
    previous_commit = payload.get("previous_commit", "")

    try:
        commit_subject = run_git(["log", "-1", "--pretty=%s"])
        current_commit = run_git(["rev-parse", "HEAD"])
    except subprocess.CalledProcessError:
        print("Git is required to generate release notes.", file=sys.stderr)
        return 1

    next_version = bump(payload.get("version", {}), args.bump)
    new_docs = find_new_release_docs(previous_commit)

    payload["version"] = next_version
    payload["previous_commit"] = current_commit
    save_version(payload)

    notes = build_release_notes(next_version, args.bump, args.message, commit_subject, new_docs)
    output_path = ROOT / args.output
    output_path.write_text(notes, encoding="utf-8")

    print(f"Bumped to v{version_string(next_version)} and wrote {output_path}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
