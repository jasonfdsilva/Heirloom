"""Shared fixture data for tests — mirrors real seed_data structure."""

SEEDS = [
    {
        "id": "test-lettuce",
        "name": "Buttercrunch Lettuce",
        "variety": "Buttercrunch",
        "category": "Greens",
        "species": "Lactuca sativa",
        "days_to_maturity": "55",
        "germ_rate": 0.90,
        "lot": "L001",
        "sku": None,
        "organic": 1,
        "supplier": "Johnny's",
        "min_seeds": 50,
        "start_indoors": 1,
        "direct_sow": 1,
        "suggested_indoor_weeks": 4,
        "spacing_inches": 8,
        "notes": None,
    },
    {
        "id": "test-tomato",
        "name": "Sun Gold",
        "variety": "Sun Gold F1",
        "category": "Tomatoes",
        "species": "Solanum lycopersicum",
        "days_to_maturity": "57",
        "germ_rate": 0.95,
        "lot": "T001",
        "sku": None,
        "organic": 0,
        "supplier": "Johnny's",
        "min_seeds": 25,
        "start_indoors": 1,
        "direct_sow": 0,
        "suggested_indoor_weeks": 8,
        "spacing_inches": 24,
        "notes": None,
    },
    {
        "id": "test-pepper",
        "name": "Shishito",
        "variety": None,
        "category": "Peppers",
        "species": "Capsicum annuum",
        "days_to_maturity": "70",
        "germ_rate": 0.85,
        "lot": "P001",
        "sku": None,
        "organic": 0,
        "supplier": "Burpee",
        "min_seeds": 30,
        "start_indoors": 1,
        "direct_sow": 0,
        "suggested_indoor_weeks": 10,
        "spacing_inches": 18,
        "notes": None,
    },
]

STRUCTURES = [
    {
        "id": "test-bed-1",
        "name": "Raised Bed 1",
        "type": "bed",
        "width": 4.0,
        "length": 8.0,
        "map_x": 100.0,
        "map_y": 100.0,
    },
    {
        "id": "test-box-1",
        "name": "Container 1",
        "type": "box",
        "width": 2.0,
        "length": 2.0,
        "map_x": 300.0,
        "map_y": 100.0,
    },
]


def insert_mock_data(conn) -> dict:
    """Insert seeds and structures, return their ids for use in tests."""
    for s in SEEDS:
        conn.execute(
            """INSERT INTO seeds (id, name, variety, category, species, days_to_maturity,
               germ_rate, lot, sku, organic, supplier, min_seeds, start_indoors, direct_sow,
               suggested_indoor_weeks, spacing_inches, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (s["id"], s["name"], s["variety"], s["category"], s["species"],
             s["days_to_maturity"], s["germ_rate"], s["lot"], s["sku"],
             s["organic"], s["supplier"], s["min_seeds"],
             s["start_indoors"], s["direct_sow"],
             s["suggested_indoor_weeks"], s["spacing_inches"], s["notes"]),
        )
    for st in STRUCTURES:
        conn.execute(
            "INSERT INTO structures (id, name, type, width, length, map_x, map_y) VALUES (?,?,?,?,?,?,?)",
            (st["id"], st["name"], st["type"], st["width"], st["length"], st["map_x"], st["map_y"]),
        )
    conn.commit()
    return {"seed_ids": [s["id"] for s in SEEDS], "structure_ids": [s["id"] for s in STRUCTURES]}
