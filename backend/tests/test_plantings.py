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
