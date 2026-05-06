import streamlit as st
import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))
import api_client as api

st.title("Library")

with st.expander("Add article manually"):
    with st.form("manual_add"):
        title = st.text_input("Title *")
        authors = st.text_input("Authors")
        journal = st.text_input("Journal")
        year = st.number_input("Year", min_value=1900, max_value=2100, value=2025, step=1)
        doi = st.text_input("DOI")
        pmid = st.text_input("PMID")
        pmcid = st.text_input("PMCID")
        abstract = st.text_area("Abstract")
        if st.form_submit_button("Add", type="primary"):
            if not title.strip():
                st.error("Title is required.")
            else:
                api.create_article({
                    "title": title, "authors": authors or None, "journal": journal or None,
                    "year": int(year), "doi": doi or None, "pmid": pmid or None,
                    "pmcid": pmcid or None, "abstract": abstract or None, "source": "manual",
                })
                st.success("Added.")
                st.rerun()

st.divider()

try:
    articles = api.list_articles()
except Exception as e:
    st.error(f"Could not load articles: {e}")
    articles = []

st.write(f"{len(articles)} articles in library")

for a in articles:
    with st.expander(f"[{a.get('year') or '?'}] {a['title']}"):
        st.markdown(f"**Authors:** {a.get('authors') or '—'}")
        st.markdown(f"**Journal:** {a.get('journal') or '—'}")
        ids = []
        if a.get("pmid"): ids.append(f"PMID {a['pmid']}")
        if a.get("pmcid"): ids.append(f"PMCID {a['pmcid']}")
        if a.get("doi"): ids.append(f"DOI {a['doi']}")
        st.caption(" · ".join(ids) or "—")
        st.caption(f"PDF: {'on file' if a.get('pdf_path') else 'not uploaded'} · Extracted: {a.get('extracted_at') or 'no'}")

        c1, c2, c3, c4 = st.columns(4)
        with c1:
            up = st.file_uploader("Upload PDF", type=["pdf"], key=f"up_{a['id']}", label_visibility="collapsed")
            if up is not None and st.button("Save PDF", key=f"savepdf_{a['id']}"):
                api.upload_pdf(a["id"], up.name, up.read())
                st.success("PDF saved.")
                st.rerun()
        with c2:
            if st.button("Fetch PDF (open-access / proxy)", key=f"fetch_{a['id']}"):
                res = api.fetch_pdf(a["id"])
                if "error" in res:
                    st.error(res["error"])
                else:
                    st.success("PDF fetched.")
                    st.rerun()
        with c3:
            if st.button("Extract data", key=f"ex_{a['id']}", disabled=not a.get("pdf_path")):
                res = api.extract(a["id"])
                if "error" in res:
                    st.error(res["error"])
                else:
                    st.success("Extraction complete.")
                    st.rerun()
        with c4:
            if st.button("Delete", key=f"del_{a['id']}"):
                api.delete_article(a["id"])
                st.rerun()
