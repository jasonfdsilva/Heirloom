def _seed_planting(client):
    r = client.post(
        "/api/plantings",
        json={
            "seed_id": "test-lettuce", "year": 2026, "quantity": 4,
            "status": "planned", "indoor_start_date": "2026-03-01",
            "hardening_date": None, "transplant_date": None,
            "direct_sow_date": None, "first_harvest_date": None,
            "notes": None, "structure_id": None,
            "qty_started": None, "qty_planted": None,
        },
    )
    return r.json()["id"]


def test_export_returns_all_tables(client):
    r = client.get("/api/export")
    assert r.status_code == 200
    data = r.json()

    assert "exported_at" in data
    assert "seeds" in data
    assert "structures" in data
    assert "plantings" in data
    assert "events" in data
    assert "photos" in data
    assert "grid_cells" in data
    assert "plant_harvests" in data


def test_export_includes_mock_data(client):
    r = client.get("/api/export")
    data = r.json()
    assert len(data["seeds"]) == 3
    assert len(data["structures"]) == 2


def test_export_includes_created_planting(client):
    _seed_planting(client)
    r = client.get("/api/export")
    assert len(r.json()["plantings"]) == 1


def test_import_rebuilds_from_export(client):
    pid = _seed_planting(client)
    # Add an event
    client.post(f"/api/plantings/{pid}/events", json={
        "event_date": "2026-03-10", "event_type": "germinated",
        "details": "Sprouted", "severity": None,
        "product_used": None, "quantity": None,
    })

    # Export current state
    export_r = client.get("/api/export")
    export_data = export_r.json()
    assert len(export_data["plantings"]) == 1
    assert len(export_data["events"]) == 1

    # Import back (clears + rebuilds)
    import_r = client.post("/api/import", json=export_data)
    assert import_r.status_code == 200

    # Data should be identical
    verify_r = client.get("/api/export")
    verify = verify_r.json()
    assert len(verify["seeds"]) == 3
    assert len(verify["plantings"]) == 1
    assert len(verify["events"]) == 1


def test_import_clears_existing_data(client):
    _seed_planting(client)
    _seed_planting(client)

    # Confirm 2 plantings exist
    assert len(client.get("/api/export").json()["plantings"]) == 2

    # Import a dataset with only 1 planting
    export_data = client.get("/api/export").json()
    single_planting_data = {**export_data, "plantings": export_data["plantings"][:1]}
    # Remove events that reference the removed planting
    kept_id = single_planting_data["plantings"][0]["id"]
    single_planting_data["events"] = [
        e for e in export_data["events"] if e["planting_id"] == kept_id
    ]

    client.post("/api/import", json=single_planting_data)
    assert len(client.get("/api/export").json()["plantings"]) == 1


def test_import_with_photos_grid_cells_harvests(client):
    """Import payload that exercises photos, grid_cells, and plant_harvests branches."""
    pid = _seed_planting(client)

    # Build a full import payload with all optional tables populated
    payload = {
        "seeds": [
            {
                "id": "test-lettuce", "name": "Buttercrunch Lettuce", "variety": "Buttercrunch",
                "category": "Greens", "species": "Lactuca sativa", "days_to_maturity": "55",
                "germ_rate": 0.90, "lot": None, "sku": None, "organic": 1,
                "supplier": "Johnny's", "min_seeds": 50, "start_indoors": 1, "direct_sow": 1,
                "suggested_indoor_weeks": 6, "spacing_inches": 8, "notes": None,
            }
        ],
        "structures": [
            {
                "id": "test-bed-1", "name": "Raised Bed 1", "type": "raised_bed",
                "width": 4.0, "length": 8.0, "map_x": 100.0, "map_y": 50.0,
            }
        ],
        "plantings": [
            {
                "id": pid, "seed_id": "test-lettuce", "structure_id": None, "year": 2026,
                "quantity": 4, "indoor_start_date": "2026-03-01", "hardening_date": None,
                "transplant_date": None, "direct_sow_date": None, "first_harvest_date": None,
                "status": "planned", "notes": None, "created_at": None, "updated_at": None,
            }
        ],
        "events": [],
        "photos": [
            {
                "id": 1, "planting_id": pid, "filename": "test_photo.jpg",
                "original_name": "test_photo.jpg", "caption": "First sprouts",
                "taken_date": "2026-03-15", "created_at": None,
            }
        ],
        "grid_cells": [
            {
                "id": 1, "planting_id": pid, "structure_id": "test-bed-1",
                "row": 0, "col": 0, "plant_guid": "abc-123",
                "short_id": "BL-01", "plant_status": "healthy",
                "plant_notes": None, "label_visible": 1,
            }
        ],
        "plant_harvests": [
            {
                "id": 1, "plant_guid": "abc-123", "harvest_date": "2026-06-01",
                "weight_oz": 2.5, "count": 3, "notes": "First harvest",
                "created_at": None,
            }
        ],
    }

    r = client.post("/api/import", json=payload)
    assert r.status_code == 200

    # Verify all tables were populated
    export = client.get("/api/export").json()
    assert len(export["photos"]) == 1
    assert export["photos"][0]["caption"] == "First sprouts"
    assert len(export["grid_cells"]) == 1
    assert export["grid_cells"][0]["plant_guid"] == "abc-123"
    assert len(export["plant_harvests"]) == 1
    assert export["plant_harvests"][0]["weight_oz"] == 2.5


def test_export_roundtrip_preserves_seed_fields(client):
    export_data = client.get("/api/export").json()
    lettuce = next(s for s in export_data["seeds"] if s["id"] == "test-lettuce")
    assert lettuce["name"] == "Buttercrunch Lettuce"
    assert lettuce["category"] == "Greens"
    assert lettuce["organic"] == 1

    client.post("/api/import", json=export_data)

    verify = client.get("/api/export").json()
    lettuce2 = next(s for s in verify["seeds"] if s["id"] == "test-lettuce")
    assert lettuce2["name"] == lettuce["name"]
    assert lettuce2["organic"] == lettuce["organic"]
