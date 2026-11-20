"""Turn downloaded sections into the compact format the planner page reads."""
import html

SKIP_TYPES = {"Dissertation", "Thesis", "Directed Study (one-to-one)", "Independent Study (Correspond)", "Internship/Practicum"}


def term_name(code: str) -> str:
    return {"01": "Spring", "05": "Summer", "08": "Fall"}.get(code[4:], "Term") + " " + code[:4]


def _campus(c: str) -> str:
    c = (c or "").lower()
    if "ecore" in c: return "E"
    if "online" in c: return "O"
    if "marietta" in c: return "M"
    if "kennesaw" in c: return "K"
    return ""


def _method(m: str) -> str:
    m = m or ""
    if m.startswith("Traditional"): return "In person"
    if m.startswith("Fully"): return "Online"
    if m.startswith("Predominately"): return "Mostly online"
    if m.startswith("Hybrid"):
        pct = "".join(ch for ch in m if ch.isdigit())
        return f"Hybrid ({pct}% online)" if pct else "Hybrid"
    return m or "In person"


def _mins(t):
    if not t: return None
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def build(raw: dict) -> dict:
    titles, people, pidx, dates, didx, secs = {}, [], {}, [], {}, []

    def person(n):
        if n not in pidx:
            pidx[n] = len(people); people.append(n)
        return pidx[n]

    def date(d):
        d = (d or "")[:5]
        if d not in didx:
            didx[d] = len(dates); dates.append(d)
        return didx[d]

    for s in raw["sections"]:
        try:
            subj, num = s["course"].split()
            n = int(num[:4])
        except ValueError:
            continue
        # graduate courses start at 5000, except the B.Arch's fifth-year ARCH 5xxx studios
        if (n >= 5000 and not (subj == "ARCH" and n < 6000)) or s.get("schedule_type") in SKIP_TYPES:
            continue
        cc = _campus(s.get("campus"))
        if not cc:
            continue
        titles.setdefault(s["course"], [html.unescape(s.get("title") or ""), s.get("credits") or 0])
        meets = []
        for m in s.get("meetings") or []:
            a, b = _mins(m.get("start")), _mins(m.get("end"))
            if not m.get("days") or a is None or b is None:
                continue
            where = " ".join(x for x in [html.unescape(m.get("building") or ""), m.get("room") or ""] if x)
            meets.append([m["days"], a, b, m.get("type") or "", where, date(m.get("startDate")), date(m.get("endDate"))])
        names = [n for n in (s.get("instructors") or []) if n] or ["Staff"]
        secs.append([s["crn"], s["course"], s.get("section", ""), cc, _method(s.get("method")),
                     int(s.get("seats_available") or 0), int(s.get("capacity") or 0), int(s.get("waitlist_available") or 0),
                     [person(n) for n in names], meets])
    return {"term": raw["term"], "termName": term_name(raw["term"]), "fetched": raw.get("fetched", ""),
            "titles": titles, "people": people, "dates": dates, "secs": secs}
