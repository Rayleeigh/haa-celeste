# Technical Documentation

A complete reference for the architecture, data model, scripts, rendering pipeline, and CI/CD workflows powering this site.

---

## Repository Structure

```
haa-celeste/
├── index.html                  # Landing page (Globe Mission Select)
├── homelab.html                # Documentation hub
├── data/                       # JSON config driving site content
│   ├── missions.json           # Globe mission points
│   ├── mission_types.json      # Available mission type definitions
│   ├── ship_names.json         # Ship name pool for display
│   ├── stack.json              # Tech stack / Arsenal icons
│   └── profile.json            # Brand profile (avatar, bio, links)
├── js/                         # Client-side scripts
│   ├── main.js                 # Entry point for landing page
│   ├── globe.js                # 3D Globe renderer
│   ├── homelab.js              # Docs hub: routing, menu, rendering
│   ├── animations.js           # UI animation helpers
│   ├── helix.js                # Helix/DNA animation
│   └── particles.js            # Particle system
├── scss/main.scss              # Source styles (compiled → css/main.css)
├── homelab-docs/               # Documentation content
│   ├── landing.md              # Docs landing page
│   ├── index.json              # Auto-generated navigation index
│   └── <category>/             # One folder per category
│       └── <doc>.md            # One file per document
├── release-doc/                # Major release markdown attachments
├── scripts/                    # Automation scripts
│   ├── local_release.py        # Local release helper
│   ├── manage_release.py       # CI release: bump version + build notes
│   ├── generate_homelab_index.py  # Rebuild homelab-docs/index.json
│   └── create_mission.py       # Interactive CLI to add globe missions
├── version.json                # Current version, static notes, commit ref
└── .github/workflows/          # GitHub Actions CI
    ├── release.yml             # Release Notes workflow
    ├── homelab-docs.yml        # Homelab Docs Index workflow
    └── deploy-pages.yml        # Deploy GitHub Pages workflow
```

---

## Data-Driven Architecture

Site content is separated from markup. All dynamic content is loaded at runtime from JSON files in `data/`.

| File | Purpose |
|---|---|
| `missions.json` | Array of mission objects placed on the 3D globe |
| `mission_types.json` | Lookup table of valid mission type IDs and display names |
| `ship_names.json` | Pool of names used for display labels |
| `stack.json` | Array of tech stack icons shown in the operator panel |
| `profile.json` | Brand identity: avatar URL, GitHub handle, bio, links |

### Mission object schema

```json
{
  "id": "project-omega",
  "name": "Project Omega",
  "title": "Omega Protocol",
  "description": "Optional description text.",
  "link": "/homelab.html",
  "link_text": "INITIATE PROTOCOL",
  "type": "homelab",
  "lat": 40.7128,
  "lon": -74.0060
}
```

`type` must match an `id` entry in `mission_types.json`. Coordinates can be any valid latitude/longitude pair.

---

## Homelab Documentation System

### Content layout

```
homelab-docs/
  landing.md          # Always maps to #overview/landing
  index.json          # Auto-generated; do not edit by hand
  network/
    firewall-rules.md
  services/
    intranet-webserver.md
  security/
    iot-configuration.md
  celeste-documentation/
    technical-documentation.md
```

Rules:
- Each subfolder under `homelab-docs/` becomes a **category** in the sidebar.
- Each `.md` file inside a category becomes a **document** entry.
- `landing.md` is pinned under the built-in `overview` category and is always the default page.
- Folders with no `.md` files are silently skipped by the index generator.

### Index generation

`scripts/generate_homelab_index.py` scans the filesystem and writes `homelab-docs/index.json`.

For each subfolder it produces:
- `title` — the folder name run through `to_title()` (hyphens/underscores replaced with spaces, each word capitalized).
- `slug` — the raw folder name as-is.
- `docs[]` — one entry per `.md` file: same title/slug treatment applied to the filename stem.

`landing.md` is always injected first as the `overview/landing` entry regardless of folder structure.

Run it locally:

```bash
python scripts/generate_homelab_index.py
```

### index.json schema

```json
{
  "categories": [
    {
      "title": "Overview",
      "slug": "overview",
      "docs": [{ "title": "Home", "slug": "landing" }]
    },
    {
      "title": "Celeste Documentation",
      "slug": "celeste-documentation",
      "docs": [{ "title": "Technical Documentation", "slug": "technical-documentation" }]
    }
  ]
}
```

### Client-side rendering pipeline

`homelab.js` is the entire docs runtime. On page load it:

1. Fetches `homelab-docs/index.json` and builds the sidebar menu.
2. Reads the URL hash to resolve the active document.
3. Fetches the target `.md` file and renders it into `#doc-content`.
4. Listens for `hashchange` to re-render on navigation without a page reload.

**Hash routing:**

| Hash | Resolves to |
|---|---|
| _(empty)_ | `homelab-docs/landing.md` |
| `#overview/landing` | `homelab-docs/landing.md` |
| `#<category>/<doc>` | `homelab-docs/<category>/<doc>.md` |

**Rendering stack:**

| Library | Role |
|---|---|
| `marked` | Markdown → HTML (GFM + line breaks) |
| `highlight.js` | Syntax highlighting for fenced code blocks |
| `marked-footnote` | Footnote syntax extension |
| `KaTeX` | Math rendering (`$...$` and `$$...$$`) |
| `DOMPurify` | HTML sanitisation (allows `details`, `summary`, `input`) |

After rendering, `homelab.js` also:
- Injects a **Copy** button on every `<pre><code>` block.
- Opens all non-anchor links in a new tab with `rel="noopener noreferrer"`.
- Loads `data/profile.json` to set the sidebar brand logo.

---

## Styling System

