# Technical Documentation

Current reference for the architecture and maintenance workflow of this repository.

---

## Repository Structure

```text
haa-celeste/
├── index.html
├── homelab.html
├── css/
│   └── main.css
├── js/
│   ├── main.js
│   ├── scroll.js
│   ├── graph.js
│   └── homelab.js
├── data/
│   ├── profile.json
│   ├── stack.json
│   └── missions.json
├── homelab-docs/
│   ├── landing.md
│   ├── index.json
│   └── celeste-documentation/
│       └── technical-documentation.md
├── scss/
│   └── main.scss
├── scripts/
│   ├── generate_homelab_index.py
│   ├── local_release.py
│   └── manage_release.py
├── release-doc/
├── version.json
└── .github/workflows/
```

---

## Runtime Architecture

The repository currently ships two static entrypoints:

- `index.html`: personal landing page with profile data, stack tags, and the 3D project graph.
- `homelab.html`: markdown-powered documentation hub.

### Landing page

`index.html` loads:

- `css/main.css`
- `js/main.js`
- `js/scroll.js`
- `js/graph.js`
- `three.js` and `OrbitControls` from CDNs

Runtime data sources:

- `data/profile.json`: fallback profile metadata and contact fields
- `data/stack.json`: stack badges and graph technology nodes
- `data/missions.json`: project nodes for the graph

### Documentation hub

`homelab.html` loads:

- `css/main.css`
- `js/homelab.js`
- `marked`, `DOMPurify`, `highlight.js`, and `KaTeX` from CDNs

Runtime data sources:

- `homelab-docs/index.json`: sidebar navigation
- `homelab-docs/landing.md`: default document
- `homelab-docs/<category>/<doc>.md`: routed markdown content
- `data/profile.json`: optional brand logo source

---

## Data Files

### `data/profile.json`

Provides fallback values for:

- name
- bio
- avatar URL
- GitHub URL
- Discord fields
- brand logo URL

`main.js` prefers live GitHub API responses, then falls back to this file.

### `data/stack.json`

Array of technology records used in two places:

- the stack badge list on the landing page
- the graph technology nodes in `graph.js`

Expected shape:

```json
{ "name": "Python", "icon": "python" }
```

### `data/missions.json`

Project records displayed as graph nodes.

Expected shape:

```json
{
  "id": "homelab",
  "name": "Homelab",
  "title": "Homelab Infrastructure",
  "description": "Project summary.",
  "link": "homelab.html",
  "link_text": "View",
  "type": "documentation",
  "technologies": ["linux"]
}
```

---

## Landing Page Scripts

### `js/main.js`

Responsible for:

- fetching GitHub profile data
- falling back to `data/profile.json` if the API is unavailable
- populating profile, stats, links, and hidden metadata fields

### `js/scroll.js`

Responsible for:

- reveal-on-scroll behavior
- nav bar scrolled state
- rendering stack badges from `data/stack.json`
- wiring Discord info from `data/profile.json`

### `js/graph.js`

Responsible for:

- building the Three.js scene
- creating technology and project nodes
- deriving graph edges from `mission.technologies`
- handling hover, focus, and project detail panel state

The graph now filters out malformed stack or mission entries before rendering.

---

## Documentation System

### Content rules

- Each subfolder under `homelab-docs/` becomes a sidebar category.
- Each `.md` file inside a category becomes a document.
- `homelab-docs/landing.md` is always the default route as `#overview/landing`.

### `scripts/generate_homelab_index.py`

Scans `homelab-docs/` and writes `homelab-docs/index.json`.

Run locally:

```bash
python scripts/generate_homelab_index.py
```

### `js/homelab.js`

Handles:

- hash routing
- menu construction from `index.json`
- markdown fetch and render
- syntax highlighting
- KaTeX rendering
- copy buttons for code blocks
- syncing the current document label in the custom docs shell

Hash routing:

- empty hash -> `homelab-docs/landing.md`
- `#overview/landing` -> `homelab-docs/landing.md`
- `#<category>/<doc>` -> `homelab-docs/<category>/<doc>.md`

---

## Styling

`css/main.css` is the stylesheet used by both entrypoints.

`scss/main.scss` remains the source stylesheet for future maintenance, but the deployed pages consume `css/main.css` directly.

---

## Release Workflow

### `scripts/local_release.py`

Local helper that:

- asks for `major`, `minor`, or `patch`
- stages all changes
- creates a `release: <type> vX.Y.Z` commit
- pushes to `main`

### `scripts/manage_release.py`

CI helper that:

- reads `version.json`
- bumps the version
- updates `previous_commit`
- generates `RELEASE_NOTES.md`

### GitHub Actions

- `release.yml`: runs release-note generation and bumps `version.json`
- `homelab-docs.yml`: regenerates `homelab-docs/index.json`
- `deploy-pages.yml`: deploys the repo to GitHub Pages

---

## Configuration

### `version.json`

Tracks:

- semantic version components
- static release notes text
- `previous_commit` for release-note diffing

### `homelab-docs/index.json`

Generated file. Do not edit by hand.

---

## Operational Notes

- `main` is the canonical deployment branch.
- The deployed site depends on `index.html`, `homelab.html`, `css/main.css`, the four active JS files, and the three JSON files in `data/`.
- Release automation depends on `scripts/`, `version.json`, `.github/workflows/`, and `release-doc/`.
