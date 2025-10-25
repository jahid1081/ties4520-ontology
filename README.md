# TV Knowledge Graph (GitHub Pages)
**Owner:** `jahid1081`  
**Live path:** `https://jahid1081.github.io/`

This is a complete starter:
- **Ontology:** `docs/ontology.ttl` (expanded OWL)
- **Individuals:** `docs/individuals.ttl` (Poker Face, The Bear, The Boys)
- **HTML:** `docs/index.html`
- **XHTML+RDFa:** `docs/shows.xhtml` (single page) + per-series pages
- **Dark theme:** `docs/styles.css`
- **Queries:** `docs/queries.rq`
- **Rules (N3):** `docs/rules.n3` + `docs/eye-results.n3`
- **N3 mirrors:** `docs/ontology.n3`, `docs/individuals.n3`

## Namespaces
```ttl
@prefix onto: <https://jahid1081.github.io/docs/ontology.ttl#> .
@prefix ind:  <https://jahid1081.github.io/docs/individuals.ttl#> .
```

## Publish
Create repo **`jahid1081.github.io`** (Public). Put `docs/` at the root and push to `main`.  
Open: `https://jahid1081.github.io/`

## GraphDB
1. Create a repository.
2. Import in order: `docs/ontology.ttl`, `docs/individuals.ttl`, (optional) `docs/eye-results.n3`.
3. Copy queries from `docs/queries.rq` and run them; export results for your report.

## EYE reasoning (Task f4 alternative to CWM)
```bash
# Use official EYE binary or npm tool
eye docs/individuals.ttl docs/rules.n3 --n3 > docs/eye-results.n3
```
Then verify inferred facts (e.g., `onto:contributedTo`) with SPARQL.

## Notes
- External poster URLs are used; CSP + `referrerpolicy="no-referrer"` are added so they load on GitHub Pages.
- People are typed by role (`onto:Director`, `onto:Writer`, `onto:Showrunner`) to satisfy property ranges.
