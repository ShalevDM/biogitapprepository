import streamlit as st
import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))
import api_client as api

st.title("Search Europe PMC")

default_q = '("Danio rerio" OR zebrafish) AND ("spatial transcriptomics" OR "spatial transcriptome")'
q = st.text_area("Query", value=default_q, height=80)
page_size = st.slider("Results", 5, 100, 25)

if st.button("Search", type="primary"):
    try:
        st.session_state["search_results"] = api.search(q, page_size=page_size)
    except Exception as e:
        st.error(f"Search failed: {e}")

results = st.session_state.get("search_results", [])
if results:
    st.write(f"{len(results)} results")
    for i, hit in enumerate(results):
        with st.expander(f"{hit.get('year') or '?'} — {hit.get('title','(untitled)')}"):
            st.markdown(f"**Authors:** {hit.get('authors') or '—'}")
            st.markdown(f"**Journal:** {hit.get('journal') or '—'}")
            ids = []
            if hit.get("pmid"): ids.append(f"PMID: {hit['pmid']}")
            if hit.get("pmcid"): ids.append(f"PMCID: {hit['pmcid']}")
            if hit.get("doi"): ids.append(f"DOI: {hit['doi']}")
            st.markdown(" · ".join(ids) or "—")
            if hit.get("abstract"):
                st.caption(hit["abstract"][:1200] + ("..." if len(hit["abstract"]) > 1200 else ""))
            if st.button("Save to library", key=f"save_{i}"):
                payload = {k: hit.get(k) for k in ["pmid","pmcid","doi","title","authors","journal","year","abstract"]}
                payload["source"] = "europepmc"
                try:
                    api.create_article(payload)
                    st.success("Saved.")
                except Exception as e:
                    st.error(f"Save failed: {e}")
