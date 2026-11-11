# raborn-decision-sciences
[![Netlify Status](https://api.netlify.com/api/v1/badges/9089e14d-2b3f-4ee8-ac49-fe180acb61fd/deploy-status)](https://app.netlify.com/projects/raborn-decision-sciences/deploys)

The website for Raborn Decision Sciences. We help individuals and organizations translate complex measurement, operational, and planning questions into defensible analyses, reproducible workflows, and usable decision-support tools.
## The interactive CV (`cv/`)

`cv/` is a copy of the portfolio site in `~/projects-with-claude/portfolio-site`, served at
`/cv/` and linked from the About page. Quarto copies it without rendering it, because
`_quarto.yml` lists `cv/**` under `project.resources`. Do not edit it here: make changes in
the portfolio repo, then run `./sync-to-rds.sh` from there to refresh this copy.
