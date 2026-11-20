# How it works

```
KSU class search ──(once a day)──▶ app/refresh.py ──▶ data/planner-data.json
                                     uses app/ksu.py        │
                                     and app/build_data.py  │
                                                            ▼
            phone / laptop browser ◀── app/main.py (Flask) ── /api/data
                     │                       ▲
                     └──── AI requests ──────┘── Anthropic API (key stays on the server)
```

## Server (`app/`)

| File | Job |
|---|---|
| `ksu.py` | Calls KSU's Banner class search the way the Browse Classes page does: pick a term, then fetch each subject's sections as JSON. Waits `KSU_DELAY` seconds between requests. |
| `build_data.py` | Shrinks the download into the compact format the page reads: drops graduate courses (except ARCH 5xxx studios), maps campus and format names, converts times to minutes. |
| `refresh.py` | Runs the download and rebuild, writes `data/planner-data.json`, and repeats every `REFRESH_HOURS` in a background thread. If KSU fails, the old data keeps being served. |
| `main.py` | Serves the site, `/api/data`, `/api/status` and `/api/ai`. The AI endpoint adds fixed instructions, caps prompt size, and limits each visitor to `AI_PER_HOUR` requests. |
| `config.py` | Every setting, read from environment variables or `.env`. |

## Website (`static/`)

| File | Job |
|---|---|
| `index.html` | Page layout only. |
| `css/planner.css` | All styling. Colors are tokens on `:root`; dark mode swaps the tokens. |
| `js/theme.js` | The System / Light / Dark switch. |
| `js/engine.js` | The scheduler. For each course it filters sections (full, busy hours, format, campus, avoided professors), merges identical ones, keeps the best 24, then searches combinations with no time clash, allowing 50 minutes between Kennesaw and Marietta. Schedules are scored on days on campus, gaps, early/late classes, campus switches, preferred professors and waitlists. |
| `js/requirements.js` | Each major's requirements and prerequisites. Updated each catalog year (see `updating-requirements.md`). |
| `js/planner.js` | Everything on screen: the requirements checklist, the year planner, schedules, the registration-day panel, and the AI features. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Make the site installable on phones and usable offline. |

## How the year planner picks courses

1. List every unfinished requirement whose prerequisites are met (a starred prerequisite can be taken the same term).
2. Rank them. CS, SWE and IT: courses that unlock the longest chain of later requirements first. Architecture: follow the studio sequence, only looking one year ahead, with linked courses (like ARCH 3011 + 3313 + 3211) added together.
3. Fill up to the credit target, at most 3 major courses per term at first (1 in summer), then gen-eds.
4. For the current term, keep only courses offered with a section that fits the student's week. If they can't all fit together, drop the lowest-ranked one.
5. Plan the next term(s) as if the earlier ones were passed. Summer favors gen-eds and lower-level courses.
