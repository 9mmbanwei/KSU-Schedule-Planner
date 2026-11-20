import json

import pytest

from app import config
import app.main as server


@pytest.fixture
def client():
    server._hits.clear()
    return server.app.test_client()


def test_pages_and_data_are_served(client):
    for path in ["/", "/css/planner.css", "/js/planner.js", "/js/engine.js", "/js/requirements.js",
                 "/manifest.webmanifest", "/sw.js"]:
        assert client.get(path).status_code == 200, path
    r = client.get("/api/data")
    assert r.status_code == 200
    d = r.get_json()
    assert d["secs"] and d["titles"]
    # browsers can skip re-downloading unchanged data
    assert client.get("/api/data", headers={"If-None-Match": r.headers["ETag"]}).status_code == 304


def test_ai_is_off_without_a_key(client, monkeypatch):
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "")
    assert client.get("/api/ai/status").get_json() == {"enabled": False}
    r = client.post("/api/ai", json={"kind": "text", "prompt": "hi"})
    assert r.status_code == 503 and r.get_json()["code"] == "sampling_disabled"


class FakeReply:
    def __init__(self, status=200, body=None, lines=()):
        self.status_code, self._body, self._lines = status, body, lines

    def json(self):
        return self._body

    def iter_lines(self, decode_unicode=True):
        return iter(self._lines)


def test_ai_json_stream_and_limits(client, monkeypatch):
    monkeypatch.setattr(config, "ANTHROPIC_API_KEY", "test")
    monkeypatch.setattr(config, "AI_PER_HOUR", 2)

    def fake(body, stream):
        if stream:
            ev = lambda t: "data: " + json.dumps({"type": "content_block_delta", "delta": {"type": "text_delta", "text": t}})
            return FakeReply(lines=["event: x", ev("Pick "), ev("Option A.")])
        return FakeReply(body={"content": [{"type": "text", "text": '```json\n{"major":"swe"}\n```'}]})

    monkeypatch.setattr(server, "_anthropic", fake)
    assert client.post("/api/ai", json={"kind": "json", "prompt": "x"}).get_json() == {"major": "swe"}
    assert client.post("/api/ai", json={"kind": "text", "prompt": "x"}).data.decode() == "Pick Option A."
    assert client.post("/api/ai", json={"kind": "text", "prompt": "x"}).status_code == 429   # over 2 per hour
    assert client.post("/api/ai", json={"kind": "other", "prompt": "x"}).status_code == 400  # bad requests don't count
