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


# ── Failed event auto-status sync ────────────────────────────────────────────

def _get_planting_status(client, pid):
    r = client.get("/api/plantings?year=2026")
    return next(p["status"] for p in r.json() if p["id"] == pid)


def _get_unplaced_count(client, pid):
    r = client.get("/api/plantings?year=2026")
    return next(p["unplaced_count"] for p in r.json() if p["id"] == pid)


def test_failed_event_auto_sets_planting_status(client):
    """Logging a failed event automatically marks the planting as failed."""
    pid = _create_planting(client)
    assert _get_planting_status(client, pid) == "planned"
    _create_event(client, pid, event_type="failed", details="Nothing germinated")
    assert _get_planting_status(client, pid) == "failed"


def test_failed_planting_has_zero_unplaced_count(client):
    """Failed plantings report unplaced_count=0 regardless of qty_started."""
    r = client.post(
        "/api/plantings",
        json={
            "seed_id": "test-lettuce", "year": 2026, "quantity": 4,
            "status": "planned", "indoor_start_date": "2026-03-01",
            "hardening_date": None, "transplant_date": None,
            "direct_sow_date": None, "first_harvest_date": None,
            "notes": None, "structure_id": None,
            "qty_started": 12, "qty_planted": 12,
        },
    )
    pid = r.json()["id"]
    assert _get_unplaced_count(client, pid) == 12
    _create_event(client, pid, event_type="failed", details="Nothing germinated")
    assert _get_unplaced_count(client, pid) == 0


def test_deleting_failed_event_reverts_status_to_planned(client):
    """Deleting the only failed event reverts the planting status to planned."""
    pid = _create_planting(client)
    event = _create_event(client, pid, event_type="failed", details="Failed")
    assert _get_planting_status(client, pid) == "failed"
    client.delete(f"/api/events/{event['id']}")
    assert _get_planting_status(client, pid) == "planned"


def test_deleting_one_failed_event_keeps_failed_if_another_remains(client):
    """Deleting one failed event keeps status=failed if another failed event still exists."""
    pid = _create_planting(client)
    event1 = _create_event(client, pid, event_type="failed", details="First failure")
    event2 = _create_event(client, pid, event_type="failed", details="Second failure")
    client.delete(f"/api/events/{event1['id']}")
    assert _get_planting_status(client, pid) == "failed"
    client.delete(f"/api/events/{event2['id']}")
    assert _get_planting_status(client, pid) == "planned"


def test_updating_event_type_to_failed_sets_status(client):
    """Editing an existing event's type to 'failed' auto-marks the planting failed."""
    pid = _create_planting(client)
    event = _create_event(client, pid, event_type="note", details="Just a note")
    assert _get_planting_status(client, pid) == "planned"
    client.put(f"/api/events/{event['id']}", json={
        "event_date": "2026-03-15", "event_type": "failed",
        "details": "Actually failed", "severity": None,
        "product_used": None, "quantity": None,
    })
    assert _get_planting_status(client, pid) == "failed"


def test_updating_event_away_from_failed_reverts_status(client):
    """Editing a failed event to a non-failed type reverts status if no other failed events."""
    pid = _create_planting(client)
    event = _create_event(client, pid, event_type="failed", details="Failed")
    assert _get_planting_status(client, pid) == "failed"
    client.put(f"/api/events/{event['id']}", json={
        "event_date": "2026-03-15", "event_type": "note",
        "details": "Actually a note", "severity": None,
        "product_used": None, "quantity": None,
    })
    assert _get_planting_status(client, pid) == "planned"


def test_bulk_failed_event_sets_all_planting_statuses(client):
    """Bulk logging a failed event marks all targeted plantings as failed."""
    pid1 = _create_planting(client)
    pid2 = _create_planting(client)
    client.post("/api/events/bulk", json={
        "planting_ids": [pid1, pid2],
        "event_date": "2026-04-01",
        "event_type": "failed",
        "details": "Both failed",
    })
    assert _get_planting_status(client, pid1) == "failed"
    assert _get_planting_status(client, pid2) == "failed"


def test_duplicate_planting_resets_failed_status_to_planned(client):
    """Duplicating a failed planting starts the duplicate as planned, not failed."""
    pid = _create_planting(client)
    _create_event(client, pid, event_type="failed", details="Failed")
    assert _get_planting_status(client, pid) == "failed"
    r = client.post(f"/api/plantings/{pid}/duplicate")
    assert r.status_code == 200
    new_pid = r.json()["id"]
    assert _get_planting_status(client, new_pid) == "planned"
