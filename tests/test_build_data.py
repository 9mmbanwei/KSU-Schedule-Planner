from app.build_data import build, term_name


def section(course, campus="Marietta Campus", method="Traditional F2F", stype="Lecture", meetings=None, **kw):
    return {"crn": kw.get("crn", "10001"), "course": course, "title": "Data Structures &amp; More", "section": "01",
            "credits": 3, "campus": campus, "method": method, "schedule_type": stype, "seats_available": 5,
            "capacity": 40, "waitlist_available": 10, "instructors": ["Smith, Jane"],
            "meetings": meetings if meetings is not None else [
                {"days": "TR", "start": "11:10", "end": "12:30", "building": "Atrium Building", "room": "1010",
                 "type": "Lecture", "startDate": "01/11/2027", "endDate": "05/03/2027"}]}


def test_term_names():
    assert term_name("202701") == "Spring 2027"
    assert term_name("202705") == "Summer 2027"
    assert term_name("202708") == "Fall 2027"


def test_basic_section_is_converted():
    d = build({"term": "202701", "fetched": "2026-11-20 10:54", "sections": [section("CS 3305")]})
    assert d["termName"] == "Spring 2027"
    assert d["titles"]["CS 3305"] == ["Data Structures & More", 3]   # HTML entities decoded
    crn, course, sec, campus, method, seats, cap, wait, profs, meets = d["secs"][0]
    assert (course, campus, method, seats) == ("CS 3305", "M", "In person", 5)
    assert d["people"][profs[0]] == "Smith, Jane"
    assert meets[0][:3] == ["TR", 670, 750]                          # minutes after midnight


def test_campus_and_format_mapping():
    secs = [section("ENGL 1102", campus="KSU Online", method="Fully at a Distance", meetings=[], crn="1"),
            section("ENGL 1102", campus="eCore", method="Fully at a Distance", meetings=[], crn="2"),
            section("ENGL 1102", campus="Kennesaw Campus", method="Hybrid - 50 percent Online", crn="3")]
    d = build({"term": "202701", "sections": secs})
    assert [(s[3], s[4]) for s in d["secs"]] == [("O", "Online"), ("E", "Online"), ("K", "Hybrid (50% online)")]


def test_graduate_courses_skipped_but_arch_studios_kept():
    secs = [section("CS 7267", crn="1"), section("ARCH 5015", crn="2"), section("CS 3305", stype="Thesis", crn="3")]
    d = build({"term": "202701", "sections": secs})
    assert [s[1] for s in d["secs"]] == ["ARCH 5015"]
