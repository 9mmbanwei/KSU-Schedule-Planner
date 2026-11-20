"""Download class sections from KSU's Banner class search (the same requests the Browse Classes page makes)."""
from __future__ import annotations

import html
import random
import string
import time

import requests

DAY_KEYS = [("monday", "M"), ("tuesday", "T"), ("wednesday", "W"),
            ("thursday", "R"), ("friday", "F"), ("saturday", "S"), ("sunday", "U")]
PAGE_SIZE = 500


class KsuError(Exception):
    pass


class Banner:
    def __init__(self, base_url: str, delay: float = 1.0):
        base_url = base_url.split("?")[0].split("#")[0]
        if "/ssb" in base_url:
            base_url = base_url[: base_url.index("/ssb") + 4]
        self.base = base_url.rstrip("/")
        self.delay = delay
        self.s = requests.Session()
        self.s.headers.update({
            "User-Agent": "KSU Schedule Planner (student project)",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        })
        self.session_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=5)) + str(int(time.time() * 1000))

    def _req(self, method: str, path: str, data=None, **params):
        time.sleep(self.delay)
        r = self.s.request(method, f"{self.base}{path}", params=params, data=data, timeout=30)
        r.raise_for_status()
        if method == "GET" and "json" not in r.headers.get("Content-Type", ""):
            raise KsuError(f"KSU returned a web page instead of data for {r.url}; class search may now require a login")
        return r

    def terms(self, max_terms: int = 15) -> list[dict]:
        return self._req("GET", "/classSearch/getTerms", searchTerm="", offset=1, max=max_terms).json()

    def start(self, term: str) -> None:
        try:
            self.s.get(f"{self.base}/classSearch/classSearch", timeout=30)
        except requests.RequestException:
            pass
        self._req("POST", "/term/search", {"term": term, "studyPath": "", "studyPathText": "", "startDatepicker": "",
                                          "endDatepicker": "", "uniqueSessionId": self.session_id}, mode="search")

    def subject(self, term: str, subject: str) -> list[dict]:
        out, offset = [], 0
        while True:
            body = self._req("GET", "/searchResults/searchResults", txt_subject=subject, txt_term=term,
                             startDatepicker="", endDatepicker="", uniqueSessionId=self.session_id,
                             pageOffset=offset, pageMaxSize=PAGE_SIZE, sortColumn="subjectDescription",
                             sortDirection="asc").json()
            data = body.get("data") or []
            out.extend(data)
            offset += PAGE_SIZE
            if not data or offset >= (body.get("totalCount") or 0):
                break
        try:
            self._req("POST", "/classSearch/resetDataForm", {"uniqueSessionId": self.session_id})
        except (requests.RequestException, KsuError):
            pass
        return out


def _hhmm(v):
    return f"{v[:2]}:{v[2:]}" if v and len(v) == 4 else ""


def simplify(sec: dict) -> dict:
    """Keep the fields the planner uses, in the same shape ksu_sections.py saves."""
    faculty = sec.get("faculty") or []
    primary = next((f for f in faculty if f.get("primaryIndicator")), faculty[0] if faculty else None)
    meetings = []
    for mf in sec.get("meetingsFaculty") or []:
        mt = mf.get("meetingTime") or {}
        meetings.append({
            "days": "".join(code for key, code in DAY_KEYS if mt.get(key)),
            "start": _hhmm(mt.get("beginTime")), "end": _hhmm(mt.get("endTime")),
            "building": mt.get("buildingDescription") or mt.get("building") or "", "room": mt.get("room") or "",
            "type": mt.get("meetingTypeDescription") or mt.get("meetingScheduleType") or "",
            "startDate": mt.get("startDate") or "", "endDate": mt.get("endDate") or "",
        })
    return {
        "crn": str(sec.get("courseReferenceNumber", "")),
        "course": f"{sec.get('subject', '')} {sec.get('courseNumber', '')}".strip(),
        "title": html.unescape(sec.get("courseTitle", "")),
        "section": sec.get("sequenceNumber", ""),
        "credits": sec.get("creditHours") or sec.get("creditHourLow"),
        "campus": sec.get("campusDescription", ""),
        "method": sec.get("instructionalMethodDescription", ""),
        "schedule_type": sec.get("scheduleTypeDescription", ""),
        "seats_available": sec.get("seatsAvailable"),
        "capacity": sec.get("maximumEnrollment"),
        "enrolled": sec.get("enrollment"),
        "waitlist_available": sec.get("waitAvailable"),
        "instructor": (primary or {}).get("displayName") or "Staff",
        "instructors": [f.get("displayName") for f in faculty if f.get("displayName")],
        "meetings": meetings,
    }


def download(base_url: str, term: str, subjects: list[str], delay: float = 1.0, log=print) -> dict:
    b = Banner(base_url, delay)
    b.start(term)
    sections = []
    for subj in subjects:
        try:
            got = b.subject(term, subj)
        except (requests.RequestException, KsuError) as e:
            log(f"  {subj}: failed ({e})")
            continue
        log(f"  {subj:6} {len(got):4} sections")
        sections.extend(simplify(s) for s in got)
    if not sections:
        raise KsuError("No sections came back. Check KSU_TERM and KSU_BASE_URL.")
    return {"term": term, "fetched": time.strftime("%Y-%m-%d %H:%M"), "sections": sections}
