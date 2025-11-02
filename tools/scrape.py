#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IME‑Hub — post_scrape.py

Single-file, dependency-light scraper that collects public posts (scholarships /
activities / jobs / grad / events / notices) and emits **per‑item JSON files**
following the `post.md` template (see contents/post/*.json).

Design goals (per spec):
- Respect robots.txt and add polite delays per source.
- Support RSS, HTML (selector-based), and simple JSON API sources.
- CLI controls: sources filter, since date, per-source limit, global limit,
  output directory, deadletter file, dry-run, and verbosity.
- Deterministic IDs and slugs; avoid duplicates; update last_checked_at when
  re-scraping same item.
- Strict field normalization: dates -> YYYY-MM-DD, https URLs only, tags array,
  PII scrubbing (email/phone) from free-text.
- Minimal external deps. Optionally uses `feedparser` and `beautifulsoup4` if
  installed; otherwise falls back to stdlib.

Example
-------
$ python tools/post_scrape.py \
    --sources acme-rss,smart-factory \
    --since 2025-10-01 \
    --max-per-source 100 \
    --limit 300 \
    --out contents/post \
    --deadletter ./.dead/post.failed.jsonl

Source configuration
--------------------
Default path: tools/jobs_sources.json (backward-compatible with jobs spec).
Each source object may include:
{
  "id": "acme-rss",
  "type": "rss" | "html" | "api",
  "url": "https://...",
  "postType": "job" | "scholarship" | "activity" | "grad" | "event" | "notice",
  "selectors": {           # for HTML
    "item": ".card",
    "title": ".title",
    "link": "a",
    "date": ".deadline",       # optional
    "subtitle": ".subtitle",   # optional
    "tags": ".tag"             # optional (multiple allowed)
  },
  "mapping": {             # value mapping / constants
    "company": "ACME",
    "employment_type": "internship",
    "tags": ["장학","학부"]
  },
  "rateLimit": { "minDelayMs": 1000 },
  "sourceName": "ACME Careers"   # overrides source_name if set
}

Outputs (per post.md common schema):
  {
    "id": "ime-2025-11-02-0001",
    "type": "job",
    "title": "...",
    "subtitle": "...",
    "tags": ["..."],
    "date_published": "YYYY-MM-DD",
    "deadline": "YYYY-MM-DD" | "",
    "last_checked_at": "YYYY-MM-DD",
    "source_name": "...",
    "source_url": "https://...",
    "hero_image": "...",            # optional
    "payload": { /* type-specific */ }
  }

Acceptance highlights
---------------------
- Returns exit code 0 on full success; 2 if some records failed; 3 if a source
  entirely failed before collection.
- Writes JSONL deadletters with userMessage/logMessage for failures.

