def _create_planting(client, seed_id="test-lettuce", year=2026, status="planned"):
    payload = {
        "seed_id": seed_id,
        "year": year,
        "quantity": 6,
        "status": status,
        "indoor_start_date": "2026-03-01",
        "hardening_date": None,
        "transplant_date": None,
        "direct_sow_date": None,
        "first_harvest_date": None,
        "notes": None,
        "structure_id": None,
        "qty_started": None,
        "qty_planted": None,
    }
    r = client.post("/api/plantings", json=payload)
    assert r.status_code == 200
    return r.json()


def test_list_plantings_empty(client):
    r = client.get("/api/plantings?year=2026")
    assert r.status_code == 200
    assert r.json() == []


def test_create_planting(client):
    data = _create_planting(client)
    assert "id" in data

    # Confirm it appears in the list with the right seed
    list_r = client.get("/api/plantings?year=2026")
    planting = next((p for p in list_r.json() if p["id"] == data["id"]), None)
    assert planting is not None
    assert planting["seed_id"] == "test-lettuce"


def test_list_plantings_after_create(client):
    _create_planting(client, seed_id="test-lettuce")
    _create_planting(client, seed_id="test-tomato")

    r = client.get("/api/plantings?year=2026")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    seed_ids = {p["seed_id"] for p in data}
    assert "test-lettuce" in seed_ids
    assert "test-tomato" in seed_ids


def test_planting_has_joined_seed_fields(client):
    _create_planting(client, seed_id="test-tomato")
    r = client.get("/api/plantings?year=2026")
    planting = r.json()[0]
    assert planting["seed_name"] == "Sun Gold"
    assert planting["category"] == "Tomatoes"


def test_update_planting_status(client):
    created = _create_planting(client)
    planting_id = created["id"]

    r = client.put(
        f"/api/plantings/{planting_id}",
        json={
            "seed_id": "test-lettuce",
            "year": 2026,
            "quantity": 6,
            "status": "started",
            "indoor_start_date": "2026-03-01",
            "hardening_date": None,
            "transplant_date": None,
            "direct_sow_date": None,
            "first_harvest_date": None,
            "notes": None,
            "structure_id": None,
            "qty_started": None,
            "qty_planted": None,
        },
    )
    assert r.status_code == 200

    list_r = client.get("/api/plantings?year=2026")
    p = next(pl for pl in list_r.json() if pl["id"] == planting_id)
    assert p["status"] == "started"


def test_update_planting_not_found(client):
    r = client.put(
        "/api/plantings/99999",
        json={
            "seed_id": "test-lettuce", "year": 2026, "quantity": 1,
            "status": "planned", "indoor_start_date": None, "hardening_date": None,
            "transplant_date": None, "direct_sow_date": None,
            "first_harvest_date": None, "notes": None,
            "structure_id": None, "qty_started": None, "qty_planted": None,
        },
    )
    assert r.status_code == 404


def test_delete_planting(client):
    created = _create_planting(client)
    planting_id = created["id"]

    r = client.delete(f"/api/plantings/{planting_id}")
    assert r.status_code == 200

    list_r = client.get("/api/plantings?year=2026")
    ids = [p["id"] for p in list_r.json()]
    assert planting_id not in ids


def test_duplicate_planting(client):
    created = _create_planting(client, seed_id="test-pepper")
    planting_id = created["id"]

    r = client.post(f"/api/plantings/{planting_id}/duplicate")
    assert r.status_code == 200
    dup = r.json()
    assert dup["id"] != planting_id

    list_r = client.get("/api/plantings?year=2026")
    pepper_plantings = [p for p in list_r.json() if p["seed_id"] == "test-pepper"]
    assert len(pepper_plantings) == 2


def test_duplicate_planting_not_found(client):
    r = client.post("/api/plantings/99999/duplicate")
    assert r.status_code == 404


def test_update_family_notes(client):
    created = _create_planting(client)
    planting_id = created["id"]

    r = client.patch(
        f"/api/plantings/{planting_id}/family-notes",
        json={"notes": "Great producer last year"},
    )
    assert r.status_code == 200
    assert r.json()["message"] == "Family notes updated"


def test_update_family_notes_not_found(client):
    r = client.patch(
        "/api/plantings/99999/family-notes",
        json={"notes": "This should 404"},
    )
    assert r.status_code == 404


def test_create_planting_invalid_seed(client):
    r = client.post(
        "/api/plantings",
        json={
            "seed_id": "does-not-exist", "year": 2026, "quantity": 1,
            "status": "planned", "indoor_start_date": None, "hardening_date": None,
            "transplant_date": None, "direct_sow_date": None,
            "first_harvest_date": None, "notes": None,
            "structure_id": None, "qty_started": None, "qty_planted": None,
        },
    )
    assert r.status_code == 404


# ── Nursery planting fixes ────────────────────────────────────────────────────

def _create_nursery_planting(client, qty_planted=1, supplier=None):
    r = client.post("/api/plantings", json={
        "seed_id": "test-lettuce", "year": 2026,
        "method": "nursery",
        "qty_started": None, "qty_planted": qty_planted,
        "purchased_date": "2026-04-18",
        "supplier": supplier,
        "status": "planned",
        "structure_id": None,
    })
    assert r.status_code == 200
    return r.json()


def _get_planting(client, pid):
    r = client.get("/api/plantings?year=2026")
    return next(p for p in r.json() if p["id"] == pid)


def test_nursery_planting_unplaced_count_uses_qty_planted(client):
    """Nursery plantings use qty_planted (not qty_started) for unplaced_count."""
    data = _create_nursery_planting(client, qty_planted=3)
    p = _get_planting(client, data["id"])
    assert p["unplaced_count"] == 3


def test_nursery_planting_null_qty_planted_gives_zero_unplaced(client):
    """If qty_planted is also null, unplaced_count is 0 not an error."""
    r = client.post("/api/plantings", json={
        "seed_id": "test-lettuce", "year": 2026,
        "method": "nursery", "qty_started": None, "qty_planted": None,
        "status": "planned", "structure_id": None,
    })
    pid = r.json()["id"]
    p = _get_planting(client, pid)
    assert p["unplaced_count"] == 0


def test_nursery_supplier_is_saved_and_returned(client):
    """Supplier name is persisted and returned in planting list."""
    data = _create_nursery_planting(client, supplier="Great Swamp Greenhouses")
    p = _get_planting(client, data["id"])
    assert p["supplier"] == "Great Swamp Greenhouses"


def test_nursery_supplier_can_be_updated(client):
    """Supplier can be changed via PUT."""
    data = _create_nursery_planting(client, supplier="Home Depot")
    client.put(f"/api/plantings/{data['id']}", json={"supplier": "Great Swamp Greenhouses"})
    p = _get_planting(client, data["id"])
    assert p["supplier"] == "Great Swamp Greenhouses"


def test_nursery_supplier_can_be_cleared(client):
    """Setting supplier to null via PUT clears it (exclude_unset, not exclude_none)."""
    data = _create_nursery_planting(client, supplier="Home Depot")
    client.put(f"/api/plantings/{data['id']}", json={"supplier": None})
    p = _get_planting(client, data["id"])
    assert p["supplier"] is None
