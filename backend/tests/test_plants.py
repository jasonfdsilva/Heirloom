import pytest


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_planting(client, seed_id="test-lettuce"):
    r = client.post("/api/plantings", json={
        "seed_id": seed_id,
        "structure_id": "test-bed-1",
        "year": 2026,
        "qty_started": 6,
        "status": "started",
    })
    assert r.status_code == 200
    return r.json()["id"]


def _paint_cell(client, planting_id, row=0, col=0, structure_id="test-bed-1"):
    r = client.post(f"/api/structures/{structure_id}/grid", json={
        "planting_id": planting_id,
        "cells": [{"row": row, "col": col}],
    })
    assert r.status_code == 200
    cells = client.get(f"/api/structures/{structure_id}/grid").json()
    return next(c for c in cells if c["row"] == row and c["col"] == col)["plant_guid"]


# ── get plant ─────────────────────────────────────────────────────────────────

def test_get_plant_returns_full_detail(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.get(f"/api/plants/{guid}")
    assert r.status_code == 200
    data = r.json()
    assert data["plant_guid"] == guid
    assert data["seed_name"] == "Buttercrunch Lettuce"
    assert data["plant_status"] == "healthy"
    assert data["structure_name"] == "Raised Bed 1"
    assert data["planting_id"] == pid


def test_get_plant_not_found(client):
    r = client.get("/api/plants/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


# ── update plant ──────────────────────────────────────────────────────────────

def test_update_plant_status(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.patch(f"/api/plants/{guid}", json={"plant_status": "stressed"})
    assert r.status_code == 200
    plant = client.get(f"/api/plants/{guid}").json()
    assert plant["plant_status"] == "stressed"


def test_update_plant_notes(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.patch(f"/api/plants/{guid}", json={"plant_notes": "Looking leggy"})
    assert r.status_code == 200
    plant = client.get(f"/api/plants/{guid}").json()
    assert plant["plant_notes"] == "Looking leggy"


def test_update_plant_label_visible(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.patch(f"/api/plants/{guid}", json={"label_visible": False})
    assert r.status_code == 200
    plant = client.get(f"/api/plants/{guid}").json()
    assert plant["label_visible"] == 0


def test_update_plant_multiple_fields(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.patch(f"/api/plants/{guid}", json={
        "plant_status": "harvested",
        "plant_notes": "First harvest done",
    })
    assert r.status_code == 200
    plant = client.get(f"/api/plants/{guid}").json()
    assert plant["plant_status"] == "harvested"
    assert plant["plant_notes"] == "First harvest done"


def test_update_plant_empty_patch_is_noop(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.patch(f"/api/plants/{guid}", json={})
    assert r.status_code == 200
    plant = client.get(f"/api/plants/{guid}").json()
    assert plant["plant_status"] == "healthy"


# ── harvests ──────────────────────────────────────────────────────────────────

def test_list_harvests_empty(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.get(f"/api/plants/{guid}/harvests")
    assert r.status_code == 200
    assert r.json() == []


def test_create_harvest(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    r = client.post(f"/api/plants/{guid}/harvests", json={
        "harvest_date": "2026-07-15",
        "weight_oz": 4.5,
        "count": 3,
        "notes": "Good yield",
    })
    assert r.status_code == 200
    data = r.json()
    assert "id" in data


def test_create_harvest_appears_in_list(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    client.post(f"/api/plants/{guid}/harvests", json={
        "harvest_date": "2026-07-15",
        "weight_oz": 2.0,
        "count": None,
        "notes": None,
    })
    harvests = client.get(f"/api/plants/{guid}/harvests").json()
    assert len(harvests) == 1
    assert harvests[0]["harvest_date"] == "2026-07-15"
    assert harvests[0]["weight_oz"] == 2.0


def test_multiple_harvests_ordered_descending(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    client.post(f"/api/plants/{guid}/harvests", json={
        "harvest_date": "2026-07-01", "weight_oz": 1.0, "count": None, "notes": None,
    })
    client.post(f"/api/plants/{guid}/harvests", json={
        "harvest_date": "2026-07-15", "weight_oz": 2.0, "count": None, "notes": None,
    })
    harvests = client.get(f"/api/plants/{guid}/harvests").json()
    assert len(harvests) == 2
    assert harvests[0]["harvest_date"] == "2026-07-15"
    assert harvests[1]["harvest_date"] == "2026-07-01"


def test_delete_harvest(client):
    pid = _make_planting(client)
    guid = _paint_cell(client, pid)
    create_r = client.post(f"/api/plants/{guid}/harvests", json={
        "harvest_date": "2026-07-15", "weight_oz": 1.5, "count": 2, "notes": None,
    })
    harvest_id = create_r.json()["id"]
    r = client.delete(f"/api/plants/{guid}/harvests/{harvest_id}")
    assert r.status_code == 200
    assert client.get(f"/api/plants/{guid}/harvests").json() == []
