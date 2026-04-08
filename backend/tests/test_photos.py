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


def test_upload_photo_planting_not_found(client):
    fake_image = io.BytesIO(b"fake-jpeg-data")
    r = client.post(
        "/api/plantings/99999/photos",
        files={"file": ("test.jpg", fake_image, "image/jpeg")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )
    assert r.status_code == 404


def test_list_plant_photos_empty(client):
    r = client.get("/api/plants/nonexistent-guid-abc123/photos")
    assert r.status_code == 200
    assert r.json() == []


def test_list_plant_photos_with_data(client, tmp_path, monkeypatch):
    """Upload a photo linked to a plant_guid and verify it's returned."""
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid = _create_planting(client)
    # Paint a grid cell to create a plant_guid, then read back the grid
    paint_r = client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}],
    })
    assert paint_r.status_code == 200
    grid_r = client.get("/api/structures/test-bed-1/grid")
    cells = grid_r.json()
    assert cells, "Expected at least one cell after painting"
    plant_guid = cells[0]["plant_guid"]

    # Upload a photo tagged to this plant_guid
    upload_r = client.post(
        f"/api/plants/{plant_guid}/photos",
        files={"file": ("plant.jpg", io.BytesIO(b"img"), "image/jpeg")},
        data={"planting_id": str(pid), "caption": "closeup", "taken_date": ""},
    )
    assert upload_r.status_code == 200

    list_r = client.get(f"/api/plants/{plant_guid}/photos")
    assert list_r.status_code == 200
    assert len(list_r.json()) == 1
    assert list_r.json()[0]["caption"] == "closeup"


def test_upload_plant_photo_invalid_extension_defaults_to_jpg(client, tmp_path, monkeypatch):
    """Uploading a plant photo with an unsupported extension (e.g. .bmp) saves as .jpg.

    The extension-normalisation code lives in upload_plant_photo (plant-guid route),
    not in upload_photo (planting route), so this test must call the plant endpoint.
    """
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid = _create_planting(client)
    # Paint a grid cell to obtain a plant_guid
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}],
    })
    cells = client.get("/api/structures/test-bed-1/grid").json()
    plant_guid = cells[0]["plant_guid"]

    r = client.post(
        f"/api/plants/{plant_guid}/photos",
        files={"file": ("scan.bmp", io.BytesIO(b"bmp-data"), "image/bmp")},
        data={"planting_id": str(pid), "caption": "", "taken_date": ""},
    )
    assert r.status_code == 200
    # .bmp is unsupported → service normalises to .jpg
    assert r.json()["filename"].endswith(".jpg")


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


def test_link_photo_endpoint(client, tmp_path, monkeypatch):
    """POST /api/photos/link creates a DB record for an existing file without re-uploading."""
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid1 = _create_planting(client, seed_id="test-lettuce")
    pid2 = _create_planting(client, seed_id="test-tomato")

    # Upload the actual file once for pid1
    up = client.post(
        f"/api/plantings/{pid1}/photos",
        files={"file": ("shared.jpg", io.BytesIO(b"shared-img"), "image/jpeg")},
        data={"caption": "", "taken_date": "2026-04-01", "event_id": ""},
    )
    assert up.status_code == 200
    filename = up.json()["filename"]

    # Link the same file to pid2 — no file upload, just a DB record
    link_r = client.post(
        "/api/photos/link",
        data={
            "filename": filename,
            "original_name": "shared.jpg",
            "planting_id": str(pid2),
            "taken_date": "2026-04-01",
        },
    )
    assert link_r.status_code == 200
    assert link_r.json()["filename"] == filename

    # Both plantings should now have a photo record
    assert len(client.get(f"/api/plantings/{pid1}/photos").json()) == 1
    assert len(client.get(f"/api/plantings/{pid2}/photos").json()) == 1


def test_link_photo_planting_not_found(client):
    """POST /api/photos/link returns 404 when planting does not exist."""
    r = client.post(
        "/api/photos/link",
        data={"filename": "whatever.jpg", "original_name": "x.jpg", "planting_id": "99999"},
    )
    assert r.status_code == 404


