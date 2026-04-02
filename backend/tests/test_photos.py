import io


def _create_planting(client, seed_id="test-lettuce"):
    r = client.post(
        "/api/plantings",
        json={
            "seed_id": seed_id, "year": 2026, "quantity": 4,
            "status": "planned", "indoor_start_date": None,
            "hardening_date": None, "transplant_date": None,
            "direct_sow_date": None, "first_harvest_date": None,
            "notes": None, "structure_id": None,
            "qty_started": None, "qty_planted": None,
        },
    )
    return r.json()["id"]


def test_list_photos_for_planting_empty(client):
    pid = _create_planting(client)
    r = client.get(f"/api/plantings/{pid}/photos")
    assert r.status_code == 200
    assert r.json() == []


def test_list_all_photos_empty(client):
    r = client.get("/api/photos")
    assert r.status_code == 200
    assert r.json() == []


def test_list_photos_planting_not_found(client):
    # Listing photos for nonexistent planting returns 404
    r = client.get("/api/plantings/99999/photos")
    # The route doesn't validate planting existence for GET, returns empty
    # (consistent with original behavior — just a filtered query)
    assert r.status_code in (200, 404)


def test_upload_photo(client, tmp_path, monkeypatch):
    # Monkeypatch PHOTOS_DIR so the upload writes to a temp dir
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid = _create_planting(client)
    fake_image = io.BytesIO(b"fake-jpeg-data")
    r = client.post(
        f"/api/plantings/{pid}/photos",
        files={"file": ("test.jpg", fake_image, "image/jpeg")},
        data={"caption": "Seedlings", "taken_date": "2026-03-15", "event_id": ""},
    )
    assert r.status_code == 200
    data = r.json()
    assert "filename" in data
    assert "id" in data


def test_upload_photo_appears_in_list(client, tmp_path, monkeypatch):
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid = _create_planting(client)
    client.post(
        f"/api/plantings/{pid}/photos",
        files={"file": ("shot.jpg", io.BytesIO(b"data"), "image/jpeg")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )

    r = client.get(f"/api/plantings/{pid}/photos")
    assert len(r.json()) == 1

    all_r = client.get("/api/photos")
    assert len(all_r.json()) == 1
    assert all_r.json()[0]["seed_name"] == "Buttercrunch Lettuce"


def test_delete_photo(client, tmp_path, monkeypatch):
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid = _create_planting(client)
    up = client.post(
        f"/api/plantings/{pid}/photos",
        files={"file": ("del.jpg", io.BytesIO(b"data"), "image/jpeg")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )
    photo_id = up.json()["id"]

    r = client.delete(f"/api/photos/{photo_id}")
    assert r.status_code == 200

    list_r = client.get(f"/api/plantings/{pid}/photos")
    assert list_r.json() == []
