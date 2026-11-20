# Updating major requirements

Requirements live in `static/js/requirements.js`. They were entered by hand from these KSU sources (catalog 2025–26):

| Major | Source |
|---|---|
| B.S. Computer Science | [BSCS curriculum sheet 2025](https://campus.kennesaw.edu/colleges-departments/ccse/advising/resources/docs/curriculum-sheets/bscs-2025.pdf) |
| B.S. Software Engineering | [BSSWE curriculum sheet 2025](https://campus.kennesaw.edu/colleges-departments/ccse/advising/resources/docs/curriculum-sheets/bsswe-2025.pdf) |
| B.S. Information Technology | [BSIT curriculum sheet 2025](https://campus.kennesaw.edu/colleges-departments/ccse/advising/resources/docs/curriculum-sheets/bsit-2025.pdf) |
| Bachelor of Architecture | [Architecture curriculum chart 2025](https://campus.kennesaw.edu/colleges-departments/cacm/docs/2025-architecture-curriculum-chart.pdf) |

All CCSE sheets: [curriculum sheets page](https://campus.kennesaw.edu/colleges-departments/ccse/advising/resources/curriculum-sheets.php).

## Known gaps

- Rules shown as notes but not enforced: "at least one course from List 1" (SWE), "four courses from one concentration" (IT), "at least 3 CS courses" (CS).
- Free electives and SWE's math/science electives aren't planned.
- The Architecture chart PDF doesn't clearly place ARCH 3112, 4226 and 5006; their years are a best reading. ARCH 2003 and 3011 prerequisites say "See Catalog" on the chart.
- Prerequisites are simplified (no minimum grades, no placement tests).

## Each new catalog year

1. Download the new sheets (CCSE posts a new set each year; Architecture posts a new chart).
2. In `requirements.js`, update:
   - `MAJORS.<major>.groups`: add, remove or rename courses; update `src` and `srcName`.
   - `PRE`: prerequisites for any new or changed courses.
   - `OPT`: the gen-ed option lists, if the core changed.
   - `TITLE_FALLBACK` and `CRDEF`: titles and credit hours for courses that may not be in the term's data.
3. Run the tests (`node --test tests/engine.test.mjs`). The "requirements data is well-formed" test catches typos in course codes.

## Adding a major

1. Add an entry to `MAJORS` with `name`, `src`, `srcName`, `groups` and `extra` (a sentence about anything not planned). Use `geneds(...)` for the standard core, or list gen-eds by hand.
2. Add its prerequisites to `PRE`.
3. Make sure its subjects are in `ALL_SUBJECTS` in `app/config.py`, so the server downloads them.
4. If the major has a fixed sequence like Architecture, set `seq: true` and give each course a year index `y` (0 = Year 1 Fall … 9 = Year 5 Spring).
