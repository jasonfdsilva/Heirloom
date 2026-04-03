def test_get_label_positions_empty(client):
    r = client.get("/api/label-positions")
    assert r.status_code == 200
    assert r.json() == []


def test_save_and_retrieve_label_positions(client):
    payload = [
        {"entity_type": "structure", "entity_id": "test-bed-1",
         "label_x": 120.5, "label_y": 80.0, "orientation": "horizontal", "hidden": False, "label_text": None},
    ]
    r = client.put("/api/label-positions", json=payload)
    assert r.status_code == 200

    positions = client.get("/api/label-positions").json()
    assert len(positions) == 1
    assert positions[0]["entity_type"] == "structure"
    assert positions[0]["entity_id"] == "test-bed-1"
    assert positions[0]["label_x"] == 120.5


def test_save_multiple_positions(client):
    payload = [
        {"entity_type": "structure", "entity_id": "test-bed-1",
         "label_x": 100.0, "label_y": 50.0, "orientation": "horizontal", "hidden": False, "label_text": None},
        {"entity_type": "structure", "entity_id": "test-box-1",
         "label_x": 300.0, "label_y": 150.0, "orientation": "vertical", "hidden": False, "label_text": None},
    ]
    client.put("/api/label-positions", json=payload)
    positions = client.get("/api/label-positions").json()
    assert len(positions) == 2
    ids = {p["entity_id"] for p in positions}
    assert "test-bed-1" in ids
    assert "test-box-1" in ids


def test_save_label_positions_upserts(client):
    client.put("/api/label-positions", json=[
        {"entity_type": "structure", "entity_id": "test-bed-1",
         "label_x": 100.0, "label_y": 50.0, "orientation": "horizontal", "hidden": False, "label_text": None},
    ])
    client.put("/api/label-positions", json=[
        {"entity_type": "structure", "entity_id": "test-bed-1",
         "label_x": 200.0, "label_y": 75.0, "orientation": "vertical", "hidden": True, "label_text": "Bed 1"},
    ])
    positions = client.get("/api/label-positions").json()
    assert len(positions) == 1
    p = positions[0]
    assert p["label_x"] == 200.0
    assert p["label_y"] == 75.0


def test_save_empty_list(client):
    r = client.put("/api/label-positions", json=[])
    assert r.status_code == 200
    assert client.get("/api/label-positions").json() == []
