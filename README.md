# Homelab Overview

Welcome to my homelab documentation. This space captures the systems, services, and automation I run to keep everything reliable and self-hosted.

## Goals

- Keep services stable and easy to maintain
- Automate the boring parts
- Document changes and learnings along the way

## Current Stack

- Hypervisor and lightweight VMs
- Container services for apps and tooling
- Centralized monitoring and backups

## Roadmap

- Expand observability coverage
- Standardize deployment templates
- Improve documentation depth

---

# Repo Guide

## Docs Workflow

- Homelab docs live under `homelab-docs/<category>/`.
- Each markdown file becomes a document entry.
- `homelab-docs/index.json` is generated automatically.

Update the index locally:

```
python scripts/generate_homelab_index.py
```

## Release + Deploy Workflow

Generate release notes and bump version:

```
python scripts/manage_release.py --tag major -m "Release vX.Y.Z" --output RELEASE_NOTES.md
```

Local release helper (auto-commit + create GitHub release):

```
python scripts/local_release.py
```

Commit and push:

```
git add version.json RELEASE_NOTES.md release-doc/VX.Y.Z.md
git commit -m "release: vX.Y.Z"
git push origin main
```

Create a GitHub release (triggers release notes + deploy):

```
gh release create major -t "vX.Y.Z" -n ""
```

### Tags

- Use `major`, `minor`, or `patch` for release tags.
- Semantic tags like `vX.Y.Z` are also accepted.

### Release Docs

- Major releases include markdown files from `release-doc/`.
- Add a file like `release-doc/VX.Y.Z.md` for major versions.