SCSS source lives in `scss/main.scss` and is compiled to `css/main.css`.

Docs-specific styles include:
- Sidebar menu with collapsible categories via `<details>` + `<summary>`.
- Active link highlighting.
- Code block chrome: background, border, and the copy button overlay.
- Inline code, blockquote, task list, and `<details>` element styles.
- KaTeX and footnote display adjustments.

---

## Scripts

### `create_mission.py`

Interactive CLI for adding a new globe mission to `data/missions.json`.

```bash
python scripts/create_mission.py
```

Prompts for: ID, name, title, description, link, link text, mission type (from `mission_types.json`), and coordinates. Latitude/longitude can be left blank for a random land-biased placement. Shows a preview and asks for confirmation before writing.

### `local_release.py`

Local release entry point. Run this to trigger the full release pipeline.

```bash
python scripts/local_release.py
```

Prompts for release type (`M` = major, `m` = minor, `p` = patch). Computes the next version from `version.json`, stages all working-tree changes, commits with the message `release: <type> vX.Y.Z`, and pushes to `main`.

> **Note:** This script does **not** modify `version.json`. The version bump is handled by `manage_release.py` in CI.

### `manage_release.py`

CI-only script called by the `Release Notes` workflow.

```bash
python scripts/manage_release.py --tag <major|minor|patch|vX.Y.Z> [-m "message"] [--output RELEASE_NOTES.md]
```

Actions performed:
1. Reads `version.json` and computes the next version.
2. Bumps `version.json` in-place and updates `previous_commit` to `HEAD`.
3. Generates `RELEASE_NOTES.md` combining: version metadata, static notes, commit subject, and (on major releases) any new `release-doc/` files added since `previous_commit`.

### `generate_homelab_index.py`

Rebuilds `homelab-docs/index.json` from the filesystem. Safe to run at any time; the output is deterministic.

---

## Release and Deployment

### Full lifecycle

```
Developer runs local_release.py
        │
        ▼
git commit "release: <type> vX.Y.Z"  →  git push main
        │
        ▼
[Release Notes workflow]
  • Parses commit message
  • Runs manage_release.py (bumps version.json, writes RELEASE_NOTES.md)
  • Commits version.json back to main
  • Creates / updates GitHub release vX.Y.Z
        │
        ▼  (on success)
[Homelab Docs Index workflow]
  • Runs generate_homelab_index.py
  • Commits index.json if changed
        │
        ▼  (on success)
[Deploy GitHub Pages workflow]
  • Uploads entire repo as static site artifact
  • Deploys to GitHub Pages
```

### Workflow: `release.yml` — Release Notes

**Trigger:** Push to `main` where the commit message matches `release: (major|minor|patch) vX.Y.Z`.

Non-matching pushes to `main` are a no-op — the workflow runs but skips all subsequent steps.

**Steps:**
1. Parse the commit message with a Bash regex to extract bump type and version string.
2. Run `manage_release.py` to bump `version.json` and write `RELEASE_NOTES.md`.
3. Read the bumped version back from `version.json`.
4. Commit `version.json` to `main` as `chore: bump version to vX.Y.Z`.
5. Create or update the GitHub release `vX.Y.Z` using `RELEASE_NOTES.md` as the body.

### Workflow: `homelab-docs.yml` — Homelab Docs Index

**Trigger:** `Release Notes` workflow completes successfully.

**Steps:**
1. Run `generate_homelab_index.py` to regenerate `index.json`.
2. If `index.json` changed, commit it as `chore: update homelab docs index`.

### Workflow: `deploy-pages.yml` — Deploy GitHub Pages

**Trigger:** `Homelab Docs Index` workflow completes successfully, **or** manual `workflow_dispatch` (with optional branch/tag ref).

**Steps:**
1. Checkout the target ref (defaults to `main`).
2. Configure GitHub Pages and upload the entire repository as a static site artifact.
3. Deploy to the `github-pages` environment.

---

## Release Notes System

`manage_release.py` builds `RELEASE_NOTES.md` from these sources:

| Source | Always included |
|---|---|
| Version string | Yes |
| `static_notes` from `version.json` | Yes |
| Commit subject of the release commit | Yes |
| `-m` message passed by CI | Yes (if non-empty) |
| Bump type | Yes |
| New `release-doc/` files | **Major releases only** |

**Major release docs:** For major bumps, any `.md` file added to `release-doc/` since the commit recorded in `version.json → previous_commit` is detected via `git diff --name-status`. Detected files are listed as links and their full content is embedded in the release notes.

To attach a doc to the next major release, add a file to `release-doc/` (e.g. `release-doc/v4.0.0.md`) before running `local_release.py`.

---

## Configuration Files

### `version.json`

```json
{
  "version": { "major": 4, "minor": 0, "patch": 0 },
  "static_notes": "Release note always included in this statement.",
  "previous_commit": "<git-sha>"
}
```

- `version` is written by `manage_release.py` in CI; never edit manually during a release.
- `static_notes` is included verbatim in every set of release notes.
- `previous_commit` marks the last release commit and is used to diff `release-doc/` for major releases.

### `homelab-docs/index.json`

Auto-generated. Edit the folder structure under `homelab-docs/` and regenerate — do not edit this file by hand.

---

## Operational Notes

- All workflows target `main` as the canonical branch.
- The deploy workflow is gated behind both the `Release Notes` and `Homelab Docs Index` workflows completing successfully, ensuring `index.json` and `version.json` are always up to date before the site goes live.
- The deploy workflow also supports manual dispatch for emergency or out-of-band deploys.
- GitHub Pages environment rules must permit deployment from `main` and from workflow runs.
- The `Release Notes` workflow requires `contents: write` to commit `version.json` back to `main`.