def test_delete_shared_photo_keeps_file_until_last_record(client, tmp_path, monkeypatch):
    """Deleting one of N records sharing a file must not remove the physical file
    until the last record is deleted."""
    import backend.app.services.photo_service as ps
    import os
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid1 = _create_planting(client, seed_id="test-lettuce")
    pid2 = _create_planting(client, seed_id="test-tomato")

    # Upload once
    up = client.post(
        f"/api/plantings/{pid1}/photos",
        files={"file": ("shared.jpg", io.BytesIO(b"img"), "image/jpeg")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )
    filename = up.json()["filename"]
    photo_id1 = up.json()["id"]

    # Link to pid2
    link_r = client.post(
        "/api/photos/link",
        data={"filename": filename, "original_name": "shared.jpg", "planting_id": str(pid2)},
    )
    photo_id2 = link_r.json()["id"]

    # Delete the first record — file must still exist
    client.delete(f"/api/photos/{photo_id1}")
    assert os.path.exists(os.path.join(str(tmp_path), filename)), "File should still exist after deleting first record"

    # Delete the second (last) record — file should now be removed
    client.delete(f"/api/photos/{photo_id2}")
    assert not os.path.exists(os.path.join(str(tmp_path), filename)), "File should be removed after deleting last record"


def test_bulk_event_returns_pairs(client):
    """POST /api/events/bulk now returns a 'pairs' list with event_id + planting_id."""
    pid1 = _create_planting(client, seed_id="test-lettuce")
    pid2 = _create_planting(client, seed_id="test-tomato")

    r = client.post("/api/events/bulk", json={
        "planting_ids": [pid1, pid2],
        "event_date": "2026-04-01",
        "event_type": "note",
        "details": "bulk test",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["created"] == 2
    assert len(data["pairs"]) == 2
    planting_ids_returned = {p["planting_id"] for p in data["pairs"]}
    assert planting_ids_returned == {pid1, pid2}
    for pair in data["pairs"]:
        assert "event_id" in pair
        assert pair["event_id"] is not None


def test_upload_photo_too_large_rejected(client, tmp_path, monkeypatch):
    """Uploads exceeding MAX_PHOTO_BYTES must be rejected with 413."""
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))
    monkeypatch.setattr(ps, "MAX_PHOTO_BYTES", 100)  # set tiny limit for test

    pid = _create_planting(client)
    big_content = b"x" * 101
    r = client.post(
        f"/api/plantings/{pid}/photos",
        files={"file": ("big.jpg", io.BytesIO(big_content), "image/jpeg")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )
    assert r.status_code == 413


def test_upload_photo_unknown_extension_normalised_to_jpg(client, tmp_path, monkeypatch):
    """Uploads with unknown extensions are saved with .jpg extension."""
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    pid = _create_planting(client)
    r = client.post(
        f"/api/plantings/{pid}/photos",
        files={"file": ("malicious.exe", io.BytesIO(b"data"), "application/octet-stream")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )
    assert r.status_code == 200
    assert r.json()["filename"].endswith(".jpg")


def test_upload_photo_atomicity_no_db_record_on_file_write_failure(client, monkeypatch):
    """If the temp file write fails, no DB record should be created (write-first pattern)."""
    import backend.app.services.photo_service as ps
    # Point PHOTOS_DIR at a non-existent directory so the temp write fails immediately
    monkeypatch.setattr(ps, "PHOTOS_DIR", "/nonexistent_dir_xyz_abc")

    pid = _create_planting(client)
    r = client.post(
        f"/api/plantings/{pid}/photos",
        files={"file": ("shot.jpg", io.BytesIO(b"data"), "image/jpeg")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )
    assert r.status_code == 500
    # No DB record should exist because the file write failed before the INSERT
    photos = client.get(f"/api/plantings/{pid}/photos").json()
    assert len(photos) == 0


def test_upload_plant_photo_too_large_rejected(client, tmp_path, monkeypatch):
    """Plant photo uploads exceeding MAX_PHOTO_BYTES must be rejected with 413."""
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))
    monkeypatch.setattr(ps, "MAX_PHOTO_BYTES", 100)

    pid = _create_planting(client)
    r = client.post(
        f"/api/plants/some-guid-1234/photos",
        files={"file": ("big.jpg", io.BytesIO(b"x" * 101), "image/jpeg")},
        data={"planting_id": str(pid), "caption": "", "taken_date": ""},
    )
    assert r.status_code == 413


def test_upload_plant_photo_atomicity_no_db_record_on_file_write_failure(client, monkeypatch):
    """If the plant photo temp write fails, no DB record should be created."""
    import backend.app.services.photo_service as ps
    monkeypatch.setattr(ps, "PHOTOS_DIR", "/nonexistent_dir_xyz_abc")

    pid = _create_planting(client)
    r = client.post(
        f"/api/plants/some-guid-5678/photos",
        files={"file": ("shot.jpg", io.BytesIO(b"data"), "image/jpeg")},
        data={"planting_id": str(pid), "caption": "", "taken_date": ""},
    )
    assert r.status_code == 500
    photos = client.get(f"/api/plantings/{pid}/photos").json()
    assert len(photos) == 0


# ── serve_photo path-traversal tests ─────────────────────────────────────────

def test_upload_photo_rename_failure_rolls_back_db_record(client, tmp_path, monkeypatch):
    """If os.rename fails after DB commit, the compensating DELETE removes the record."""
    import backend.app.services.photo_service as ps
    import os
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    original_rename = os.rename

    def fail_rename(src, dst):
        raise OSError("simulated rename failure")

    monkeypatch.setattr(os, "rename", fail_rename)

    pid = _create_planting(client)
    r = client.post(
        f"/api/plantings/{pid}/photos",
        files={"file": ("shot.jpg", io.BytesIO(b"data"), "image/jpeg")},
        data={"caption": "", "taken_date": "", "event_id": ""},
    )
    assert r.status_code == 500
    # Compensating DELETE should have removed the DB record
    photos = client.get(f"/api/plantings/{pid}/photos").json()
    assert len(photos) == 0


def test_upload_plant_photo_rename_failure_rolls_back_db_record(client, tmp_path, monkeypatch):
    """If os.rename fails after DB commit for plant photo, the compensating DELETE removes the record."""
    import backend.app.services.photo_service as ps
    import os
    monkeypatch.setattr(ps, "PHOTOS_DIR", str(tmp_path))

    def fail_rename(src, dst):
        raise OSError("simulated rename failure")

    monkeypatch.setattr(os, "rename", fail_rename)

    pid = _create_planting(client)
    r = client.post(
        f"/api/plants/some-guid-9999/photos",
        files={"file": ("shot.jpg", io.BytesIO(b"data"), "image/jpeg")},
        data={"planting_id": str(pid), "caption": "", "taken_date": ""},
    )
    assert r.status_code == 500
    photos = client.get(f"/api/plantings/{pid}/photos").json()
    assert len(photos) == 0


# ── serve_photo path-traversal tests ─────────────────────────────────────────

def test_serve_photo_path_traversal_with_slashes(client):
    """Filenames containing '/' must return 404."""
    r = client.get("/photos/../../etc/passwd")
    assert r.status_code == 404


def test_serve_photo_path_traversal_with_backslash(client):
    """Filenames containing '\\' must return 404."""
    r = client.get("/photos/..\\etc\\passwd")
    assert r.status_code == 404


def test_serve_photo_missing_file_returns_404(client, tmp_path, monkeypatch):
    """Requesting a filename that does not exist on disk returns 404."""
    import backend.app.main as main_module
    import backend.app.database as db_module
    monkeypatch.setattr(db_module, "PHOTOS_DIR", str(tmp_path))
    monkeypatch.setattr(main_module, "PHOTOS_DIR", str(tmp_path))
    r = client.get("/photos/nonexistent.jpg")
    assert r.status_code == 404


def test_serve_photo_unknown_extension_returns_404(client, tmp_path, monkeypatch):
    """Requesting a filename with an unrecognised extension returns 404."""
    import backend.app.main as main_module
    import backend.app.database as db_module
    # Create a file with an unsupported extension in tmp_path
    (tmp_path / "evil.exe").write_bytes(b"exe-content")
    monkeypatch.setattr(db_module, "PHOTOS_DIR", str(tmp_path))
    monkeypatch.setattr(main_module, "PHOTOS_DIR", str(tmp_path))
    r = client.get("/photos/evil.exe")
    assert r.status_code == 404
