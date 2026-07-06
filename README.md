# jescamilla1.github.io

Personal portfolio site for Joan Escamilla — Software Engineer at RDE Systems,
building production AI agents. Live at
[jescamilla1.github.io](https://jescamilla1.github.io).

Static site, no build step — plain HTML/CSS/JS.

## Contents

- `index.html` / `index.css` / `index.js` — the site itself: hero, about,
  experience timeline, certifications, selected projects, and a writing/
  articles list.
- `articles/` — longer-form writeups linked from the Projects and Writing
  sections (AI agent case studies, a harmonic-pattern-detection deep dive,
  a local-AI-agent build log, and essays on mentorship and judgment in AI
  tools).
- `Logos/` — company/institution logos used in the experience and
  credentials sections.

## Running locally

No dependencies or build step — open `index.html` directly in a browser, or
serve the folder with any static file server:

```bash
python -m http.server 8000
```