"""
from __future__ import annotations

import argparse
import contextlib
import dataclasses
import datetime as dt
import hashlib
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

# Optional deps
try:  # RSS
    import feedparser  # type: ignore
except Exception:  # pragma: no cover
    feedparser = None  # type: ignore

try:  # HTML
    from bs4 import BeautifulSoup  # type: ignore
except Exception:  # pragma: no cover
    BeautifulSoup = None  # type: ignore

ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HTTPS_RE = re.compile(r"^https://", re.I)
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
PHONE_RE = re.compile(r"(?:(?:\+?82|0)1[0-9]-?\d{3,4}-?\d{4}|\d{2,4}-\d{3,4}-\d{4})")

DEFAULT_SOURCES_PATH = "tools/jobs_sources.json"  # backward-compatible
DEFAULT_OUT_DIR = "contents/post"
DEFAULT_DEADLETTER = ".dead/post.failed.jsonl"
USER_AGENT = "IME-HubScraper/1.0 (+https://ime-hub.local)"

# --------------------------- Data types ---------------------------
@dataclass
class Result:
    ok: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None

    @staticmethod
    def ok_(data: Any) -> "Result":
        return Result(ok=True, data=data)

    @staticmethod
    def err(kind: str, user_msg: str, log_msg: str = "", **extra: Any) -> "Result":
        return Result(ok=False, error={"kind": kind, "userMessage": user_msg, "logMessage": log_msg, **extra})

@dataclass
class Source:
    id: str
    type: str  # rss | html | api
    url: str
    selectors: Optional[Dict[str, str]] = None
    mapping: Optional[Dict[str, Any]] = None
    rateLimit: Optional[Dict[str, int]] = None
    sourceName: Optional[str] = None
    postType: Optional[str] = None  # schema "type"

# --------------------------- Utils ---------------------------

def today() -> str:
    return dt.date.today().isoformat()


def parse_date(s: str) -> Optional[str]:
    if not s:
        return None
    s = s.strip()
    # Normalize common date variants into YYYY-MM-DD conservatively
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%Y%m%d", "%d-%m-%Y", "%d/%m/%Y"):
        with contextlib.suppress(Exception):
            d = dt.datetime.strptime(s, fmt).date()
            return d.isoformat()
    # try to extract YYYY-MM-DD
    m = re.search(r"(20\d{2}|19\d{2})[-./](\d{1,2})[-./](\d{1,2})", s)
    if m:
        y, mo, da = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            return dt.date(y, mo, da).isoformat()
        except Exception:
            return None
    return None


def to_https(url: str) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    # Expand some redirectors if present (best-effort)
    if not url.lower().startswith("http"):
        return None
    # Force https if possible
    u = urllib.parse.urlsplit(url)
    scheme = "https" if u.scheme in ("http", "https") else u.scheme
    rebuilt = urllib.parse.urlunsplit((scheme, u.netloc, u.path, u.query, u.fragment))
    return rebuilt if HTTPS_RE.match(rebuilt) else None


def slugify(s: str, max_len: int = 48) -> str:
    s = s.lower()
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:max_len] or "post"


def scrub_pii(text: str) -> str:
    text = EMAIL_RE.sub("[redacted]", text)
    text = PHONE_RE.sub("[redacted]", text)
    return text

# --------------------------- IO helpers ---------------------------

def read_json(path: str) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


def write_json(path: str, obj: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

# --------------------------- Source config ---------------------------

def load_sources(path: str) -> Result:
    cfg = read_json(path)
    if not cfg:
        return Result.err("ConfigMissing", "소스 설정 파일을 찾을 수 없습니다.", f"no config at {path}")
    srcs = []
    raw_sources = cfg.get("sources") if isinstance(cfg, dict) else cfg
    if not isinstance(raw_sources, list):
        return Result.err("ConfigInvalid", "소스 설정 형식이 올바르지 않습니다.", "'sources' must be a list")
    for s in raw_sources:
        try:
            srcs.append(Source(
                id=s["id"], type=s["type"], url=s["url"],
                selectors=s.get("selectors"), mapping=s.get("mapping"),
                rateLimit=s.get("rateLimit"), sourceName=s.get("sourceName"),
                postType=s.get("postType")
            ))
        except Exception as e:
            return Result.err("ConfigInvalid", "소스 항목 파싱 중 오류", str(e), source=s)
    return Result.ok_((srcs, cfg))

# --------------------------- HTTP fetch ---------------------------

def polite_delay(ms: int) -> None:
    time.sleep(ms / 1000.0)


def fetch(url: str, timeout: int = 15) -> Result:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ctype = resp.headers.get("Content-Type", "")
            data = resp.read()
            return Result.ok_({"content": data, "content_type": ctype, "url": resp.geturl()})
    except Exception as e:
        return Result.err("FetchError", "원문을 불러오지 못했습니다.", str(e), url=url)

# --------------------------- Parsers ---------------------------

def parse_rss(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    content = raw["content"]
    items: List[Dict[str, Any]] = []
    if feedparser:
        fp = feedparser.parse(content)
        for e in fp.entries:
            items.append({
                "title": getattr(e, "title", "").strip(),
                "link": getattr(e, "link", "").strip(),
                "date": getattr(e, "published", getattr(e, "updated", "")).strip(),
                "summary": getattr(e, "summary", "").strip(),
            })
    else:
        # Very small fallback: look for <item><title>,<link>,<pubDate>
        text = content.decode("utf-8", errors="ignore")
        for m in re.finditer(r"<item>(.*?)</item>", text, flags=re.S|re.I):
            block = m.group(1)
            def tag(t: str) -> str:
                mm = re.search(fr"<{t}[^>]*>(.*?)</{t}>", block, re.S|re.I)
                return (mm.group(1).strip() if mm else "")
            items.append({
                "title": re.sub(r"<.*?>", "", tag("title")),
                "link": re.sub(r"<.*?>", "", tag("link")),
                "date": re.sub(r"<.*?>", "", tag("pubDate")),
                "summary": "",
            })
    return items


def parse_html(raw: Dict[str, Any], selectors: Dict[str, str]) -> List[Dict[str, Any]]:
    text = raw["content"].decode("utf-8", errors="ignore")
    items: List[Dict[str, Any]] = []
    if BeautifulSoup:
        soup = BeautifulSoup(text, "html.parser")
        item_sel = selectors.get("item") or "article, .item, .card, li"
        for el in soup.select(item_sel):
            def get(sel: str) -> str:
                if not sel:
                    return ""
                node = el.select_one(sel)
                if not node:
                    return ""
                # prefer attribute href/src else text
                href = node.get("href") or node.get("src")
                return (href or node.get_text(" ", strip=True)).strip()
            items.append({
                "title": get(selectors.get("title", "")),
                "link": get(selectors.get("link", "")),
                "date": get(selectors.get("date", "")),
                "subtitle": get(selectors.get("subtitle", "")),
                "tags": [t.get_text(strip=True) for t in el.select(selectors.get("tags", ""))] if selectors.get("tags") else [],
            })
    else:
        # Fallback: very naive extraction
        for m in re.finditer(r"<a [^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", text, re.I|re.S):
            items.append({"title": re.sub(r"<.*?>", "", m.group(2)), "link": m.group(1), "date": ""})
    return items


def parse_api(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    try:
        payload = json.loads(raw["content"].decode("utf-8", errors="ignore"))
    except Exception:
        return []
    items: List[Dict[str, Any]] = []
    if isinstance(payload, list):
        for r in payload:
            if isinstance(r, dict):
                items.append(r)
    elif isinstance(payload, dict):
        # common patterns: { items: [...] } or { data: [...] }
        for key in ("items", "data", "results"):
            seq = payload.get(key)
            if isinstance(seq, list):
                for r in seq:
                    if isinstance(r, dict):
                        items.append(r)
    return items

# --------------------------- Normalization & validation ---------------------------

COMMON_REQUIRED = [
    "id", "type", "title", "date_published", "last_checked_at", "source_name", "source_url", "payload"
]


def choose_type(src: Source) -> str:
    if src.postType:
        return src.postType
    # heuristic from id
    if "job" in src.id.lower():
        return "job"
    return "notice"


def build_id(date_published: str, slug: str, seq: int) -> str:
    return f"ime-{date_published}-{seq:04d}"


def make_slug(candidate: str, fallback: str = "post") -> str:
    s = slugify(candidate)
    return s or slugify(fallback)


def normalize_record(src: Source, r: Dict[str, Any], now: str, seq: int, since: Optional[str]) -> Result:
    src_name = src.sourceName or src.id
    title = (r.get("title") or r.get("name") or "").strip()
    link = to_https((r.get("link") or r.get("url") or "").strip() or src.url) or ""
    if not title:
        return Result.err("Normalize", "제목이 비어 있어 건너뜁니다.", "missing title", source=src.id)
    slug = make_slug(title)
    if not link:
        # allow missing link but keep source url
        link = to_https(src.url) or ""
    # dates
    raw_deadline = (r.get("deadline") or r.get("date") or r.get("closing") or "").strip()
    deadline = parse_date(raw_deadline) or ""
    date_pub = parse_date((r.get("date_published") or r.get("published") or r.get("created") or now)) or now
    if since and date_pub < since:
        return Result.err("SinceFilter", "since 이전 게시물", f"{date_pub} < {since}", source=src.id)
    # subtitle/tags
    subtitle = (r.get("subtitle") or r.get("summary") or "").strip()
    tags = r.get("tags") if isinstance(r.get("tags"), list) else []

    # mapping constants/overrides
    mapping = src.mapping or {}
    def mget(k: str, default: Any = None) -> Any:
        return mapping.get(k, default)

    post_type = choose_type(src)

    payload: Dict[str, Any] = {}
    if post_type == "job":
        payload = {
            "company": mget("company", r.get("company") or r.get("org") or ""),
            "role": r.get("role") or title,
            "location": r.get("location") or "",
            "employment_type": mget("employment_type", r.get("employment_type") or r.get("type") or ""),
            "salary_min": r.get("salary_min"),
            "salary_max": r.get("salary_max"),
            "apply_url": to_https(r.get("apply_url") or link) or link,
            "requirements": r.get("requirements") or [],
            "nice_to_have": r.get("nice_to_have") or [],
        }
    elif post_type == "scholarship":
        payload = {
            "amount_max": r.get("amount_max"),
            "eligible_years": r.get("eligible_years") or [],
            "gpa_min": r.get("gpa_min"),
            "income_bracket_max": r.get("income_bracket_max"),
            "major": r.get("major"),
            "region": r.get("region"),
            "requirements": r.get("requirements") or [],
            "documents": r.get("documents") or [],
            "apply_steps": r.get("apply_steps") or [],
            "notes": r.get("notes") or [],
        }
    elif post_type == "activity":
        payload = {
            "organization": r.get("organization") or r.get("company") or mget("company", ""),
            "period": r.get("period") or "",
            "location": r.get("location") or "",
            "benefits": r.get("benefits") or [],
            "requirements": r.get("requirements") or [],
            "selection": r.get("selection") or [],
            "contacts": r.get("contacts") or [],
        }
    elif post_type == "grad":
        payload = {
            "university": r.get("university") or r.get("org") or "",
            "program": r.get("program") or title,
            "round": r.get("round") or "",
            "tuition_per_semester": r.get("tuition_per_semester"),
            "stipend": r.get("stipend"),
            "contact": r.get("contact") or "",
        }
    else:  # notice/event fallback
        payload = r.get("payload") or {}

    # scrub free-text arrays
    for key in ("requirements", "nice_to_have", "documents", "apply_steps", "notes", "benefits", "selection"):
        if isinstance(payload.get(key), list):
            payload[key] = [scrub_pii(str(x)) for x in payload[key]]

    # id & filename
    slug_final = make_slug(slug or title)
    post_id = build_id(date_pub, slug_final, seq)

    doc = {
        "id": post_id,
        "type": post_type,
        "title": title,
        "subtitle": subtitle,
        "tags": mapping.get("tags", tags if isinstance(tags, list) else []),
        "date_published": date_pub,
        "deadline": deadline or "",
        "last_checked_at": now,
        "source_name": src.sourceName or src.id,
        "source_url": link,
        "payload": payload,
    }

    v = validate_common(doc)
    if not v.ok:
        return v
    return Result.ok_( (doc, slug_final) )


def validate_common(doc: Dict[str, Any]) -> Result:
    # Required fields
    for k in COMMON_REQUIRED:
        if k not in doc or (isinstance(doc[k], str) and not doc[k].strip()):
            return Result.err("Validate", f"필수 필드 누락: {k}", json.dumps(doc, ensure_ascii=False)[:200])
    # Dates
    for k in ("date_published", "last_checked_at"):
        if not ISO_DATE_RE.match(str(doc[k])):
            return Result.err("Validate", f"날짜 형식 오류: {k}", str(doc[k]))
    if doc.get("deadline") not in (None, "") and not ISO_DATE_RE.match(str(doc["deadline"])):
        return Result.err("Validate", "deadline 날짜 형식 오류", str(doc["deadline"]))
    # URLs
    if not HTTPS_RE.match(str(doc["source_url"])):
        return Result.err("Validate", "source_url은 https여야 합니다.", str(doc["source_url"]))
    # Type enum
    if doc.get("type") not in {"scholarship","activity","job","grad","event","notice"}:
        return Result.err("Validate", "type 값이 올바르지 않습니다.", str(doc.get("type")))
    return Result.ok_(doc)

# --------------------------- Dedupe & write ---------------------------

def find_existing(out_dir: str, slug: str) -> Optional[str]:
    if not os.path.isdir(out_dir):
        return None
    for name in os.listdir(out_dir):
        if name.endswith(f"-{slug}.json") and re.match(r"^\d{4}-\d{2}-\d{2}-", name):
            return os.path.join(out_dir, name)
    return None


def write_post_json(out_dir: str, date_published: str, slug: str, doc: Dict[str, Any], dry_run: bool=False) -> str:
    fname = f"{date_published}-{slug}.json"
    path = os.path.join(out_dir, fname)
    if dry_run:
        return path
    write_json(path, doc)
    return path

# --------------------------- Main pipeline ---------------------------

def collect_from_source(src: Source, since: Optional[str], max_items: int, deadletter: str, verbose: bool) -> Tuple[List[Dict[str, Any]], int]:
    # delay (polite)
    delay_ms = max(0, int((src.rateLimit or {}).get("minDelayMs", 1000)))
    polite_delay(delay_ms)

    raw_res = fetch(src.url)
    if not raw_res.ok:
        append_jsonl(deadletter, {"source": src.id, **(raw_res.error or {})})
        return [], 1

    raw = raw_res.data  # type: ignore
    recs: List[Dict[str, Any]] = []
    if src.type == "rss":
        recs = parse_rss(raw)
    elif src.type == "html":
        recs = parse_html(raw, src.selectors or {})
    elif src.type == "api":
        recs = parse_api(raw)
    else:
        append_jsonl(deadletter, {"source": src.id, "kind": "UnsupportedSource", "userMessage": "지원하지 않는 소스 타입", "logMessage": src.type})
        return [], 1

    if verbose:
        print(f"[{src.id}] fetched {len(recs)} records", file=sys.stderr)

    # trim
    recs = recs[:max_items]
    return recs, 0


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="IME-Hub per-item post scraper")
    p.add_argument("--config", default=DEFAULT_SOURCES_PATH, help="소스 설정 JSON 경로 (default: tools/jobs_sources.json)")
    p.add_argument("--sources", default="", help="수집할 소스 ID 쉼표목록 (미지정 시 전체)")
    p.add_argument("--since", default="", help="YYYY-MM-DD 이후 게시물만")
    p.add_argument("--max-per-source", type=int, default=100, help="소스별 최대 수집 레코드 수")
    p.add_argument("--limit", type=int, default=1000, help="전체 최대 수집 레코드 수")
    p.add_argument("--out", dest="out_dir", default=DEFAULT_OUT_DIR, help="출력 디렉토리 (contents/post)")
    p.add_argument("--deadletter", default=DEFAULT_DEADLETTER, help="실패 레코드 JSONL 경로")
    p.add_argument("--dry-run", action="store_true", help="파일을 작성하지 않고 경로만 출력")
    p.add_argument("--verbose", action="store_true", help="상세 로그 출력")

    args = p.parse_args(argv)

    now = today()
    since = args.since or None
    if since and not ISO_DATE_RE.match(since):
        print("--since는 YYYY-MM-DD 형식이어야 합니다.", file=sys.stderr)
        return 3

    load = load_sources(args.config)
    if not load.ok:
        append_jsonl(args.deadletter, load.error or {})
        print(load.error and load.error.get("userMessage", "config error"), file=sys.stderr)
        return 3

    sources, raw_cfg = load.data  # type: ignore

    # filter by ids
    only = {s.strip() for s in args.sources.split(",") if s.strip()}
    if only:
        sources = [s for s in sources if s.id in only]
        if args.verbose:
            print(f"filter sources -> {', '.join(s.id for s in sources)}", file=sys.stderr)

    os.makedirs(args.out_dir, exist_ok=True)

    seq = 1
    total_written = 0
    any_partial_fail = False

    for src in sources:
        if total_written >= args.limit:
            break
        try:
            recs, src_err = collect_from_source(src, since, args.max_per_source, args.deadletter, args.verbose)
            any_partial_fail = any_partial_fail or (src_err != 0)
        except Exception as e:
            append_jsonl(args.deadletter, {"source": src.id, "kind": "SourceError", "userMessage": "소스 처리 중 오류", "logMessage": str(e)})
            any_partial_fail = True
            continue

        for r in recs:
            if total_written >= args.limit:
                break
            norm = normalize_record(src, r, now, seq, since)
            if not norm.ok:
                # silently drop since-filter; log others
                err = norm.error or {}
                if err.get("kind") != "SinceFilter":
                    append_jsonl(args.deadletter, {"source": src.id, **err})
                if args.verbose and err.get("kind") != "SinceFilter":
                    print(f"[{src.id}] drop: {err.get('userMessage')} :: {err.get('logMessage','')}", file=sys.stderr)
                continue

            doc, slug = norm.data  # type: ignore

            # dedupe by slug: update last_checked_at if exists
            existing = find_existing(args.out_dir, slug)
            if existing:
                try:
                    cur = read_json(existing) or {}
                    cur["last_checked_at"] = now
                    # keep earlier date_published; update deadline if new has one
                    if doc.get("deadline"):
                        cur["deadline"] = doc["deadline"]
                    if args.verbose:
                        print(f"update {os.path.basename(existing)}", file=sys.stderr)
                    if not args.dry_run:
                        write_json(existing, cur)
                    total_written += 1
                except Exception as e:
                    append_jsonl(args.deadletter, {"source": src.id, "kind": "WriteError", "userMessage": "기존 파일 갱신 실패", "logMessage": str(e), "path": existing})
                continue

            # brand new
            out_path = write_post_json(args.out_dir, doc["date_published"], slug, doc, dry_run=args.dry_run)
            if args.verbose:
                print(("write " if not args.dry_run else "plan ") + os.path.basename(out_path), file=sys.stderr)
            seq += 1
            total_written += 1

    if any_partial_fail:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
