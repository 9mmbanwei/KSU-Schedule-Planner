#!/usr/bin/env python3
"""
ksu_sections.py — pull one term's class sections from KSU's Banner class search.

KSU runs Ellucian Banner 9. Its "Browse Classes" / "Class Schedule Search" page
is backed by a JSON API that this script calls the same way your browser does.
It saves:

  sections.json  every field the planner could use (all meeting times, all instructors, seats, credits)
  sections.txt   one line per section in the planner prototype's format:
                 CRN|COURSE|PROFESSOR|DAYS|START|END|CAMPUS(K/M/O)|MODE|SEATS

SETUP (once)
  1. Install Python 3.9 or newer.
  2. pip install requests
  3. Find KSU's Banner address: log in to Owl Express, open Registration ->
     Class Schedule Search (or "Browse Classes"), and copy the address bar.
     Keep everything up to and including "/StudentRegistrationSsb/ssb".
     Example shape:  https://<something>.kennesaw.edu/StudentRegistrationSsb/ssb

RUN
  python ksu_sections.py --base-url "https://.../StudentRegistrationSsb/ssb" --list-terms
  python ksu_sections.py --base-url "https://.../StudentRegistrationSsb/ssb" \
      --term 202701 --subjects CS CSE MATH ENGL HIST COMM PHYS

IF IT SAYS YOU NEED TO LOG IN
  Some schools only allow class search after signing in. Then:
    a. Log in to Owl Express in Chrome/Edge and open the class search page.
    b. Press F12 -> Network tab -> run a search -> click any "searchResults" request.
    c. Under Request Headers, copy the whole value of "Cookie".
    d. Run again with:  --cookie "PASTE_IT_HERE"
  That cookie is your logged-in session: never share it or commit it anywhere.
  It expires after a while, so you'll repeat this when it stops working.

BE A GOOD CITIZEN
  The script waits between requests (--delay) and only reads public schedule
  data. Before running it on a schedule or building a public app on it, ask the
  KSU Registrar / UITS for permission or an official data feed.
"""
from __future__ import annotations

import argparse
import json
import random
import string
import sys
import time

try:
    import requests
except ImportError:
    sys.exit("This script needs the 'requests' package. Install it with:  pip install requests")

DAY_KEYS = [("monday", "M"), ("tuesday", "T"), ("wednesday", "W"),
            ("thursday", "R"), ("friday", "F"), ("saturday", "S"), ("sunday", "U")]
PAGE_SIZE = 500


class NeedsLogin(Exception):
    pass


class NotData(Exception):
    pass


class Banner:
    def __init__(self, base_url: str, cookie: str | None, delay: float):
        # Accept any Banner address the student pastes and keep only ".../StudentRegistrationSsb/ssb".
        base_url = base_url.split("?")[0].split("#")[0]
        marker = "/ssb"
        if marker in base_url:
            base_url = base_url[: base_url.index(marker) + len(marker)]
        self.base = base_url.rstrip("/")
        self.delay = delay
        self.s = requests.Session()
        self.s.headers.update({
            "User-Agent": "Mozilla/5.0 (ksu_sections.py student schedule planner)",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        })
        if cookie:
            self.s.headers["Cookie"] = cookie
        # Banner's own page generates an id like this for each browser tab.
        self.session_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=5)) + str(int(time.time() * 1000))

    def _check(self, r: requests.Response) -> requests.Response:
        r.raise_for_status()
        ctype = r.headers.get("Content-Type", "")
        if "json" not in ctype:
            text = r.text[:400].lower()
            if "login" in text or "sign in" in text or "saml" in text or "cas" in r.url.lower():
                raise NeedsLogin()
            if r.request.method == "GET":
                with open("last_response.html", "w", encoding="utf-8") as f:
                    f.write(r.text)
                raise NotData(r.url)
        return r

    def _get(self, path: str, **params):
        time.sleep(self.delay)
        r = self.s.get(f"{self.base}{path}", params=params, timeout=30, allow_redirects=True)
        return self._check(r)

    def _post(self, path: str, data: dict, **params):
        time.sleep(self.delay)
        r = self.s.post(f"{self.base}{path}", params=params, data=data, timeout=30, allow_redirects=True)
        return self._check(r)

    def terms(self, max_terms: int = 15) -> list[dict]:
        r = self._get("/classSearch/getTerms", searchTerm="", offset=1, max=max_terms)
        return r.json()

    def start(self, term: str) -> None:
        # Opening the search page sets session cookies; choosing the term binds it to the session.
        try:
            time.sleep(self.delay)
            self.s.get(f"{self.base}/classSearch/classSearch", timeout=30)
        except requests.RequestException:
            pass
        self._post("/term/search", {"term": term, "studyPath": "", "studyPathText": "",
                                    "startDatepicker": "", "endDatepicker": "",
                                    "uniqueSessionId": self.session_id}, mode="search")

    def reset(self) -> None:
        try:
            self._post("/classSearch/resetDataForm", {"uniqueSessionId": self.session_id})
        except (requests.RequestException, NeedsLogin):
            pass

    def subject(self, term: str, subject: str) -> list[dict]:
        out, offset = [], 0
        while True:
            r = self._get("/searchResults/searchResults",
                          txt_subject=subject, txt_term=term, startDatepicker="", endDatepicker="",
                          uniqueSessionId=self.session_id, pageOffset=offset, pageMaxSize=PAGE_SIZE,
                          sortColumn="subjectDescription", sortDirection="asc")
            body = r.json()
            data = body.get("data") or []
            out.extend(data)
            total = body.get("totalCount") or 0
            offset += PAGE_SIZE
            if not data or offset >= total:
                break
        self.reset()
        return out


def hhmm(v: str | None) -> str:
    return f"{v[:2]}:{v[2:]}" if v and len(v) == 4 else ""


