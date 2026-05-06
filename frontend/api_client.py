import os
import httpx
import streamlit as st

DEFAULT_API = os.environ.get("API_URL", "http://localhost:8000")


def base_url() -> str:
    return st.session_state.get("api_url", DEFAULT_API)


def _client():
    return httpx.Client(base_url=base_url(), timeout=120.0)


def search(q: str, page_size: int = 25):
    with _client() as c:
        r = c.get("/search", params={"q": q, "page_size": page_size})
        r.raise_for_status()
        return r.json()


def list_articles():
    with _client() as c:
        r = c.get("/articles")
        r.raise_for_status()
        return r.json()


def create_article(payload: dict):
    with _client() as c:
        r = c.post("/articles", json=payload)
        r.raise_for_status()
        return r.json()


def delete_article(article_id: int):
    with _client() as c:
        r = c.delete(f"/articles/{article_id}")
        r.raise_for_status()
        return r.json()


def upload_pdf(article_id: int, filename: str, content: bytes):
    with _client() as c:
        r = c.post(
            f"/articles/{article_id}/upload",
            files={"file": (filename, content, "application/pdf")},
        )
        r.raise_for_status()
        return r.json()


def fetch_pdf(article_id: int):
    with _client() as c:
        r = c.post(f"/articles/{article_id}/fetch_pdf")
        if r.status_code >= 400:
            return {"error": r.json().get("detail", r.text)}
        return r.json()


def extract(article_id: int):
    with _client() as c:
        r = c.post(f"/articles/{article_id}/extract")
        if r.status_code >= 400:
            return {"error": r.json().get("detail", r.text)}
        return r.json()


def list_markers(dpf_min=None, dpf_max=None, article_id=None):
    params = {k: v for k, v in {"dpf_min": dpf_min, "dpf_max": dpf_max, "article_id": article_id}.items() if v is not None}
    with _client() as c:
        r = c.get("/markers", params=params)
        r.raise_for_status()
        return r.json()


def list_cells(dpf_min=None, dpf_max=None, article_id=None):
    params = {k: v for k, v in {"dpf_min": dpf_min, "dpf_max": dpf_max, "article_id": article_id}.items() if v is not None}
    with _client() as c:
        r = c.get("/cells", params=params)
        r.raise_for_status()
        return r.json()


def get_setting(key: str):
    with _client() as c:
        r = c.get(f"/settings/{key}")
        r.raise_for_status()
        return r.json().get("value")


def set_setting(key: str, value: str | None):
    with _client() as c:
        r = c.put("/settings", json={"key": key, "value": value})
        r.raise_for_status()
        return r.json()
