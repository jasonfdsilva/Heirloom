def _create_planting(client, seed_id="test-lettuce"):
    r = client.post(
        "/api/plantings",
        json={
            "seed_id": seed_id, "year": 2026, "quantity": 4,
            "status": "planned", "indoor_start_date": "2026-03-01",
            "hardening_date": None, "transplant_date": None,
            "direct_sow_date": None, "first_harvest_date": None,
            "notes": None, "structure_id": None,
            "qty_started": None, "qty_planted": None,
        },
    )
    return r.json()["id"]


def _create_event(client, planting_id, event_type="note", details="Test note"):
    r = client.post(
        f"/api/plantings/{planting_id}/events",
        json={
            "event_date": "2026-03-15",
            "event_type": event_type,
            "details": details,
            "severity": None,
            "product_used": None,
            "quantity": None,
        },
    )
    assert r.status_code == 200
    return r.json()


def test_create_event(client):
    pid = _create_planting(client)
    event = _create_event(client, pid, event_type="germinated", details="Seeds sprouted")
    assert "id" in event


def test_create_event_planting_not_found(client):
    r = client.post(
        "/api/plantings/99999/events",
        json={
            "event_date": "2026-03-15",
            "event_type": "note",
            "details": "test",
            "severity": None,
            "product_used": None,
            "quantity": None,
        },
    )
    assert r.status_code == 404


def test_event_appears_in_planting_list(client):
    pid = _create_planting(client)
    _create_event(client, pid, event_type="germinated", details="Sprouted!")

    r = client.get("/api/plantings?year=2026")
    planting = next(p for p in r.json() if p["id"] == pid)
    assert len(planting["events"]) == 1
    assert planting["events"][0]["event_type"] == "germinated"


def test_update_event(client):
    pid = _create_planting(client)
    event = _create_event(client, pid)
    event_id = event["id"]

    r = client.put(
        f"/api/events/{event_id}",
        json={
            "event_date": "2026-03-20",
            "event_type": "note",
            "details": "Updated details",
            "severity": None,
            "product_used": None,
            "quantity": None,
        },
    )
    assert r.status_code == 200

    list_r = client.get("/api/plantings?year=2026")
    planting = next(p for p in list_r.json() if p["id"] == pid)
    evt = planting["events"][0]
    assert evt["details"] == "Updated details"
    assert evt["event_date"] == "2026-03-20"


def test_delete_event(client):
    pid = _create_planting(client)
    event = _create_event(client, pid)
    event_id = event["id"]

    r = client.delete(f"/api/events/{event_id}")
    assert r.status_code == 200

    list_r = client.get("/api/plantings?year=2026")
    planting = next(p for p in list_r.json() if p["id"] == pid)
    assert planting["events"] == []


def test_multiple_events_ordered(client):
    pid = _create_planting(client)
    _create_event(client, pid, event_type="germinated", details="First")
    _create_event(client, pid, event_type="note", details="Second")
    _create_event(client, pid, event_type="issue", details="Third")

    r = client.get("/api/plantings?year=2026")
    planting = next(p for p in r.json() if p["id"] == pid)
    assert len(planting["events"]) == 3


# ── Bulk event tests ──────────────────────────────────────────────────────────

def test_bulk_event_creates_for_all_plantings(client):
    pid1 = _create_planting(client, seed_id="test-lettuce")
    pid2 = _create_planting(client, seed_id="test-lettuce")
    pid3 = _create_planting(client, seed_id="test-lettuce")

    r = client.post("/api/events/bulk", json={
        "planting_ids": [pid1, pid2, pid3],
        "event_date": "2026-04-01",
        "event_type": "treatment",
        "details": "Fish emulsion",
        "product_used": "Neptune's Harvest",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["created"] == 3

    # Verify all three plantings have the event
    list_r = client.get("/api/plantings?year=2026")
    plantings = {p["id"]: p for p in list_r.json()}
    for pid in [pid1, pid2, pid3]:
        events = plantings[pid]["events"]
        assert len(events) == 1
        assert events[0]["event_type"] == "treatment"
        assert events[0]["product_used"] == "Neptune's Harvest"


def test_bulk_event_allows_germination(client):
    pid = _create_planting(client)
    r = client.post("/api/events/bulk", json={
        "planting_ids": [pid],
        "event_date": "2026-04-01",
        "event_type": "germinated",
    })
    assert r.status_code == 200
    assert r.json()["created"] == 1


def test_bulk_germination_sets_quantity_to_qty_started(client):
    """Bulk germination events should default quantity to qty_started (100% rate)."""
    # Create planting with qty_started = 10
    r = client.post("/api/plantings", json={
        "seed_id": "test-tomato", "year": 2026, "quantity": 4,
        "status": "planned", "indoor_start_date": "2026-03-01",
        "hardening_date": None, "transplant_date": None,
        "direct_sow_date": None, "first_harvest_date": None,
        "notes": None, "structure_id": None,
        "qty_started": 10, "qty_planted": None,
    })
    pid = r.json()["id"]

    bulk_r = client.post("/api/events/bulk", json={
        "planting_ids": [pid],
        "event_date": "2026-04-05",
        "event_type": "germinated",
    })
    assert bulk_r.status_code == 200

    # Verify the event was stored with quantity = qty_started
    plantings = client.get("/api/plantings?year=2026").json()
    planting = next(p for p in plantings if p["id"] == pid)
    assert planting["actual_germ_count"] == 10
    assert planting["actual_germ_rate"] == 100.0


def test_bulk_germination_null_qty_started_stores_null_quantity(client):
    """If qty_started is not set, bulk germination quantity stays null."""
    pid = _create_planting(client)  # qty_started=None
    bulk_r = client.post("/api/events/bulk", json={
        "planting_ids": [pid],
        "event_date": "2026-04-05",
        "event_type": "germinated",
    })
    assert bulk_r.status_code == 200

    plantings = client.get("/api/plantings?year=2026").json()
    planting = next(p for p in plantings if p["id"] == pid)
    assert planting["actual_germ_count"] == 0
    assert planting["actual_germ_rate"] is None


def test_bulk_event_rejects_missing_planting_id(client):
    r = client.post("/api/events/bulk", json={
        "planting_ids": [99999],
        "event_date": "2026-04-01",
        "event_type": "note",
        "details": "Should fail",
    })
    assert r.status_code == 404


def test_bulk_event_rejects_empty_planting_ids(client):
    r = client.post("/api/events/bulk", json={
        "planting_ids": [],
        "event_date": "2026-04-01",
        "event_type": "note",
    })
    assert r.status_code == 422
