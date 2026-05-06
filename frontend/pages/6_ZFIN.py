import streamlit as st
import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))
import api_client as api

st.title("ZFIN sync")

st.markdown(
    """
Pull gene expression and anatomy data from **ZFIN** (Zebrafish Information Network)
and add it to your Markers and Cell Atlas, with stages converted to dpf.

- Source: `https://zfin.org/downloads` (`stage_ontology.txt`, `wildtype-expression_fish.txt`)
- ZFIN data is tagged under a synthetic article called *"ZFIN Database (zfin.org)"*
  in your Library, so it stays separate from data extracted from your own articles.
- Re-running the sync replaces the previous ZFIN import (it does not touch
  article-derived markers/cells).
"""
)

st.divider()

c1, c2 = st.columns(2)
with c1:
    limit = st.number_input(
        "Row limit (0 = no limit)",
        min_value=0, value=5000, step=1000,
        help="ZFIN's expression file is large. Start with a few thousand rows; raise later.",
    )
with c2:
    gene_text = st.text_input(
        "Filter to genes (comma-separated, optional)",
        placeholder="sox2, pax6, neurod1",
    )

st.caption("First sync downloads ~tens of MB from ZFIN — it can take a minute.")

if st.button("Run ZFIN sync", type="primary"):
    genes = [g.strip() for g in gene_text.split(",") if g.strip()] or None
    with st.spinner("Downloading and importing ZFIN data..."):
        res = api.zfin_sync(limit=(limit or None), genes=genes)
    if "error" in res:
        st.error(res["error"])
    else:
        st.success(
            f"Imported {res['markers_imported']} markers and "
            f"{res['cells_imported']} cell-atlas entries "
            f"(stages loaded: {res['stages_loaded']})."
        )
        st.info("Open the Markers and Cell Atlas pages to browse the new data.")
