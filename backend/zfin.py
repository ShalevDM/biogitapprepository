"""ZFIN bulk-download import.

ZFIN publishes tab-separated files at https://zfin.org/downloads.
We use:
  - stage_ontology.txt           -> stage ID/name -> hours -> dpf
  - wildtype-expression_fish.txt -> gene/marker x anatomy x stages

Notes:
- The expression file can be large (tens of MB). We download to memory and
  optionally cap import with `limit`.
- ZFIN occasionally adjusts column counts. We match columns by header name
  when a header row is present, and fall back to defensive heuristics.
"""
from __future__ import annotations
from typing import Dict, Iterator, List, Optional, Tuple

import httpx

ZFIN_DOWNLOAD_BASE = "https://zfin.org/downloads"
STAGE_URL = f"{ZFIN_DOWNLOAD_BASE}/stage_ontology.txt"
EXPRESSION_URL = f"{ZFIN_DOWNLOAD_BASE}/wildtype-expression_fish.txt"


def _download(url: str) -> str:
    with httpx.Client(timeout=300.0, follow_redirects=True) as client:
        r = client.get(url, headers={"User-Agent": "lab-article-manager/0.1"})
        r.raise_for_status()
        return r.text


def _split_rows(text: str) -> Iterator[List[str]]:
    for line in text.splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        yield line.split("\t")


def _detect_header(cols: List[str]) -> bool:
    joined = " ".join(c.lower() for c in cols)
    return any(k in joined for k in ("stage", "gene", "begin", "hours", "structure"))


def _column_index(header: List[str], *needles: str) -> Optional[int]:
    for i, c in enumerate(header):
        cl = c.lower()
        if all(n in cl for n in needles):
            return i
    return None


def load_stage_to_dpf() -> Dict[str, Tuple[float, float]]:
    """Return {stage_key_lower: (dpf_min, dpf_max)}.

    Keys include both the stage ID and the stage name (lowercased) so callers
    can look up by either.
    """
    text = _download(STAGE_URL)
    rows = list(_split_rows(text))
    if not rows:
        return {}

    header_idx = None
    if _detect_header(rows[0]):
        header_idx = 0

    begin_col = end_col = None
    if header_idx is not None:
        h = rows[header_idx]
        begin_col = _column_index(h, "begin")
        end_col = _column_index(h, "end")

    out: Dict[str, Tuple[float, float]] = {}
    data_rows = rows[1:] if header_idx is not None else rows
    for cols in data_rows:
        if len(cols) < 3:
            continue
        try:
            if begin_col is not None and end_col is not None and end_col < len(cols):
                begin_h = float(cols[begin_col])
                end_h = float(cols[end_col])
            else:
                begin_h = float(cols[-2])
                end_h = float(cols[-1])
        except ValueError:
            continue
        rng = (begin_h / 24.0, end_h / 24.0)
        for c in cols[:-2] if begin_col is None else (cols[i] for i in range(len(cols)) if i not in (begin_col, end_col)):
            if c:
                out[c.lower()] = rng
    return out


def fetch_expression_records(
    stage_to_dpf: Dict[str, Tuple[float, float]],
    limit: Optional[int] = None,
    gene_filter: Optional[List[str]] = None,
) -> List[dict]:
    """Returns: [{gene_id, gene_symbol, super_structure, sub_structure,
                  start_stage, end_stage, dpf_min, dpf_max}].
    """
    text = _download(EXPRESSION_URL)
    rows = list(_split_rows(text))
    if not rows:
        return []

    header_idx = 0 if _detect_header(rows[0]) else None
    h = rows[header_idx] if header_idx is not None else None

    if h:
        gene_id_col = _column_index(h, "gene", "id") or 0
        gene_sym_col = _column_index(h, "gene", "symbol") or 1
        super_id_col = _column_index(h, "super", "id")
        super_name_col = _column_index(h, "super", "name")
        sub_id_col = _column_index(h, "sub", "id")
        sub_name_col = _column_index(h, "sub", "name")
        start_stage_col = _column_index(h, "start", "stage")
        end_stage_col = _column_index(h, "end", "stage")
    else:
        gene_id_col, gene_sym_col = 0, 1
        super_id_col, super_name_col = 4, 5
        sub_id_col, sub_name_col = 6, 7
        start_stage_col, end_stage_col = 8, 9

    gene_filter_l = {g.lower() for g in gene_filter} if gene_filter else None

    def _g(cols, idx):
        if idx is None or idx >= len(cols):
            return None
        return cols[idx].strip() or None

    out: List[dict] = []
    data_rows = rows[1:] if header_idx is not None else rows
    for cols in data_rows:
        if limit and len(out) >= limit:
            break
        if len(cols) < max(gene_sym_col, gene_id_col) + 1:
            continue
        gene_id = _g(cols, gene_id_col) or ""
        gene_symbol = _g(cols, gene_sym_col) or ""
        if not gene_symbol and not gene_id:
            continue
        if gene_filter_l and gene_symbol.lower() not in gene_filter_l and gene_id.lower() not in gene_filter_l:
            continue

        super_struct = _g(cols, super_name_col)
        sub_struct = _g(cols, sub_name_col)
        start_stage = _g(cols, start_stage_col)
        end_stage = _g(cols, end_stage_col)

        dpf_min = dpf_max = None
        for s in (start_stage, end_stage):
            if not s:
                continue
            rng = stage_to_dpf.get(s.lower())
            if not rng:
                continue
            if dpf_min is None or rng[0] < dpf_min:
                dpf_min = rng[0]
            if dpf_max is None or rng[1] > dpf_max:
                dpf_max = rng[1]

        out.append({
            "gene_id": gene_id,
            "gene_symbol": gene_symbol,
            "super_structure": super_struct,
            "sub_structure": sub_struct,
            "start_stage": start_stage,
            "end_stage": end_stage,
            "dpf_min": dpf_min,
            "dpf_max": dpf_max,
        })
    return out
