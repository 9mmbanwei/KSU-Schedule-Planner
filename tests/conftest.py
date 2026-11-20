import os
import sys
from pathlib import Path

# Tests never talk to KSU or Anthropic: no background refresh, no real API key.
os.environ["REFRESH_HOURS"] = "0"
os.environ["ANTHROPIC_API_KEY"] = ""
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
