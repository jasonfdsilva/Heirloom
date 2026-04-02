def test_list_seeds_returns_all(client):
    r = client.get("/api/seeds")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 3
    ids = {s["id"] for s in data}
    assert "test-lettuce" in ids
    assert "test-tomato" in ids
    assert "test-pepper" in ids


def test_list_seeds_has_expected_fields(client):
    r = client.get("/api/seeds")
    seed = next(s for s in r.json() if s["id"] == "test-lettuce")
    assert seed["name"] == "Buttercrunch Lettuce"
    assert seed["category"] == "Greens"
    assert seed["organic"] == 1


def test_create_seed(client):
    payload = {
        "name": "Cherry Belle Radish",
        "variety": "Cherry Belle",
        "category": "Root Vegetables",
        "species": "Raphanus sativus",
        "days_to_maturity": "24",
        "germ_rate": 0.92,
        "lot": "R001",
        "sku": None,
        "organic": False,
        "supplier": "Burpee",
        "min_seeds": 100,
        "start_indoors": False,
        "direct_sow": True,
        "suggested_indoor_weeks": 0,
        "spacing_inches": 3,
        "notes": None,
    }
    r = client.post("/api/seeds", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "id" in data

    # Verify it appears in the list with correct name
    list_r = client.get("/api/seeds")
    seed = next((s for s in list_r.json() if s["id"] == data["id"]), None)
    assert seed is not None
    assert seed["name"] == "Cherry Belle Radish"


def test_update_seed(client):
    r = client.put(
        "/api/seeds/test-tomato",
        json={
            "name": "Sun Gold Updated",
            "variety": "Sun Gold F1",
            "category": "Tomatoes",
            "species": "Solanum lycopersicum",
            "days_to_maturity": "57",
            "germ_rate": 0.95,
            "lot": "T001",
            "sku": None,
            "organic": False,
            "supplier": "Johnny's",
            "min_seeds": 25,
            "start_indoors": True,
            "direct_sow": False,
            "suggested_indoor_weeks": 8,
            "spacing_inches": 24,
            "notes": "Updated note",
        },
    )
    assert r.status_code == 200

    list_r = client.get("/api/seeds")
    tomato = next(s for s in list_r.json() if s["id"] == "test-tomato")
    assert tomato["name"] == "Sun Gold Updated"
    assert tomato["notes"] == "Updated note"


def test_update_seed_not_found(client):
    r = client.put(
        "/api/seeds/does-not-exist",
        json={
            "name": "X", "variety": None, "category": "Greens", "species": None,
            "days_to_maturity": None, "germ_rate": None, "lot": None, "sku": None,
            "organic": False, "supplier": None, "min_seeds": None,
            "start_indoors": False, "direct_sow": False,
            "suggested_indoor_weeks": 0, "spacing_inches": 12, "notes": None,
        },
    )
    assert r.status_code == 404


def test_patch_seed_label(client):
    r = client.patch("/api/seeds/test-pepper/label", json={"short_label": "SH"})
    assert r.status_code == 200

    list_r = client.get("/api/seeds")
    pepper = next(s for s in list_r.json() if s["id"] == "test-pepper")
    assert pepper["short_label"] == "SH"
