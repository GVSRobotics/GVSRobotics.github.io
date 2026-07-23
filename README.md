# GVS Robotics website

Static GitHub Pages site for the GVS Robotics organization.

## Add a new project

1. Open `projects/projects.json`.
2. Duplicate one project object and edit its fields. Give it a unique lowercase `slug`, such as `new-project`.
3. Copy `projects/_template/` to `projects/new-project/`.
4. In the copied `index.html`, replace `PROJECT_SLUG` with `new-project`.
5. Commit and push. The landing-page card and project page will both appear automatically.

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
