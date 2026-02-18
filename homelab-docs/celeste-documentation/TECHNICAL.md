# Technical Documentation

This document describes the architecture, workflows, and automation that power the site and homelab documentation.

## Project Overview

The repository is a static site built from HTML, SCSS/CSS, and JavaScript. It features an interactive 3D Globe interface for the landing page and a documentation hub that renders Markdown into HTML in the browser.

Primary pages:
- `index.html`: landing page (Globe Mission Select).
- `homelab.html`: documentation hub.
- `data/`: JSON configuration files driving the content.

Key scripts:
- `scripts/generate_homelab_index.py`: builds the docs index from the filesystem.
- `scripts/manage_release.py`: bumps version + builds release notes in CI.
- `scripts/local_release.py`: local release helper (commit + push).
- `scripts/create_mission.py`: CLI tool to add new missions to `data/missions.json`.

## Data-Driven Architecture

The landing page content is dynamically loaded from JSON files in the `data/` directory:

- **`data/missions.json`**: Defines the points on the globe. Each entry includes coordinates, metadata, and links.
- **`data/stack.json`**: Defines the "Arsenal" (Tech Stack) icons displayed in the operator panel.

This allows for content updates without modifying the core HTML structure.

## Homelab Documentation System

### Data layout

```
homelab-docs/
  landing.md
  index.json
  network/
    firewall-rules.md
  services/
    intranet-webserver.md
  security/
    iot-configuration.md
```

Rules:
- Each folder under `homelab-docs/` is a category.
- Each `.md` file inside a category becomes a doc entry.
- `homelab-docs/landing.md` is the default entry point.

### Index generation

`scripts/generate_homelab_index.py` scans:
- Top-level category folders.
- Markdown files directly under each category.

It writes `homelab-docs/index.json` with:
- `categories[].title` (title-cased folder name)
- `categories[].slug` (folder name)
- `categories[].docs[]` entries (title-cased filename + slug)

`landing.md` is always exposed under an `overview` category so it is available even when no other categories exist.

### Rendering pipeline

`homelab.html` loads:
- `homelab-docs/index.json` to build the menu.
- Markdown content using hash routing:
  - `#overview/landing` -> `homelab-docs/landing.md`
  - `#<category>/<doc>` -> `homelab-docs/<category>/<doc>.md`

Client-side rendering uses:
- `marked` for Markdown parsing.
- `highlight.js` for syntax highlighting.
- `marked-footnote` for footnotes.
- `KaTeX` auto-render for math.
- `DOMPurify` for sanitizing HTML (with `details`, `summary`, `input` allowed).

Code blocks get a copy button via `js/homelab.js`.

## Styling System

SCSS is authored in `scss/main.scss` and compiled into `css/main.css`.
The docs UI styling includes:
- Menu with collapsible categories (`<details>` + `<summary>`).
- Code block and inline code styling.
- Blockquote, task list, and details styling.

## Release and Deployment Architecture

Release flow starts locally and is finalized in CI.

### Local release

`scripts/local_release.py`:
- Prompts for M/m/p (major/minor/patch).
- Reads `version.json` to compute the next version.
- Stages all changes and commits with:
  - `release: <type> vX.Y.Z`
- Pushes to `main`.

Important: The local script **never** edits `version.json`.

### CI release workflow

Workflow: `.github/workflows/release.yml`

Trigger:
- `push` to `main` with commit message prefix `release: `

Steps:
1. Parse the commit message and extract `major|minor|patch` and version.
2. Run `scripts/manage_release.py` to:
   - bump `version.json`
   - generate `RELEASE_NOTES.md`
3. Commit `version.json` changes back to `main`.
4. Create or update the GitHub release `vX.Y.Z` using `RELEASE_NOTES.md`.

### Homelab docs index workflow

Workflow: `.github/workflows/homelab-docs.yml`

Trigger:
- Runs after `Release Notes` completes successfully.

Steps:
1. Regenerate `homelab-docs/index.json`.
2. Commit updated index if changed.

### Deploy workflow

Workflow: `.github/workflows/deploy-pages.yml`

Trigger:
- Runs after `Homelab Docs Index` completes successfully.

Steps:
1. Upload site artifacts.
2. Deploy to GitHub Pages.

## Release Notes System

`scripts/manage_release.py` constructs release notes with:
- static notes from `version.json`
- commit message (the release commit)
- version metadata

Major releases also include `release-doc/` markdowns added since the last release.
The `version.json` stores `previous_commit` to detect new release-doc files.

## Configuration Files

### version.json

```
{
  "version": { "major": 0, "minor": 1, "patch": 0 },
  "static_notes": "...",
  "previous_commit": "<hash>"
}
```

### homelab-docs/index.json

```
{
  "categories": [
    {
      "title": "Overview",
      "slug": "overview",
      "docs": [{ "title": "Home", "slug": "landing" }]
    }
  ]
}
```

## Operational Notes

- All workflows assume `main` as the canonical branch.
- Deploy is gated by the homelab index workflow completion.
- GitHub Pages environment rules must allow deployment from `main` and workflow runs.
