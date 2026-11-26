# GVS Robotics website

Static GitHub Pages site for the GVS Robotics organization.

## Add a new project

1. Open `projects/projects.json`.
2. Duplicate one project object and edit its fields. Give it a unique lowercase `slug`, such as `new-project`.
3. Copy `projects/_template/` to `projects/new-project/`.
4. In the copied `index.html`, replace `PROJECT_SLUG` with `new-project`.
5. Commit and push. The landing-page card and project page will both appear automatically.

### Interactive explainer pages

Some projects have a hand-written page instead of the generated template:
`projects/coal/` and `projects/dcolpp/`. Each has an `index.html` (content) and a
`demo.js` (2D demos). They share:

- `assets/geom2d.js`: small 2D convex-geometry toolkit (signed distance, Minkowski
  difference, scale-to-touch) and canvas helpers used by the demos
- `assets/explainer.js`: on-demand playground embed, copy buttons, and the
  table of contents
- the `Explainer project pages` block at the end of `assets/styles.css`

Their `projects.json` entries still drive the landing-page cards.

### Project data fields

- `slug`: URL folder name
- `name`: display name
- `language`: badge text
- `accent`: CSS color
- `shortDescription`: landing-page card text
- `kicker`, `description`, `body`: project page copy
- `features`: bullet list
- `links`: project buttons
- `facts`: three compact facts at the bottom

## Local preview

From this folder, run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
