"""The web server: serves the planner, its class data, and the AI features.

Run on your laptop:   py -m app.main      then open http://localhost:5000
"""
import json
import time
from collections import defaultdict, deque

import requests
from flask import Flask, Response, jsonify, request, send_from_directory

from . import config, refresh

app = Flask(__name__, static_folder=None)
_data = {"json": None, "etag": ""}


def _set_data(d):
    if d:
        _data["json"] = json.dumps(d, separators=(",", ":"), ensure_ascii=False)
        _data["etag"] = f'"{d.get("term")}-{d.get("fetched")}-{len(d.get("secs", []))}"'


_set_data(refresh.load())


# ---------- pages ----------
@app.get("/")
def index():
    return send_from_directory(config.STATIC_DIR, "index.html")


@app.get("/sw.js")
def service_worker():
    # served from the root so it can make the whole site work offline
    r = send_from_directory(config.STATIC_DIR, "sw.js")
    r.headers["Cache-Control"] = "no-cache"
    return r


@app.get("/<path:name>")
def static_files(name):
    return send_from_directory(config.STATIC_DIR, name)


# ---------- class data ----------
@app.get("/api/data")
def data():
    if not _data["json"]:
        return jsonify(error="Class data isn't ready yet. The server is downloading it from KSU; try again in a few minutes."), 503
    if request.headers.get("If-None-Match") == _data["etag"]:
        return Response(status=304)
    return Response(_data["json"], mimetype="application/json",
                    headers={"ETag": _data["etag"], "Cache-Control": "no-cache"})


@app.get("/api/status")
def status():
    d = json.loads(_data["json"]) if _data["json"] else {}
    return jsonify(term=d.get("termName"), fetched=d.get("fetched"), sections=len(d.get("secs", [])),
                   refreshing=refresh.status["running"], last_error=refresh.status["last_error"],
                   ai=bool(config.ANTHROPIC_API_KEY))


# ---------- AI ----------
# The page builds the prompt; the server adds fixed instructions, caps sizes, and limits how often each visitor can ask.
SYSTEM = ("You are the assistant inside a Kennesaw State University class schedule planner. "
          "Only help with course planning, class schedules and registration. If asked for anything else, "
          "reply briefly that you can only help with schedule planning.")
_hits = defaultdict(deque)


def _allowed(ip: str) -> bool:
    q, now = _hits[ip], time.time()
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= config.AI_PER_HOUR:
        return False
    q.append(now)
    return True


def _anthropic(body: dict, stream: bool):
    return requests.post("https://api.anthropic.com/v1/messages", stream=stream, timeout=120, json=body, headers={
        "x-api-key": config.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})


@app.get("/api/ai/status")
def ai_status():
    return jsonify(enabled=bool(config.ANTHROPIC_API_KEY))


@app.post("/api/ai")
def ai():
    if not config.ANTHROPIC_API_KEY:
        return jsonify(code="sampling_disabled", error="AI features are turned off on this server."), 503
    body = request.get_json(silent=True) or {}
    kind, prompt = body.get("kind"), str(body.get("prompt") or "")
    if kind not in ("json", "text") or not prompt or len(prompt) > 60000:
        return jsonify(code="invalid_request", error="Bad request."), 400
    ip = (request.headers.get("X-Forwarded-For") or request.remote_addr or "?").split(",")[0].strip()
    if not _allowed(ip):
        return jsonify(code="rate_limited", error="Too many AI requests. Try again later."), 429

    if kind == "json":
        r = _anthropic({"model": config.MODEL_QUICK, "max_tokens": 1200, "system": SYSTEM + " Reply with JSON only.",
                        "messages": [{"role": "user", "content": prompt}]}, stream=False)
        if r.status_code != 200:
            return jsonify(code="rate_limited" if r.status_code == 429 else "upstream_error", error="The AI service didn't answer."), 502
        text = "".join(b.get("text", "") for b in r.json().get("content", []) if b.get("type") == "text").strip()
        if text.startswith("```"):
            text = text.strip("`").split("\n", 1)[-1].rsplit("```", 1)[0]
        try:
            start = min(i for i in (text.find("{"), text.find("[")) if i >= 0)
            end = max(text.rfind("}"), text.rfind("]")) + 1
            return jsonify(json.loads(text[start:end]))
        except ValueError:
            return jsonify(code="invalid_json", error="The reply wasn't valid JSON.", text=text), 502

    def stream():
        r = _anthropic({"model": config.MODEL_ADVISOR, "max_tokens": 700, "system": SYSTEM, "stream": True,
                        "messages": [{"role": "user", "content": prompt}]}, stream=True)
        if r.status_code != 200:
            yield "\n[The AI service didn't answer. Try again in a minute.]"
            return
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            try:
                ev = json.loads(line[5:])
            except ValueError:
                continue
            if ev.get("type") == "content_block_delta" and ev.get("delta", {}).get("type") == "text_delta":
                yield ev["delta"]["text"]

    return Response(stream(), mimetype="text/plain; charset=utf-8", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# keep the data fresh in the background (skipped when REFRESH_HOURS=0)
refresh.start_background(_set_data)

if __name__ == "__main__":
    print("KSU Schedule Planner running at http://localhost:5000  (press Ctrl+C to stop)")
    app.run(host="0.0.0.0", port=5000, threaded=True)