def campus_code(campus: str, method: str) -> str:
    c, m = (campus or "").lower(), (method or "").lower()
    if "online" in c or "ecore" in c or ("online" in m and "hybrid" not in m):
        return "O"
    if "marietta" in c:
        return "M"
    return "K"


def simplify(sec: dict) -> dict:
    faculty = sec.get("faculty") or []
    primary = next((f for f in faculty if f.get("primaryIndicator")), faculty[0] if faculty else None)
    meetings = []
    for mf in sec.get("meetingsFaculty") or []:
        mt = mf.get("meetingTime") or {}
        days = "".join(code for key, code in DAY_KEYS if mt.get(key))
        meetings.append({
            "days": days,
            "start": hhmm(mt.get("beginTime")),
            "end": hhmm(mt.get("endTime")),
            "building": mt.get("buildingDescription") or mt.get("building") or "",
            "room": mt.get("room") or "",
            "type": mt.get("meetingTypeDescription") or mt.get("meetingScheduleType") or "",
            "startDate": mt.get("startDate") or "",
            "endDate": mt.get("endDate") or "",
        })
    return {
        "crn": str(sec.get("courseReferenceNumber", "")),
        "course": f"{sec.get('subject', '')} {sec.get('courseNumber', '')}".strip(),
        "title": sec.get("courseTitle", ""),
        "section": sec.get("sequenceNumber", ""),
        "credits": sec.get("creditHours") or sec.get("creditHourLow"),
        "campus": sec.get("campusDescription", ""),
        "method": sec.get("instructionalMethodDescription", ""),
        "schedule_type": sec.get("scheduleTypeDescription", ""),
        "seats_available": sec.get("seatsAvailable"),
        "capacity": sec.get("maximumEnrollment"),
        "enrolled": sec.get("enrollment"),
        "waitlist_available": sec.get("waitAvailable"),
        "open": sec.get("openSection"),
        "instructor": (primary or {}).get("displayName") or "Staff",
        "instructors": [f.get("displayName") for f in faculty if f.get("displayName")],
        "meetings": meetings,
    }


def planner_line(s: dict) -> str:
    timed = [m for m in s["meetings"] if m["days"] and m["start"]]
    m = timed[0] if timed else {"days": "", "start": "", "end": ""}
    seats = max(0, int(s["seats_available"] or 0))
    clean = lambda x: str(x).replace("|", "/")
    return "|".join(clean(x) for x in [s["crn"], s["course"], s["instructor"], m["days"], m["start"], m["end"],
                                       campus_code(s["campus"], s["method"]), s["method"] or "In person", seats])


def main() -> int:
    ap = argparse.ArgumentParser(description="Download one term of KSU class sections from Banner class search.")
    ap.add_argument("--base-url", required=True, help='Ends in "/StudentRegistrationSsb/ssb"')
    ap.add_argument("--term", help="Term code, e.g. 202701. Use --list-terms to see them.")
    ap.add_argument("--subjects", nargs="+", default=["CS", "CSE", "MATH", "ENGL", "HIST", "COMM", "PHYS"],
                    help="Subject prefixes to download (default: the CS pathway subjects)")
    ap.add_argument("--list-terms", action="store_true", help="Print available terms and exit")
    ap.add_argument("--cookie", help="Cookie header from a logged-in browser session, if required")
    ap.add_argument("--delay", type=float, default=1.0, help="Seconds to wait between requests (default 1)")
    ap.add_argument("--out", default="sections", help="Output file name without extension (default: sections)")
    args = ap.parse_args()

    b = Banner(args.base_url, args.cookie, args.delay)
    try:
        if args.list_terms or not args.term:
            terms = b.terms()
            print("Available terms:")
            for t in terms:
                print(f"  {t.get('code')}  {t.get('description')}")
            if not args.term:
                print("\nRun again with --term CODE to download sections.")
            return 0

        b.start(args.term)
        all_secs = []
        for subj in args.subjects:
            secs = b.subject(args.term, subj.upper())
            print(f"{subj.upper():6} {len(secs):4} sections")
            all_secs.extend(simplify(s) for s in secs)
    except NeedsLogin:
        print("KSU asked for a login. Follow 'IF IT SAYS YOU NEED TO LOG IN' at the top of this script "
              "and run again with --cookie.", file=sys.stderr)
        return 2
    except NotData as e:
        print(f"KSU sent back a web page instead of class data from:\n  {e}\n"
              "The page was saved as last_response.html. Open it in your browser to see what it says.\n"
              "Usually this means you need to log in: see 'IF IT SAYS YOU NEED TO LOG IN' at the top of this script.",
              file=sys.stderr)
        return 2
    except ValueError:
        print("KSU's answer wasn't in the expected format. If this keeps happening, send Claude the message above.",
              file=sys.stderr)
        return 1
    except requests.HTTPError as e:
        print(f"The server answered {e.response.status_code} for {e.request.url}\n"
              "Check that --base-url ends in /StudentRegistrationSsb/ssb and the term code is right.", file=sys.stderr)
        return 1
    except requests.RequestException as e:
        print(f"Couldn't reach the server: {e}", file=sys.stderr)
        return 1

    if not all_secs:
        print("No sections came back. If you used --cookie it may have expired; otherwise check the term code.",
              file=sys.stderr)
        return 1

    with open(f"{args.out}.json", "w", encoding="utf-8") as f:
        json.dump({"term": args.term, "fetched": time.strftime("%Y-%m-%d %H:%M"), "sections": all_secs},
                  f, indent=2, ensure_ascii=False)
    with open(f"{args.out}.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(planner_line(s) for s in all_secs) + "\n")
    print(f"\nSaved {len(all_secs)} sections to {args.out}.json and {args.out}.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
