def test_list_structures(client):
    r = client.get("/api/structures")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    names = {s["name"] for s in data}
    assert "Raised Bed 1" in names
    assert "Container 1" in names


def test_list_structures_returns_all_fields(client):
    r = client.get("/api/structures")
    s = r.json()[0]
    for field in ("id", "name", "type", "width", "length"):
        assert field in s
