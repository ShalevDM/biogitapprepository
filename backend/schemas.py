from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MarkerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    article_id: int
    marker_name: str
    dpf: Optional[float] = None
    tissue: Optional[str] = None
    cell_type: Optional[str] = None
    expression: Optional[str] = None
    notes: Optional[str] = None


class CellOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    article_id: int
    cell_type: str
    dpf: Optional[float] = None
    size_um: Optional[float] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    pmid: Optional[str] = None
    pmcid: Optional[str] = None
    doi: Optional[str] = None
    title: str
    authors: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    pdf_path: Optional[str] = None
    source: str
    created_at: datetime
    extracted_at: Optional[datetime] = None


class ArticleCreate(BaseModel):
    pmid: Optional[str] = None
    pmcid: Optional[str] = None
    doi: Optional[str] = None
    title: str
    authors: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    source: str = "manual"


class SearchHit(BaseModel):
    pmid: Optional[str] = None
    pmcid: Optional[str] = None
    doi: Optional[str] = None
    title: str
    authors: Optional[str] = None
    journal: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    has_pdf: bool = False


class SettingIn(BaseModel):
    key: str
    value: Optional[str] = None
