from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True)
    pmid = Column(String, index=True, nullable=True)
    pmcid = Column(String, index=True, nullable=True)
    doi = Column(String, index=True, nullable=True)
    title = Column(Text, nullable=False)
    authors = Column(Text, nullable=True)
    journal = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    abstract = Column(Text, nullable=True)
    pdf_path = Column(String, nullable=True)
    source = Column(String, default="manual")
    created_at = Column(DateTime, default=datetime.utcnow)
    extracted_at = Column(DateTime, nullable=True)

    markers = relationship("Marker", back_populates="article", cascade="all, delete-orphan")
    cells = relationship("CellRecord", back_populates="article", cascade="all, delete-orphan")


class Marker(Base):
    __tablename__ = "markers"
    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id"), index=True)
    marker_name = Column(String, index=True, nullable=False)
    dpf = Column(Float, index=True, nullable=True)
    tissue = Column(String, nullable=True)
    cell_type = Column(String, nullable=True)
    expression = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    article = relationship("Article", back_populates="markers")


class CellRecord(Base):
    __tablename__ = "cells"
    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id"), index=True)
    cell_type = Column(String, index=True, nullable=False)
    dpf = Column(Float, index=True, nullable=True)
    size_um = Column(Float, nullable=True)
    location = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    article = relationship("Article", back_populates="cells")


class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)
