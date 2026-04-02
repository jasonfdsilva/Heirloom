def _setup_planting_with_events(client):
    pid_r = client.post(
        "/api/plantings",
        json={
            "seed_id": "test-tomato", "year": 2026, "quantity": 2,
            "status": "started", "indoor_start_date": "2026-02-15",
            "hardening_date": None, "transplant_date": None,
            "direct_sow_date": None, "first_harvest_date": None,
            "notes": None, "structure_id": None,
            "qty_started": None, "qty_planted": None,
        },
    )
    pid = pid_r.json()["id"]

    client.post(f"/api/plantings/{pid}/events", json={
        "event_date": "2026-03-01", "event_type": "germination",
        "details": "Seeds sprouted", "severity": None,
        "product_used": None, "quantity": None,
    })
    client.post(f"/api/plantings/{pid}/events", json={
        "event_date": "2026-03-10", "event_type": "observation",
        "details": "Looking healthy", "severity": None,
        "product_used": None, "quantity": None,
    })
    return pid


def test_activity_empty(client):
    r = client.get("/api/dashboard/activity")
    assert r.status_code == 200
    assert r.json() == []


def test_activity_returns_events(client):
    _setup_planting_with_events(client)

    r = client.get("/api/dashboard/activity")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2


def test_activity_has_seed_name(client):
    _setup_planting_with_events(client)

    r = client.get("/api/dashboard/activity")
    event = r.json()[0]
    assert event["seed_name"] == "Sun Gold"
    assert event["category"] == "Tomatoes"
    assert "event_type" in event
    assert "event_date" in event


def test_activity_ordered_most_recent_first(client):
    _setup_planting_with_events(client)

    r = client.get("/api/dashboard/activity")
    dates = [e["event_date"] for e in r.json()]
    assert dates == sorted(dates, reverse=True)


def test_activity_limited_to_20(client):
    pid_r = client.post(
        "/api/plantings",
        json={
            "seed_id": "test-lettuce", "year": 2026, "quantity": 1,
            "status": "planned", "indoor_start_date": None,
            "hardening_date": None, "transplant_date": None,
            "direct_sow_date": None, "first_harvest_date": None,
            "notes": None, "structure_id": None,
            "qty_started": None, "qty_planted": None,
        },
    )
    pid = pid_r.json()["id"]

    for i in range(25):
        client.post(f"/api/plantings/{pid}/events", json={
            "event_date": f"2026-03-{i+1:02d}" if i < 31 else "2026-03-31",
            "event_type": "observation",
            "details": f"Note {i}",
            "severity": None, "product_used": None, "quantity": None,
        })

    r = client.get("/api/dashboard/activity")
    assert len(r.json()) == 20
