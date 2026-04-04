"""Tests for /api/seed-lots endpoints and seed_lot_service helpers."""

import pytest

from backend.app.database import lot_prefix
from backend.app.services import seed_lot_service


# ── lot_prefix unit tests ─────────────────────────────────────────────────────

def test_lot_prefix_single_word():
    assert lot_prefix("Shishito") == "SH"


def test_lot_prefix_multiple_words():
    assert lot_prefix("Cherokee Purple Tomato OG") == "CPT"


def test_lot_prefix_skips_stop_words():
    assert lot_prefix("Sun Gold F1") == "SG"


def test_lot_prefix_hybrid_skipped():
    assert lot_prefix("Super Sweet Hybrid") == "SS"


def test_lot_prefix_up_to_four_words():
    assert lot_prefix("Black Beauty Eggplant Extra") == "BBEE"


# ── API tests ─────────────────────────────────────────────────────────────────

def test_list_lots_empty(client):
    r = client.get("/api/seed-lots")
    assert r.status_code == 200
    assert r.json() == []


def test_create_lot_auto_generates_code(client):
    r = client.post("/api/seed-lots", json={"seed_id": "test-pepper", "packed_for_year": 2026})
    assert r.status_code == 200
    data = r.json()
    assert data["lot_code"].startswith("SH-2026-")
    assert data["lot_code"].endswith("001")


def test_create_second_lot_increments_sequence(client):
    client.post("/api/seed-lots", json={"seed_id": "test-pepper", "packed_for_year": 2026})
    r = client.post("/api/seed-lots", json={"seed_id": "test-pepper", "packed_for_year": 2026})
    assert r.status_code == 200
    assert r.json()["lot_code"].endswith("002")


def test_create_lot_with_custom_code(client):
    r = client.post("/api/seed-lots", json={
        "seed_id": "test-tomato",
        "lot_code": "MY-CUSTOM-001",
        "packed_for_year": 2025,
    })
    assert r.status_code == 200
    assert r.json()["lot_code"] == "MY-CUSTOM-001"


def test_list_lots_has_seed_name(client):
    client.post("/api/seed-lots", json={"seed_id": "test-lettuce", "packed_for_year": 2026})
    r = client.get("/api/seed-lots")
    assert r.status_code == 200
    lots = r.json()
    assert len(lots) == 1
    assert lots[0]["seed_name"] == "Buttercrunch Lettuce"
    assert lots[0]["category"] == "Greens"


def test_update_lot(client):
    create_r = client.post("/api/seed-lots", json={
        "seed_id": "test-tomato",
        "packed_for_year": 2026,
        "supplier": "Johnny's",
    })
    lot_id = create_r.json()["id"]
    r = client.put(f"/api/seed-lots/{lot_id}", json={"supplier": "Burpee", "germ_rate": 92.5})
    assert r.status_code == 200
    updated = r.json()
    assert updated["supplier"] == "Burpee"
    assert updated["germ_rate"] == 92.5


def test_delete_lot(client):
    create_r = client.post("/api/seed-lots", json={"seed_id": "test-pepper", "packed_for_year": 2026})
    lot_id = create_r.json()["id"]
    r = client.delete(f"/api/seed-lots/{lot_id}")
    assert r.status_code == 200
    assert client.get("/api/seed-lots").json() == []


def test_delete_lot_nullifies_planting_link(client):
    # Create lot
    create_r = client.post("/api/seed-lots", json={"seed_id": "test-pepper", "packed_for_year": 2026})
    lot_id = create_r.json()["id"]
    # Create planting referencing lot
    p_r = client.post("/api/plantings", json={
        "seed_id": "test-pepper",
        "year": 2026,
        "seed_lot_id": lot_id,
    })
    planting_id = p_r.json()["id"]
    # Delete lot → planting's seed_lot_id should become NULL
    client.delete(f"/api/seed-lots/{lot_id}")
    plantings = client.get("/api/plantings?year=2026").json()
    matching = [p for p in plantings if p["id"] == planting_id]
    assert len(matching) == 1
    assert matching[0]["seed_lot_id"] is None


def test_duplicate_lot_code_returns_409(client):
    client.post("/api/seed-lots", json={"seed_id": "test-pepper", "lot_code": "DUPE-001", "packed_for_year": 2026})
    r = client.post("/api/seed-lots", json={"seed_id": "test-tomato", "lot_code": "DUPE-001", "packed_for_year": 2026})
    assert r.status_code == 409


def test_create_lot_missing_seed_returns_404(client):
    r = client.post("/api/seed-lots", json={"seed_id": "nonexistent-seed", "packed_for_year": 2026})
    assert r.status_code == 404


def test_delete_lot_not_found_returns_404(client):
    r = client.delete("/api/seed-lots/99999")
    assert r.status_code == 404


def test_generate_code_endpoint(client):
    r = client.get("/api/seed-lots/generate-code?seed_id=test-pepper&year=2026")
    assert r.status_code == 200
    code = r.json()["lot_code"]
    assert code.startswith("SH-2026-")


def test_generate_code_endpoint_missing_seed(client):
    r = client.get("/api/seed-lots/generate-code?seed_id=no-such-seed&year=2026")
    assert r.status_code == 404


def test_update_lot_no_fields(client):
    """PUT with empty body returns existing lot unchanged."""
    create_r = client.post("/api/seed-lots", json={
        "seed_id": "test-tomato",
        "packed_for_year": 2026,
        "supplier": "Acme",
    })
    lot_id = create_r.json()["id"]
    r = client.put(f"/api/seed-lots/{lot_id}", json={})
    assert r.status_code == 200
    assert r.json()["supplier"] == "Acme"


