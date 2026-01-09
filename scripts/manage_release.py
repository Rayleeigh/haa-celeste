#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
from pathlib import Path
from typing import Tuple, List, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = REPO_ROOT / "version.json"
RELEASE_NOTES_FILE_DEFAULT = REPO_ROOT / "RELEASE_NOTES.md"
RELEASE_DOC_DIR = REPO_ROOT / "release-doc"


def run_git(args: List[str]) -> str:
    result = subprocess.run(
        ["git"] + args,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def load_version() -> dict:
    if not VERSION_FILE.exists():
        # sensible default if missing
        return {
            "major": 0,
            "minor": 1,
            "patch": 0,
            "static_note": "",
            "previous_docs_commit": "",
        }
    with VERSION_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_version(data: dict) -> None:
    with VERSION_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def bump_version(current: dict, release_type: str) -> Tuple[int, int, int]:
    major = int(current.get("major", 0))
    minor = int(current.get("minor", 0))
    patch = int(current.get("patch", 0))

    if release_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif release_type == "minor":
        minor += 1
        patch = 0
    elif release_type == "patch":
        patch += 1
    else:
        raise ValueError(f"Unknown release type: {release_type}")

    return major, minor, patch


def parse_semver_tag(tag: str) -> Tuple[int, int, int]:
    """
    Expect tags like v1.2.3 or 1.2.3.
    """
    if tag.startswith("refs/tags/"):
        tag = tag[len("refs/tags/"):]
    if tag.startswith("v"):
        tag = tag[1:]
    parts = tag.split(".")
    if len(parts) != 3:
        raise ValueError(f"Tag '{tag}' is not a valid semver (MAJOR.MINOR.PATCH).")
    try:
        return int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError as e:
        raise ValueError(f"Tag '{tag}' contains non-integer version parts.") from e


def infer_release_type(old: Tuple[int, int, int], new: Tuple[int, int, int]) -> str:
    old_major, old_minor, old_patch = old
    new_major, new_minor, new_patch = new

    if new_major > old_major:
        # best practice: when major increases, minor/patch usually reset,
        # but we don't hard-enforce to avoid being too strict
        return "major"
    if new_major == old_major and new_minor > old_minor:
        return "minor"
    if (
        new_major == old_major
        and new_minor == old_minor
        and new_patch > old_patch
    ):
        return "patch"

    raise ValueError(
        f"New version {new_major}.{new_minor}.{new_patch} is not a forward "
        f"bump from {old_major}.{old_minor}.{old_patch}."
    )


def get_head_commit() -> str:
    return run_git(["rev-parse", "HEAD"])


def get_new_release_docs(previous_commit: str) -> List[Path]:
    """
    Return a list of *new* markdown files in release-doc since previous_commit.
    - If previous_commit is empty or invalid, treat all *.md in release-doc as new.
    """
    if not RELEASE_DOC_DIR.exists():
        return []

    # if no previous commit, everything is new
    if not previous_commit:
        return sorted(RELEASE_DOC_DIR.glob("*.md"))

    try:
        # get diff of names between previous_commit and HEAD
        diff_output = run_git(
            ["diff", "--name-status", f"{previous_commit}..HEAD", "--", "release-doc/"]
        )
    except subprocess.CalledProcessError:
        # if diff fails (e.g., commit not in history), fall back to all files
        return sorted(RELEASE_DOC_DIR.glob("*.md"))

    new_files: List[Path] = []
    for line in diff_output.splitlines():
        if not line:
            continue
        status, path = line.split(maxsplit=1)
        # 'A' = added; 'R' = renamed (we could also treat R as new)
        if status.startswith("A") and path.endswith(".md"):
            new_files.append(REPO_ROOT / path)

    if not new_files:
        return []

    # deduplicate and sort
    return sorted(set(new_files))


def read_file(path: Path) -> str:
    with path.open("r", encoding="utf-8") as f:
        return f.read().strip()


def get_repo_url() -> Optional[str]:
    """
    Build a GitHub repo URL if running inside GitHub Actions.
    """
    repo = os.environ.get("GITHUB_REPOSITORY")
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    if not repo:
        return None
    return f"{server.rstrip('/')}/{repo}"


def generate_release_notes(
    new_version: Tuple[int, int, int],
    release_type: str,
    static_note: str,
    custom_message: str,
    include_docs: bool,
    previous_docs_commit: str,
) -> str:
    major, minor, patch = new_version
    version_str = f"{major}.{minor}.{patch}"
    title = f"# Release v{version_str} ({release_type})"

    sections: List[str] = [title, ""]

    # static note (always)
    if static_note:
        sections.append("## ℹ️ General Notes")
        sections.append(static_note.strip())
        sections.append("")

    # custom -m message
    if custom_message:
        sections.append("## 📝 Release Message (-m)")
        sections.append(custom_message.strip())
        sections.append("")

    # latest commit message
    try:
        commit_msg = run_git(["log", "-1", "--pretty=%B"])
        if commit_msg:
            sections.append("## 🔧 Latest Commit Message")
            sections.append(commit_msg.strip())
            sections.append("")
    except Exception:
        # non-fatal
        pass

    # major-only: include new release docs
    if include_docs:
        new_docs = get_new_release_docs(previous_docs_commit)
        if new_docs:
            sections.append("## 📄 Release Documentation")
            repo_url = get_repo_url()

            for doc in new_docs:
                rel_path = doc.relative_to(REPO_ROOT)
                doc_title = rel_path.name
                sections.append(f"### {doc_title}")

                if repo_url:
                    # Link to file in the current repo (default branch assumed to be 'main')
                    sections.append(
                        f"[View this document online]({repo_url}/blob/main/{rel_path.as_posix()})"
                    )
                    sections.append("")

                content = read_file(doc)
                sections.append("```md")
                sections.append(content)
                sections.append("```")
                sections.append("")
        else:
            sections.append("## 📄 Release Documentation")
            sections.append(
                "_No new release-doc markdown files detected for this major release._"
            )
            sections.append("")

    sections.append(f"_Generated automatically for v{version_str}_")
    return "\n".join(sections).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage semantic versioning and generate release notes."
    )
    parser.add_argument(
        "--tag",
        help="Tag name that triggered the release (e.g. v1.2.3). If omitted, version will be bumped purely from version.json and --type.",
        default="",
    )
    parser.add_argument(
        "--type",
        choices=["major", "minor", "patch"],
        help=(
            "Release type. If --tag is provided, this will be inferred from the difference "
            "between version.json and the tag, and this flag is optional."
        ),
        default="",
    )
    parser.add_argument(
        "-m",
        "--message",
        dest="custom_message",
        default="",
        help="Custom release message to be included in the release notes.",
    )
    parser.add_argument(
        "--output",
        default=str(RELEASE_NOTES_FILE_DEFAULT),
        help="Path to write the generated release notes markdown.",
    )

    args = parser.parse_args()

    version_data = load_version()
    current_version = (
        int(version_data.get("major", 0)),
        int(version_data.get("minor", 0)),
        int(version_data.get("patch", 0)),
    )

    # Determine new version & release type
    if args.tag:
        tag_version = parse_semver_tag(args.tag)
        release_type = args.type or infer_release_type(current_version, tag_version)
        new_version = tag_version
    else:
        if not args.type:
            raise SystemExit("Either --tag or --type must be provided.")
        release_type = args.type
        new_version = bump_version(
            {
                "major": current_version[0],
                "minor": current_version[1],
                "patch": current_version[2],
            },
            release_type,
        )

    major, minor, patch = new_version

    # Build release notes
    include_docs = release_type == "major"
    static_note = version_data.get("static_note", "")
    previous_docs_commit = version_data.get("previous_docs_commit", "")

    notes = generate_release_notes(
        new_version=new_version,
        release_type=release_type,
        static_note=static_note,
        custom_message=args.custom_message,
        include_docs=include_docs,
        previous_docs_commit=previous_docs_commit,
    )

    output_path = Path(args.output)
    output_path.write_text(notes, encoding="utf-8")

    # Update version.json with the new version and current HEAD as docs commit marker
    head = get_head_commit()
    version_data["major"] = major
    version_data["minor"] = minor
    version_data["patch"] = patch
    version_data["previous_docs_commit"] = head
    save_version(version_data)

    print(f"Generated release notes at {output_path}")
    print(f"Bumped version.json to {major}.{minor}.{patch}")
    print(f"Stored previous_docs_commit = {head}")


if __name__ == "__main__":
    main()
