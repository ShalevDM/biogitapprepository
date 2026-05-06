import os
import streamlit as st

st.set_page_config(page_title="Lab Article Manager", page_icon=":fish:", layout="wide")

API_URL = os.environ.get("API_URL", "http://localhost:8000")
st.session_state.setdefault("api_url", API_URL)

st.title("Zebrafish Spatial Transcriptomics — Lab Article Manager")
st.markdown(
    """
Use the pages in the sidebar:

- **Search** — find new articles on Europe PMC (Danio rerio + spatial transcriptomics).
- **Library** — your saved articles, upload PDFs, run extraction.
- **Markers** — biological markers organised by age (dpf).
- **Cell Atlas** — cell sizes and anatomical locations by age (dpf).
- **Settings** — Claude API key and institutional proxy configuration.
"""
)

st.sidebar.markdown(f"**API:** `{st.session_state['api_url']}`")
