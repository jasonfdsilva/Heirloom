import pytest


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_planting(client, seed_id="test-lettuce", structure_id="test-bed-1"):
    r = client.post("/api/plantings", json={
        "seed_id": seed_id,
        "structure_id": structure_id,
        "year": 2026,
        "qty_started": 4,
        "status": "started",
    })
    assert r.status_code == 200
    return r.json()["id"]


# ── get grid ─────────────────────────────────────────────────────────────────

def test_get_grid_empty(client):
    r = client.get("/api/structures/test-bed-1/grid")
    assert r.status_code == 200
    assert r.json() == []


def test_get_grid_after_painting(client):
    pid = _make_planting(client)
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}],
    })
    r = client.get("/api/structures/test-bed-1/grid")
    assert r.status_code == 200
    cells = r.json()
    assert len(cells) == 1
    assert cells[0]["row"] == 0
    assert cells[0]["col"] == 0
    assert cells[0]["planting_id"] == pid
    assert cells[0]["seed_name"] == "Buttercrunch Lettuce"
    assert cells[0]["plant_guid"] is not None
    assert cells[0]["short_id"] is not None


# ── paint cells ───────────────────────────────────────────────────────────────

def test_paint_multiple_cells(client):
    pid = _make_planting(client)
    r = client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}, {"row": 0, "col": 1}, {"row": 1, "col": 0}],
    })
    assert r.status_code == 200
    assert r.json()["cell_count"] == 3

    cells = client.get("/api/structures/test-bed-1/grid").json()
    assert len(cells) == 3


def test_paint_cell_generates_unique_guids(client):
    pid = _make_planting(client)
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}, {"row": 0, "col": 1}],
    })
    cells = client.get("/api/structures/test-bed-1/grid").json()
    guids = [c["plant_guid"] for c in cells]
    assert len(set(guids)) == 2


def test_paint_same_cell_twice_is_idempotent(client):
    pid = _make_planting(client)
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}],
    })
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}],
    })
    cells = client.get("/api/structures/test-bed-1/grid").json()
    assert len(cells) == 1


def test_paint_cell_overwrites_different_planting(client):
    pid1 = _make_planting(client, seed_id="test-lettuce")
    pid2 = _make_planting(client, seed_id="test-tomato")
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid1,
        "cells": [{"row": 0, "col": 0}],
    })
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid2,
        "cells": [{"row": 0, "col": 0}],
    })
    cells = client.get("/api/structures/test-bed-1/grid").json()
    assert len(cells) == 1
    assert cells[0]["planting_id"] == pid2


def test_short_ids_are_sequential(client):
    pid = _make_planting(client)
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}, {"row": 0, "col": 1}, {"row": 0, "col": 2}],
    })
    cells = sorted(client.get("/api/structures/test-bed-1/grid").json(), key=lambda c: c["col"])
    short_ids = [c["short_id"] for c in cells]
    # All should share the same prefix, numbered 01, 02, 03
    prefixes = {sid.rsplit("-", 1)[0] for sid in short_ids}
    assert len(prefixes) == 1
    numbers = [sid.rsplit("-", 1)[1] for sid in short_ids]
    assert sorted(numbers) == ["01", "02", "03"]


# ── delete cells ──────────────────────────────────────────────────────────────

def test_clear_all_cells_for_planting(client):
    pid = _make_planting(client)
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}, {"row": 0, "col": 1}],
    })
    r = client.delete(f"/api/structures/test-bed-1/grid/cells?planting_id={pid}")
    assert r.status_code == 200
    assert client.get("/api/structures/test-bed-1/grid").json() == []


def test_clear_specific_cell(client):
    pid = _make_planting(client)
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}, {"row": 0, "col": 1}],
    })
    r = client.delete(f"/api/structures/test-bed-1/grid/cells?planting_id={pid}&rows=0&cols=0")
    assert r.status_code == 200
    cells = client.get("/api/structures/test-bed-1/grid").json()
    assert len(cells) == 1
    assert cells[0]["col"] == 1


def test_clear_only_affects_target_planting(client):
    pid1 = _make_planting(client, seed_id="test-lettuce")
    pid2 = _make_planting(client, seed_id="test-tomato")
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid1, "cells": [{"row": 0, "col": 0}],
    })
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid2, "cells": [{"row": 1, "col": 0}],
    })
    client.delete(f"/api/structures/test-bed-1/grid/cells?planting_id={pid1}")
    cells = client.get("/api/structures/test-bed-1/grid").json()
    assert len(cells) == 1
    assert cells[0]["planting_id"] == pid2


def test_paint_out_of_bounds_row_rejected(client):
    """Cells with row beyond the grid must be rejected with 400.

    test-bed-1 is 4×8 ft with 6-inch cells → 8 cols × 16 rows (max row=15).
    Row 16 is the first out-of-bounds value.
    """
    pid = _make_planting(client)
    r = client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 16, "col": 0}],  # 8 ft × 12 in/ft ÷ 6 in/cell = 16 rows (0-15)
    })
    assert r.status_code == 400
    assert "out of bounds" in r.json()["detail"].lower()


def test_paint_out_of_bounds_col_rejected(client):
    """Cells with col beyond the grid must be rejected with 400.

    test-bed-1 is 4×8 ft with 6-inch cells → 8 cols × 16 rows (max col=7).
    Col 8 is the first out-of-bounds value.
    """
    pid = _make_planting(client)
    r = client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 8}],  # 4 ft × 12 in/ft ÷ 6 in/cell = 8 cols (0-7)
    })
    assert r.status_code == 400
    assert "out of bounds" in r.json()["detail"].lower()


def test_paint_negative_row_rejected(client):
    """Negative row values must be rejected with 400."""
    pid = _make_planting(client)
    r = client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": -1, "col": 0}],
    })
    assert r.status_code == 400
    assert "out of bounds" in r.json()["detail"].lower()


def test_paint_nonexistent_structure_returns_404(client):
    """Painting cells on a structure that doesn't exist returns 404."""
    pid = _make_planting(client)
    r = client.post("/api/structures/does-not-exist/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}],
    })
    assert r.status_code == 404


def test_update_grid_exception_path_is_swallowed(test_db):
    """update_grid logs but swallows INSERT failures (e.g. FK violation) to keep the painter UX smooth.
    Known design debt: caller receives success even when a cell was not written.
    If the silent-swallow is ever removed, update this test accordingly."""
    from backend.app.services.grid_service import update_grid
    from backend.app.schemas.grid import GridUpdate

    # planting_id 99999 doesn't exist → FK constraint failure on INSERT → except Exception: pass
    result = update_grid(test_db, "test-bed-1", GridUpdate(planting_id=99999, cells=[{"row": 0, "col": 0}]))
    # The exception is swallowed; function returns success dict
    assert result["message"] == "Grid updated"
    assert result["cell_count"] == 1


def test_clear_cells_updates_planting_quantity(client):
    pid = _make_planting(client)
    client.post("/api/structures/test-bed-1/grid", json={
        "planting_id": pid,
        "cells": [{"row": 0, "col": 0}, {"row": 0, "col": 1}],
    })
    client.delete(f"/api/structures/test-bed-1/grid/cells?planting_id={pid}&rows=0&cols=0")
    plantings = client.get("/api/plantings?year=2026").json()
    p = next(p for p in plantings if p["id"] == pid)
    assert p["quantity"] == 1
