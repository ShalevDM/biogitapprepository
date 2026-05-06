"""Claude-based extraction of structured fields from article text.

Schema:
  markers: [{marker_name, dpf, tissue, cell_type, expression, notes}]
  cells:   [{cell_type, dpf, size_um, location, notes}]
"""
import json
from typing import Dict, Any, Optional
from anthropic import Anthropic

MODEL = "claude-opus-4-7"

SYSTEM_PROMPT = """You extract structured biological data from zebrafish (Danio rerio)
spatial transcriptomics articles.

Return ONLY valid JSON with two top-level keys: "markers" and "cells".

- markers: each item describes a biological marker (gene/protein) reported in the article.
  Fields: marker_name (string, required), dpf (number or null - days post fertilization),
  tissue (string or null), cell_type (string or null),
  expression (string or null - e.g. "high", "low", "absent"),
  notes (string or null - one short sentence).

- cells: each item describes a cell type with size and/or anatomical location.
  Fields: cell_type (string, required), dpf (number or null),
  size_um (number or null - cell size in micrometers),
  location (string or null - anatomical location),
  notes (string or null - one short sentence).

If the article does not report a value, use null. Do NOT invent values.
If the article reports a range like "3-5 dpf", record the lower bound (3).
Do not include any text outside the JSON object.
"""


def extract_from_text(text: str, api_key: str, model: str = MODEL) -> Dict[str, Any]:
    if not api_key:
        raise ValueError("Claude API key not configured. Set it on the Settings page.")
    client = Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": text[:120_000]}],
    )
    raw = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(raw[start : end + 1])
        else:
            raise
    data.setdefault("markers", [])
    data.setdefault("cells", [])
    return data
