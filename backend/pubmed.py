import httpx
from typing import List, Optional
from .schemas import SearchHit

EUROPE_PMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest"

DEFAULT_QUERY = '("Danio rerio" OR zebrafish) AND ("spatial transcriptomics" OR "spatial transcriptome")'


def search_articles(query: Optional[str] = None, page_size: int = 25) -> List[SearchHit]:
    q = query or DEFAULT_QUERY
    params = {"query": q, "format": "json", "pageSize": page_size, "resultType": "core"}
    with httpx.Client(timeout=30.0) as client:
        r = client.get(f"{EUROPE_PMC_BASE}/search", params=params)
        r.raise_for_status()
        data = r.json()
    hits: List[SearchHit] = []
    for item in data.get("resultList", {}).get("result", []):
        authors = item.get("authorString")
        year = item.get("pubYear")
        try:
            year_int = int(year) if year else None
        except ValueError:
            year_int = None
        hits.append(
            SearchHit(
                pmid=item.get("pmid"),
                pmcid=item.get("pmcid"),
                doi=item.get("doi"),
                title=item.get("title", "(untitled)"),
                authors=authors,
                journal=item.get("journalTitle"),
                year=year_int,
                abstract=item.get("abstractText"),
                has_pdf=item.get("isOpenAccess") == "Y" or bool(item.get("pmcid")),
            )
        )
    return hits


def fetch_open_access_pdf(pmcid: str) -> Optional[bytes]:
    if not pmcid:
        return None
    pmcid = pmcid if pmcid.startswith("PMC") else f"PMC{pmcid}"
    url = f"{EUROPE_PMC_BASE}/{pmcid}/fullTextPDF"
    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        r = client.get(url)
        if r.status_code == 200 and r.headers.get("content-type", "").startswith("application/pdf"):
            return r.content
    return None


def fetch_via_institutional(doi: str, proxy_prefix: Optional[str], cookie: Optional[str]) -> Optional[bytes]:
    """Attempt to fetch a PDF using an institutional proxy.

    proxy_prefix example: 'https://login.ezproxy.your-uni.edu/login?url='
    cookie: optional Cookie header value if your proxy uses session cookies
    """
    if not doi or not proxy_prefix:
        return None
    target = f"https://doi.org/{doi}"
    url = proxy_prefix + target
    headers = {"User-Agent": "lab-article-manager/0.1"}
    if cookie:
        headers["Cookie"] = cookie
    try:
        with httpx.Client(timeout=60.0, follow_redirects=True, headers=headers) as client:
            r = client.get(url)
            ctype = r.headers.get("content-type", "")
            if r.status_code == 200 and "application/pdf" in ctype:
                return r.content
    except httpx.HTTPError:
        return None
    return None
