from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from . import models, schemas, pubmed, extraction, pdf_utils, zfin
from .database import Base, engine, get_db, DATA_DIR

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Lab Article Manager", version="0.1.0")

PDF_DIR = DATA_DIR / "pdfs"


def _get_setting(db: Session, key: str) -> Optional[str]:
    s = db.get(models.Setting, key)
    return s.value if s else None


def _set_setting(db: Session, key: str, value: Optional[str]) -> None:
    s = db.get(models.Setting, key)
    if s is None:
        s = models.Setting(key=key, value=value)
        db.add(s)
    else:
        s.value = value
    db.commit()


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/search", response_model=List[schemas.SearchHit])
def search(q: Optional[str] = None, page_size: int = 25):
    return pubmed.search_articles(q, page_size=page_size)


@app.post("/articles", response_model=schemas.ArticleOut)
def create_article(payload: schemas.ArticleCreate, db: Session = Depends(get_db)):
    article = models.Article(**payload.model_dump())
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@app.get("/articles", response_model=List[schemas.ArticleOut])
def list_articles(db: Session = Depends(get_db)):
    return db.query(models.Article).order_by(models.Article.created_at.desc()).all()


@app.get("/articles/{article_id}", response_model=schemas.ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    a = db.get(models.Article, article_id)
    if not a:
        raise HTTPException(404, "article not found")
    return a


@app.delete("/articles/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db)):
    a = db.get(models.Article, article_id)
    if not a:
        raise HTTPException(404, "article not found")
    db.delete(a)
    db.commit()
    return {"ok": True}


@app.post("/articles/{article_id}/upload", response_model=schemas.ArticleOut)
def upload_pdf(article_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    a = db.get(models.Article, article_id)
    if not a:
        raise HTTPException(404, "article not found")
    content = file.file.read()
    fname = f"article_{article_id}_{file.filename}"
    path = pdf_utils.save_pdf(content, PDF_DIR, fname)
    a.pdf_path = path
    db.commit()
    db.refresh(a)
    return a


@app.post("/articles/{article_id}/fetch_pdf", response_model=schemas.ArticleOut)
def fetch_pdf(article_id: int, db: Session = Depends(get_db)):
    """Try open-access PMC first, then institutional proxy."""
    a = db.get(models.Article, article_id)
    if not a:
        raise HTTPException(404, "article not found")
    content = None
    if a.pmcid:
        content = pubmed.fetch_open_access_pdf(a.pmcid)
    if not content and a.doi:
        proxy = _get_setting(db, "institutional_proxy_prefix")
        cookie = _get_setting(db, "institutional_cookie")
        content = pubmed.fetch_via_institutional(a.doi, proxy, cookie)
    if not content:
        raise HTTPException(404, "PDF not available via open-access or configured institutional proxy")
    fname = f"article_{article_id}.pdf"
    a.pdf_path = pdf_utils.save_pdf(content, PDF_DIR, fname)
    db.commit()
    db.refresh(a)
    return a


@app.post("/articles/{article_id}/extract", response_model=schemas.ArticleOut)
def extract_article(article_id: int, db: Session = Depends(get_db)):
    a = db.get(models.Article, article_id)
    if not a:
        raise HTTPException(404, "article not found")
    if not a.pdf_path or not Path(a.pdf_path).exists():
        raise HTTPException(400, "no PDF on file; upload or fetch one first")
    api_key = _get_setting(db, "anthropic_api_key")
    if not api_key:
        raise HTTPException(400, "Claude API key not set; configure it on the Settings page")
    text = pdf_utils.extract_text(a.pdf_path)
    if not text.strip():
        raise HTTPException(400, "could not extract text from PDF")
    data = extraction.extract_from_text(text, api_key=api_key)

    db.query(models.Marker).filter(models.Marker.article_id == a.id).delete()
    db.query(models.CellRecord).filter(models.CellRecord.article_id == a.id).delete()

    for m in data.get("markers", []):
        if not m.get("marker_name"):
            continue
        db.add(models.Marker(
            article_id=a.id,
            marker_name=str(m["marker_name"]),
            dpf=m.get("dpf"),
            tissue=m.get("tissue"),
            cell_type=m.get("cell_type"),
            expression=m.get("expression"),
            notes=m.get("notes"),
        ))
    for c in data.get("cells", []):
        if not c.get("cell_type"):
            continue
        db.add(models.CellRecord(
            article_id=a.id,
            cell_type=str(c["cell_type"]),
            dpf=c.get("dpf"),
            size_um=c.get("size_um"),
            location=c.get("location"),
            notes=c.get("notes"),
        ))
    a.extracted_at = datetime.utcnow()
    db.commit()
    db.refresh(a)
    return a


@app.get("/markers", response_model=List[schemas.MarkerOut])
def list_markers(
    dpf_min: Optional[float] = None,
    dpf_max: Optional[float] = None,
    article_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Marker)
    if article_id is not None:
        q = q.filter(models.Marker.article_id == article_id)
    if dpf_min is not None:
        q = q.filter(models.Marker.dpf >= dpf_min)
    if dpf_max is not None:
        q = q.filter(models.Marker.dpf <= dpf_max)
    return q.order_by(models.Marker.dpf.asc().nullslast()).all()


@app.get("/cells", response_model=List[schemas.CellOut])
def list_cells(
    dpf_min: Optional[float] = None,
    dpf_max: Optional[float] = None,
    article_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.CellRecord)
    if article_id is not None:
        q = q.filter(models.CellRecord.article_id == article_id)
    if dpf_min is not None:
        q = q.filter(models.CellRecord.dpf >= dpf_min)
    if dpf_max is not None:
        q = q.filter(models.CellRecord.dpf <= dpf_max)
    return q.order_by(models.CellRecord.dpf.asc().nullslast()).all()


@app.get("/settings/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    return {"key": key, "value": _get_setting(db, key)}


@app.put("/settings")
def put_setting(payload: schemas.SettingIn, db: Session = Depends(get_db)):
    _set_setting(db, payload.key, payload.value)
    return {"ok": True}


ZFIN_ARTICLE_TITLE = "ZFIN Database (zfin.org)"


def _ensure_zfin_article(db: Session) -> models.Article:
    a = (
        db.query(models.Article)
        .filter(models.Article.source == "zfin", models.Article.title == ZFIN_ARTICLE_TITLE)
        .first()
    )
    if a:
        return a
    a = models.Article(
        title=ZFIN_ARTICLE_TITLE,
        authors="Zebrafish Information Network",
        journal="ZFIN bulk downloads",
        source="zfin",
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@app.post("/zfin/sync", response_model=schemas.ZfinSyncOut)
def zfin_sync(payload: schemas.ZfinSyncIn, db: Session = Depends(get_db)):
    article = _ensure_zfin_article(db)
    db.query(models.Marker).filter(models.Marker.article_id == article.id).delete()
    db.query(models.CellRecord).filter(models.CellRecord.article_id == article.id).delete()

    stage_map = zfin.load_stage_to_dpf()
    records = zfin.fetch_expression_records(
        stage_map, limit=payload.limit, gene_filter=payload.genes
    )

    seen_anatomy: set = set()
    n_markers = n_cells = 0
    for rec in records:
        dpf = None
        if rec["dpf_min"] is not None and rec["dpf_max"] is not None:
            dpf = (rec["dpf_min"] + rec["dpf_max"]) / 2.0
        elif rec["dpf_min"] is not None:
            dpf = rec["dpf_min"]

        anatomy = rec["sub_structure"] or rec["super_structure"]
        if rec["gene_symbol"]:
            db.add(models.Marker(
                article_id=article.id,
                marker_name=rec["gene_symbol"],
                dpf=dpf,
                tissue=anatomy,
                expression="reported (ZFIN)",
                notes=f"ZFIN {rec['gene_id']}".strip(),
            ))
            n_markers += 1

        if anatomy:
            key = (anatomy, dpf)
            if key not in seen_anatomy:
                seen_anatomy.add(key)
                db.add(models.CellRecord(
                    article_id=article.id,
                    cell_type=anatomy,
                    dpf=dpf,
                    location=rec["super_structure"],
                    notes="ZFIN anatomy expression site",
                ))
                n_cells += 1

    article.extracted_at = datetime.utcnow()
    db.commit()
    return schemas.ZfinSyncOut(
        markers_imported=n_markers,
        cells_imported=n_cells,
        stages_loaded=len(stage_map),
        article_id=article.id,
    )
