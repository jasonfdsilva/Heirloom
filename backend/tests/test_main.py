"""Tests for main.py routes not covered by other test modules."""

import backend.app.main as main_mod


def test_serve_photo_not_found(client):
    """GET /photos/<missing> returns 404."""
    r = client.get("/photos/nonexistent_xyzabc.jpg")
    assert r.status_code == 404


def test_serve_photo_success(client, tmp_path, monkeypatch):
    """GET /photos/<existing> returns 200 with the file contents."""
    photo_dir = tmp_path / "photos"
    photo_dir.mkdir()
    (photo_dir / "real.jpg").write_bytes(b"fake-jpeg-data")
    monkeypatch.setattr(main_mod, "PHOTOS_DIR", str(photo_dir))
    r = client.get("/photos/real.jpg")
    assert r.status_code == 200


def test_serve_photo_path_traversal_rejected(client, tmp_path, monkeypatch):
    """GET /photos/../../etc/passwd must return 404, not the file contents."""
    photo_dir = tmp_path / "photos"
    photo_dir.mkdir()
    monkeypatch.setattr(main_mod, "PHOTOS_DIR", str(photo_dir))
    # Attempt to escape the photos directory
    r = client.get("/photos/../../etc/passwd")
    assert r.status_code == 404


def test_serve_photo_nested_traversal_rejected(client, tmp_path, monkeypatch):
    """Single-level traversal attempts are rejected."""
    photo_dir = tmp_path / "photos"
    photo_dir.mkdir()
    secret = tmp_path / "secret.txt"
    secret.write_text("sensitive")
    monkeypatch.setattr(main_mod, "PHOTOS_DIR", str(photo_dir))
    r = client.get("/photos/../secret.txt")
    assert r.status_code == 404


def test_serve_photo_separator_in_filename_rejected(client, tmp_path, monkeypatch):
    """Filenames containing a slash are rejected before filesystem access."""
    photo_dir = tmp_path / "photos"
    photo_dir.mkdir()
    monkeypatch.setattr(main_mod, "PHOTOS_DIR", str(photo_dir))
    r = client.get("/photos/subdir/secret.jpg")
    assert r.status_code == 404
