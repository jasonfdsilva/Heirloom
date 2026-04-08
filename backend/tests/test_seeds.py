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


def test_create_seed_collision_gets_suffix(client):
    payload = {
        "name": "Collision Radish",
        "variety": None,
        "category": "Root Vegetables",
        "species": None,
        "days_to_maturity": "24",
        "germ_rate": 0.90,
        "lot": None,
        "sku": None,
        "organic": False,
        "supplier": None,
        "min_seeds": 50,
        "start_indoors": False,
        "direct_sow": True,
        "suggested_indoor_weeks": 0,
        "spacing_inches": 3,
        "notes": None,
    }
    # First create — gets "collision-radish"
    r1 = client.post("/api/seeds", json=payload)
    assert r1.status_code == 200
    assert r1.json()["id"] == "collision-radish"

    # Second create with same name — gets "collision-radish-1"
    r2 = client.post("/api/seeds", json=payload)
    assert r2.status_code == 200
    assert r2.json()["id"] == "collision-radish-1"

    # Third — gets "collision-radish-2"
    r3 = client.post("/api/seeds", json=payload)
    assert r3.status_code == 200
    assert r3.json()["id"] == "collision-radish-2"


def test_patch_seed_image_url(client):
    url = "https://example.com/lettuce.jpg"
    r = client.patch("/api/seeds/test-lettuce/image", json={"image_url": url})
    assert r.status_code == 200

    seeds = client.get("/api/seeds").json()
    lettuce = next(s for s in seeds if s["id"] == "test-lettuce")
    assert lettuce["image_url"] == url


def test_create_seed_with_common_name(client):
    payload = {
        "name": "Winterbor F1",
        "category": "Brassicas",
        "common_name": "Kale",
        "species": "Brassica oleracea",
        "organic": False,
        "start_indoors": True,
        "direct_sow": False,
        "suggested_indoor_weeks": 6,
        "spacing_inches": 18,
    }
    r = client.post("/api/seeds", json=payload)
    assert r.status_code == 200
    seed_id = r.json()["id"]

    seeds = client.get("/api/seeds").json()
    seed = next(s for s in seeds if s["id"] == seed_id)
    assert seed["common_name"] == "Kale"


def test_update_seed_common_name(client):
    r = client.put(
        "/api/seeds/test-lettuce",
        json={
            "name": "Buttercrunch Lettuce",
            "category": "Greens",
            "common_name": "Butterhead Lettuce",
            "organic": True,
            "start_indoors": False,
            "direct_sow": True,
            "suggested_indoor_weeks": 0,
            "spacing_inches": 12,
        },
    )
    assert r.status_code == 200

    seeds = client.get("/api/seeds").json()
    lettuce = next(s for s in seeds if s["id"] == "test-lettuce")
    assert lettuce["common_name"] == "Butterhead Lettuce"


def test_suggest_common_name_mocked(client, monkeypatch):
    class FakeContent:
        text = "Kale"

    class FakeMessage:
        content = [FakeContent()]

    class FakeMessages:
        def create(self, **kwargs):
            return FakeMessage()

    class FakeClient:
        messages = FakeMessages()

    import backend.app.services.seed_service as svc
    monkeypatch.setattr(svc, "suggest_common_name",
                        lambda name, category, species=None: "Kale")

    r = client.get("/api/seeds/test-lettuce/suggest-common-name")
    assert r.status_code == 200
    assert r.json()["common_name"] == "Kale"


def test_suggest_common_name_not_found(client):
    r = client.get("/api/seeds/does-not-exist/suggest-common-name")
    assert r.status_code == 404


def test_image_locked_persists(client):
    payload = {
        "name": "Locked Lettuce", "category": "Greens", "variety": "Locked Lettuce",
        "image_url": "https://example.com/lettuce.jpg", "image_locked": True,
    }
    r = client.post("/api/seeds", json=payload)
    assert r.status_code == 200
    sid = r.json()["id"]
    seed = client.get("/api/seeds").json()
    locked = next(s for s in seed if s["id"] == sid)
    assert locked["image_locked"] == 1


def test_update_seed_image_locked(client):
    r = client.post("/api/seeds", json={"name": "Unlock Test", "category": "Greens"})
    sid = r.json()["id"]
    client.put(f"/api/seeds/{sid}", json={
        "name": "Unlock Test", "category": "Greens",
        "image_url": "https://example.com/img.jpg", "image_locked": True,
    })
    seeds = client.get("/api/seeds").json()
    s = next(x for x in seeds if x["id"] == sid)
    assert s["image_locked"] == 1
    # Now unlock
    client.put(f"/api/seeds/{sid}", json={
        "name": "Unlock Test", "category": "Greens",
        "image_url": "https://example.com/img.jpg", "image_locked": False,
    })
    seeds = client.get("/api/seeds").json()
    s = next(x for x in seeds if x["id"] == sid)
    assert s["image_locked"] == 0


# ── image-search endpoint ─────────────────────────────────────────────────────

def test_image_search_endpoint(client, monkeypatch):
    """GET /api/seeds/image-search proxies to seed_service.search_image."""
    import backend.app.services.seed_service as svc
    monkeypatch.setattr(svc, "search_image",
                        lambda q, **kwargs: {"url": "https://example.com/kale.jpg"})
    r = client.get("/api/seeds/image-search?q=kale")
    assert r.status_code == 200
    assert r.json()["url"] == "https://example.com/kale.jpg"


