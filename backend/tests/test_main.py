"""Tests for main.py routes not covered by other test modules."""

import backend.app.main as main_mod


def test_serve_photo_not_found(client):
    """GET /photos/<missing> returns 404."""
    r = client.get("/photos/nonexistent_xyzabc.jpg")
    assert r.status_code == 404


def test_serve_photo_success(client, tmp_path, monkeypatch):
    """GET /photos/<existing> returns 200 with the file contents."""
    # Create a real file in a temp photos dir
    photo_dir = tmp_path / "photos"
    photo_dir.mkdir()
    (photo_dir / "real.jpg").write_bytes(b"fake-jpeg-data")
    monkeypatch.setattr(main_mod, "PHOTOS_DIR", str(photo_dir))
    r = client.get("/photos/real.jpg")
    assert r.status_code == 200
