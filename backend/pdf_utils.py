from pathlib import Path
from pypdf import PdfReader


def extract_text(pdf_path: str, max_chars: int = 120_000) -> str:
    reader = PdfReader(str(pdf_path))
    chunks = []
    total = 0
    for page in reader.pages:
        try:
            t = page.extract_text() or ""
        except Exception:
            t = ""
        chunks.append(t)
        total += len(t)
        if total >= max_chars:
            break
    return "\n".join(chunks)[:max_chars]


def save_pdf(content: bytes, dest_dir: Path, filename: str) -> str:
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)
    if not safe.lower().endswith(".pdf"):
        safe += ".pdf"
    path = dest_dir / safe
    path.write_bytes(content)
    return str(path)
