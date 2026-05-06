import streamlit as st
import pandas as pd
import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))
import api_client as api

st.title("Cell sizes & locations by age (dpf)")

c1, c2 = st.columns(2)
with c1:
    dpf_min = st.number_input("Min dpf", min_value=0.0, value=0.0, step=0.5)
with c2:
    dpf_max = st.number_input("Max dpf", min_value=0.0, value=30.0, step=0.5)

try:
    rows = api.list_cells(dpf_min=dpf_min, dpf_max=dpf_max)
except Exception as e:
    st.error(f"Could not load cells: {e}")
    rows = []

if not rows:
    st.info("No cell records yet. Add articles in Library and run extraction.")
else:
    df = pd.DataFrame(rows)
    df = df[["dpf", "cell_type", "size_um", "location", "notes", "article_id"]]
    df = df.sort_values(["dpf", "cell_type"], na_position="last")
    st.dataframe(df, use_container_width=True, hide_index=True)
    st.download_button("Export CSV", df.to_csv(index=False).encode(), "cells.csv", "text/csv")
