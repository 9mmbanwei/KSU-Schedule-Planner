"""Settings, read from environment variables (or a .env file next to the project)."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
STATIC_DIR = ROOT / "static"


def _load_dotenv():
    f = ROOT / ".env"
    if not f.exists():
        return
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

# Every subject the four majors (CS, SWE, IT, Architecture) use, plus their gen-eds.
ALL_SUBJECTS = ("AMST ANTH ARCH ART ASIA BIOL BLCK CHEM CHIN COMM CRJU CS CSE DANC ECON ENGL FREN GEOG GRMN GWST "
                "HEBR HIST ISD IT ITAL JAPN KOR LALS LATN LDRS MATH MUSI PAX PHIL PHYS POLS PORT PSYC RELS RUSS "
                "SOCI SPAN STAT STS SWE TCOM TPS WLC")

KSU_BASE_URL = os.environ.get("KSU_BASE_URL", "https://srs-owlexpress.kennesaw.edu/StudentRegistrationSsb/ssb")
KSU_TERM = os.environ.get("KSU_TERM", "202701")
KSU_SUBJECTS = os.environ.get("KSU_SUBJECTS", ALL_SUBJECTS).split()
KSU_DELAY = float(os.environ.get("KSU_DELAY", "1.0"))           # seconds between requests to KSU
REFRESH_HOURS = float(os.environ.get("REFRESH_HOURS", "24"))     # 0 turns automatic refresh off

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL_QUICK = os.environ.get("MODEL_QUICK", "claude-haiku-5-5")      # reads "describe your week"
MODEL_ADVISOR = os.environ.get("MODEL_ADVISOR", "claude-sonnet-5-5")  # writes the advisor comparison
AI_PER_HOUR = int(os.environ.get("AI_PER_HOUR", "20"))               # AI requests allowed per visitor per hour
