# Lab Article Manager — Zebrafish Spatial Transcriptomics

A small internal tool for tracking, ingesting, and extracting structured data
from scientific articles about *Danio rerio* spatial transcriptomics.

## What it does

- **Search** Europe PMC for new articles (Danio rerio + spatial transcriptomics).
- **Library** of saved articles with manual entry and PDF upload.
- **Auto-fetch PDFs** from open-access PMC, or via your institution's
  EZproxy URL prefix (configured on the Settings page).
- **Claude extraction** of structured fields from each PDF:
  - biological markers (with dpf, tissue, cell type, expression)
  - cell types (with dpf, size in µm, anatomical location)
- **Browse + filter** markers and cells by age (dpf); export CSV.
- **ZFIN sync** — bulk-import zebrafish gene expression and anatomy from
  ZFIN's public download files, with stages auto-converted to dpf.

## Stack

- Python 3.10+
- FastAPI + SQLAlchemy + SQLite (backend)
- Streamlit (frontend)
- Anthropic SDK (`claude-opus-4-7`) for extraction
- Europe PMC REST API (free, no key) for search and open-access PDFs

## Run

```bash
./run.sh
```

This sets up a virtualenv, installs deps, starts FastAPI on
`http://localhost:8000` and Streamlit on `http://localhost:8501`.

## First-time configuration

Open **Settings** in the Streamlit sidebar and configure:

1. **Claude API key** — required for extraction.
2. **Institutional proxy URL prefix** (optional) — e.g.
   `https://login.ezproxy.your-uni.edu/login?url=`. If set, the app will
   append the article DOI URL when an open-access PDF isn't available.
3. **Proxy cookie** (optional) — only needed if your proxy uses session
   cookies; copy it from a logged-in browser session.

Settings are stored in the local SQLite DB (`data/lab.db`), not in code.

## Data model

- `articles` — bibliographic record + path to local PDF
- `markers` — one row per (article × marker × dpf)
- `cells` — one row per (article × cell type × dpf)

Both extracted tables include `article_id` so every value is traceable to
its source. Treat extractions as a first pass — review and correct them
before relying on the data.

## Notes

- PDF text extraction uses `pypdf`; figure-only data won't be captured.
- The default search query is editable on the Search page.
- Files in `data/` (DB and PDFs) are gitignored.
