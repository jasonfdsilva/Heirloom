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


def _create_event(client, planting_id, event_type="observation", details="Test note"):
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
    event = _create_event(client, pid, event_type="germination", details="Seeds sprouted")
    assert "id" in event


def test_create_event_planting_not_found(client):
    r = client.post(
        "/api/plantings/99999/events",
        json={
            "event_date": "2026-03-15",
            "event_type": "observation",
            "details": "test",
            "severity": None,
            "product_used": None,
            "quantity": None,
        },
    )
    assert r.status_code == 404


def test_event_appears_in_planting_list(client):
    pid = _create_planting(client)
    _create_event(client, pid, event_type="germination", details="Sprouted!")

    r = client.get("/api/plantings?year=2026")
    planting = next(p for p in r.json() if p["id"] == pid)
    assert len(planting["events"]) == 1
    assert planting["events"][0]["event_type"] == "germination"


def test_update_event(client):
    pid = _create_planting(client)
    event = _create_event(client, pid)
    event_id = event["id"]

    r = client.put(
        f"/api/events/{event_id}",
        json={
            "event_date": "2026-03-20",
            "event_type": "observation",
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
    _create_event(client, pid, event_type="germination", details="First")
    _create_event(client, pid, event_type="observation", details="Second")
    _create_event(client, pid, event_type="pest", details="Third")

    r = client.get("/api/plantings?year=2026")
    planting = next(p for p in r.json() if p["id"] == pid)
    assert len(planting["events"]) == 3