def test_update_lot_duplicate_code_returns_409(client):
    r1 = client.post("/api/seed-lots", json={"seed_id": "test-pepper", "lot_code": "ORIG-001", "packed_for_year": 2026})
    r2 = client.post("/api/seed-lots", json={"seed_id": "test-tomato", "lot_code": "ORIG-002", "packed_for_year": 2026})
    lot2_id = r2.json()["id"]
    r = client.put(f"/api/seed-lots/{lot2_id}", json={"lot_code": "ORIG-001"})
    assert r.status_code == 409


def test_update_lot_not_found_returns_404(client):
    r = client.put("/api/seed-lots/99999", json={"supplier": "Acme"})
    assert r.status_code == 404


def test_generate_lot_code_raises_for_missing_seed(test_db):
    """generate_lot_code raises ValueError when seed_id doesn't exist."""
    with pytest.raises(ValueError, match="not found"):
        seed_lot_service.generate_lot_code(test_db, "nonexistent", 2026)


def test_generate_lot_code_handles_bad_seq(test_db):
    """generate_lot_code handles an existing code whose suffix isn't a valid int."""
    # Insert a lot with a non-numeric sequence suffix directly
    test_db.execute(
        "INSERT INTO seed_lots (seed_id, lot_code, packed_for_year) VALUES (?,?,?)",
        ("test-pepper", "SH-2026-XXX", 2026),
    )
    test_db.commit()
    code = seed_lot_service.generate_lot_code(test_db, "test-pepper", 2026)
    # Bad suffix defaults to seq=0 → next is 001
    assert code == "SH-2026-001"


def test_extract_packet_mocked_with_anthropic_client(monkeypatch):
    """extract_packet_data parses JSON from a mocked Claude response."""
    import types

    expected_json = '{"name":"Cherokee Purple","category":"Tomatoes","supplier":null,"supplier_lot":null,"sku":null,"packed_for_year":2026,"germ_rate":88.0,"days_to_maturity":"80","organic":true,"notes":null}'

    class FakeContent:
        text = expected_json

    class FakeMessage:
        content = [FakeContent()]

    class FakeMessages:
        def create(self, **kwargs):
            return FakeMessage()

    class FakeClient:
        messages = FakeMessages()

    class FakeAnthropic:
        def __init__(self):
            pass
        @property
        def Anthropic(self):
            return FakeClient

    # Patch anthropic module inside seed_lot_service
    fake_module = types.ModuleType("anthropic")
    fake_module.Anthropic = FakeClient
    monkeypatch.setitem(__import__("sys").modules, "anthropic", fake_module)

    result = seed_lot_service.extract_packet_data(b"fake", "image/jpeg")
    assert result["name"] == "Cherokee Purple"
    assert result["packed_for_year"] == 2026


def test_extract_packet_strips_code_fence(monkeypatch):
    """extract_packet_data handles markdown-fenced JSON in response."""
    import types

    fenced = '```json\n{"name":"Shishito","category":"Peppers","supplier":null,"supplier_lot":null,"sku":null,"packed_for_year":2025,"germ_rate":null,"days_to_maturity":"70","organic":false,"notes":null}\n```'

    class FakeContent:
        text = fenced

    class FakeMessage:
        content = [FakeContent()]

    class FakeMessages:
        def create(self, **kwargs):
            return FakeMessage()

    class FakeClient:
        messages = FakeMessages()

    fake_module = types.ModuleType("anthropic")
    fake_module.Anthropic = FakeClient
    monkeypatch.setitem(__import__("sys").modules, "anthropic", fake_module)

    result = seed_lot_service.extract_packet_data(b"fake", "image/jpeg")
    assert result["name"] == "Shishito"
    assert result["packed_for_year"] == 2025


def test_extract_packet_endpoint_error(client, monkeypatch):
    """extract-packet returns 422 when extraction raises an exception."""
    def mock_fail(image_bytes, mime_type):
        raise RuntimeError("Claude unavailable")

    monkeypatch.setattr(seed_lot_service, "extract_packet_data", mock_fail)

    import io
    r = client.post(
        "/api/seed-lots/extract-packet",
        files={"file": ("packet.jpg", io.BytesIO(b"fake"), "image/jpeg")},
    )
    assert r.status_code == 422


def test_extract_packet_mocked(client, monkeypatch):
    """Verify extract-packet endpoint calls extract_packet_data and returns expected shape."""
    expected = {
        "name": "Cherokee Purple Tomato",
        "category": "Tomatoes",
        "supplier": "Seed Savers",
        "supplier_lot": "SS-123",
        "sku": None,
        "packed_for_year": 2026,
        "germ_rate": 88.0,
        "days_to_maturity": "80",
        "organic": True,
        "notes": None,
    }

    def mock_extract(image_bytes, mime_type):
        return expected

    monkeypatch.setattr(seed_lot_service, "extract_packet_data", mock_extract)

    import io
    fake_file = io.BytesIO(b"fake image data")
    r = client.post(
        "/api/seed-lots/extract-packet",
        files={"file": ("packet.jpg", fake_file, "image/jpeg")},
    )
    assert r.status_code == 200
    result = r.json()
    assert result["name"] == "Cherokee Purple Tomato"
    assert result["packed_for_year"] == 2026
    assert result["germ_rate"] == 88.0