def test_image_search_with_optional_params(client, monkeypatch):
    """image-search forwards common_name, species, category kwargs."""
    import backend.app.services.seed_service as svc
    captured = {}

    def fake_search(q, **kwargs):
        captured.update(kwargs)
        return {"url": None}

    monkeypatch.setattr(svc, "search_image", fake_search)
    client.get("/api/seeds/image-search?q=kale&common_name=Kale&species=Brassica&category=Greens")
    assert captured.get("common_name") == "Kale"
    assert captured.get("category") == "Greens"


# ── fetch-images endpoint ─────────────────────────────────────────────────────

def test_fetch_all_images_endpoint(client, monkeypatch):
    """POST /api/seeds/fetch-images delegates to seed_service.fetch_all_images."""
    import backend.app.services.seed_service as svc
    monkeypatch.setattr(svc, "fetch_all_images",
                        lambda db: {"updated": 3, "skipped": 1})
    r = client.post("/api/seeds/fetch-images")
    assert r.status_code == 200
    assert r.json()["updated"] == 3


# ── upload seed image endpoint ────────────────────────────────────────────────

def test_upload_seed_image_not_found(client):
    """POST /api/seeds/<missing>/image returns 404."""
    import io
    r = client.post(
        "/api/seeds/does-not-exist/image",
        files={"file": ("test.jpg", io.BytesIO(b"data"), "image/jpeg")},
    )
    assert r.status_code == 404


def test_upload_seed_image_success(client, monkeypatch):
    """POST /api/seeds/<id>/image calls upload_seed_image and returns result."""
    import io
    import backend.app.services.seed_service as svc
    monkeypatch.setattr(
        svc, "upload_seed_image",
        lambda db, seed_id, filename, content: {"image_url": "/photos/test.jpg", "image_locked": True},
    )
    r = client.post(
        "/api/seeds/test-lettuce/image",
        files={"file": ("photo.jpg", io.BytesIO(b"img-bytes"), "image/jpeg")},
    )
    assert r.status_code == 200
    assert r.json()["image_url"] == "/photos/test.jpg"


# ── upload_seed_image service-level tests ─────────────────────────────────────

def test_upload_seed_image_too_large_rejected(client, tmp_path, monkeypatch):
    """Uploads exceeding MAX_PHOTO_BYTES return 413."""
    import io
    import backend.app.services.seed_service as svc
    monkeypatch.setattr(svc, "MAX_PHOTO_BYTES", 100)
    monkeypatch.setattr(svc, "PHOTOS_DIR", str(tmp_path))
    r = client.post(
        "/api/seeds/test-lettuce/image",
        files={"file": ("big.jpg", io.BytesIO(b"x" * 101), "image/jpeg")},
    )
    assert r.status_code == 413


def test_upload_seed_image_unknown_extension_normalised_to_jpg(client, tmp_path, monkeypatch):
    """Unknown file extension is coerced to .jpg."""
    import io
    import backend.app.services.seed_service as svc
    monkeypatch.setattr(svc, "PHOTOS_DIR", str(tmp_path))
    r = client.post(
        "/api/seeds/test-lettuce/image",
        files={"file": ("seed.exe", io.BytesIO(b"data"), "application/octet-stream")},
    )
    assert r.status_code == 200
    saved = list(tmp_path.iterdir())
    assert len(saved) == 1
    assert saved[0].suffix == ".jpg"


def test_upload_seed_image_atomicity_no_db_update_on_file_write_failure(client, monkeypatch):
    """If the temp file write fails, the seeds.image_url must not be updated."""
    import io
    import backend.app.services.seed_service as svc
    monkeypatch.setattr(svc, "PHOTOS_DIR", "/nonexistent_dir_xyz_abc")
    r = client.post(
        "/api/seeds/test-lettuce/image",
        files={"file": ("shot.jpg", io.BytesIO(b"data"), "image/jpeg")},
    )
    assert r.status_code == 500
    seeds = client.get("/api/seeds").json()
    lettuce = next(s for s in seeds if s["id"] == "test-lettuce")
    assert lettuce["image_url"] is None  # DB must not have been updated


def test_upload_seed_image_rename_failure_no_db_update(client, tmp_path, monkeypatch):
    """If os.rename fails, the DB is never updated (rename-first ordering)."""
    import io
    import os
    import backend.app.services.seed_service as svc
    monkeypatch.setattr(svc, "PHOTOS_DIR", str(tmp_path))

    def fail_rename(src, dst):
        raise OSError("simulated rename failure")

    monkeypatch.setattr(os, "rename", fail_rename)
    r = client.post(
        "/api/seeds/test-lettuce/image",
        files={"file": ("photo.jpg", io.BytesIO(b"data"), "image/jpeg")},
    )
    assert r.status_code == 500
    seeds = client.get("/api/seeds").json()
    lettuce = next(s for s in seeds if s["id"] == "test-lettuce")
    # With rename-first ordering the DB UPDATE never ran, so image_url stays None
    assert lettuce["image_url"] is None
