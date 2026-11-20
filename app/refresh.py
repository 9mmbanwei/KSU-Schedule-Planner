"""Download fresh KSU sections and rebuild the planner data.

Run by hand:   py -m app.refresh
The server also runs this automatically every REFRESH_HOURS.
"""
import json
import threading
import time
from datetime import datetime

from . import config
from .build_data import build
from .ksu import KsuError, download

PLANNER_FILE = config.DATA_DIR / "planner-data.json"
_lock = threading.Lock()
status = {"running": False, "last_error": "", "last_run": ""}


def load() -> dict | None:
    if PLANNER_FILE.exists():
        return json.loads(PLANNER_FILE.read_text(encoding="utf-8"))
    return None


def age_hours(data: dict | None) -> float:
    try:
        return (datetime.now() - datetime.strptime(data["fetched"], "%Y-%m-%d %H:%M")).total_seconds() / 3600
    except (TypeError, KeyError, ValueError):
        return float("inf")


def refresh(log=print) -> dict | None:
    """Download and rebuild. Returns the new data, or None if another refresh is running or it failed."""
    if not _lock.acquire(blocking=False):
        return None
    status["running"] = True
    try:
        log(f"Refreshing {config.KSU_TERM}: {len(config.KSU_SUBJECTS)} subjects from KSU…")
        raw = download(config.KSU_BASE_URL, config.KSU_TERM, config.KSU_SUBJECTS, config.KSU_DELAY, log)
        data = build(raw)
        config.DATA_DIR.mkdir(exist_ok=True)
        tmp = PLANNER_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        tmp.replace(PLANNER_FILE)
        (config.DATA_DIR / "sections.json").write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
        status["last_error"] = ""
        log(f"Saved {len(data['secs'])} sections ({len(data['titles'])} courses).")
        return data
    except (KsuError, OSError, ValueError) as e:
        status["last_error"] = str(e)
        log(f"Refresh failed: {e}")
        return None
    except Exception as e:  # network errors etc.; keep serving the old data
        status["last_error"] = str(e)
        log(f"Refresh failed: {e}")
        return None
    finally:
        status["running"] = False
        status["last_run"] = time.strftime("%Y-%m-%d %H:%M")
        _lock.release()


def start_background(on_new_data, log=print):
    """Refresh now if the data is old, then every REFRESH_HOURS, without blocking the server."""
    if config.REFRESH_HOURS <= 0:
        return

    def loop():
        while True:
            current = load()
            if age_hours(current) >= config.REFRESH_HOURS or (current and current.get("term") != config.KSU_TERM):
                new = refresh(log)
                if new:
                    on_new_data(new)
            time.sleep(min(3600, config.REFRESH_HOURS * 3600))

    threading.Thread(target=loop, daemon=True, name="ksu-refresh").start()


if __name__ == "__main__":
    refresh()
