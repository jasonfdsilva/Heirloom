"""Seed script: all 2026 varieties, seed lots, and planting events.
Run with: uv run python seed_2026.py
"""
import asyncio
from datetime import date

from sqlalchemy import select, text
from app.db.session import AsyncSessionLocal
import app.db.base  # noqa: F401 — registers all models

from app.models.variety import PlantVariety, PlantType
from app.models.seedlot import SeedLot
from app.models.planting import PlantingEvent, SowType, PlantingStatus
from app.models.season import GardenSeason
from app.models.space import GrowingSpace
from app.core.security import hash_password


VARIETIES = [
    # Tomatoes
    dict(common_name="Granadero F1 OG", latin_name="Solanum lycopersicum", plant_type=PlantType.annual, days_to_maturity="75", notes="Paste/plum/roma — indeterminate",
         lot=dict(lot_number="110477", sku="2584G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=15, germination_rate_pct=92, germination_test_date="01/26", certifications="Certified Organic by MOFGA")),
    dict(common_name="Nova F1", latin_name="Solanum lycopersicum", plant_type=PlantType.annual, days_to_maturity="60", notes="Hybrid grape tomato",
         lot=dict(lot_number="108748", sku="3889.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=15, germination_rate_pct=99, germination_test_date="01/26")),
    dict(common_name="Purple Bumble Bee OG", latin_name="Solanum lycopersicum", plant_type=PlantType.annual, days_to_maturity="70", notes="Artisan cherry tomato",
         lot=dict(lot_number="110437", sku="3521G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=25, germination_rate_pct=92, germination_test_date="10/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="Carbon OG", latin_name="Solanum lycopersicum", plant_type=PlantType.annual, days_to_maturity="76", notes="Heirloom slicer — indeterminate",
         lot=dict(lot_number="110433", sku="3763G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=25, germination_rate_pct=87, germination_test_date="10/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="New Girl F1 OG", latin_name="Solanum lycopersicum", plant_type=PlantType.annual, days_to_maturity="62", notes="Hybrid indeterminate slicer",
         lot=dict(lot_number="104964", sku="2412G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=40, germination_rate_pct=93, germination_test_date="11/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="Indigo Cherry Drops OG", latin_name="Solanum lycopersicum", plant_type=PlantType.annual, days_to_maturity="71", notes="Indeterminate cherry — anthocyanin-rich",
         lot=dict(lot_number="110435", sku="3233G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=40, germination_rate_pct=95, germination_test_date="10/25", certifications="Certified Organic by MOFGA")),
    # Peppers
    dict(common_name="Shishito OG", latin_name="Capsicum annuum", plant_type=PlantType.annual, days_to_maturity="60 green / 80 ripe", notes="Sweet shishito pepper",
         lot=dict(lot_number="78844", sku="4227G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=25, germination_rate_pct=97, germination_test_date="01/26")),
    dict(common_name="Ace F1", latin_name="Capsicum annuum", plant_type=PlantType.annual, days_to_maturity="50 green / 70 red", notes="Hybrid bell pepper",
         lot=dict(lot_number="110020", sku="574.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=25, germination_rate_pct=97, germination_test_date="02/26")),
    dict(common_name="Pantera F1", latin_name="Capsicum annuum", plant_type=PlantType.annual, days_to_maturity="70 green / 90 ripe", notes="Hybrid hot pepper",
         lot=dict(lot_number="109622", sku="4912.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=25, germination_rate_pct=99, germination_test_date="12/25")),
    # Brassicas
    dict(common_name="Sidekick", latin_name="Brassica oleracea", plant_type=PlantType.annual, days_to_maturity="41", notes="Mini broccoli — compact heads",
         lot=dict(lot_number="111269", sku="5234.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=100, germination_rate_pct=97, germination_test_date="09/25")),
    dict(common_name="Winterbor F1", latin_name="Brassica oleracea", plant_type=PlantType.annual, days_to_maturity="60", notes="Hybrid curly kale — very hardy",
         lot=dict(lot_number="105689", sku="365.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=100, germination_rate_pct=97, germination_test_date="10/25")),
    # Greens & Salads
    dict(common_name="Allstar Gourmet Lettuce Mix", latin_name="Lactuca sativa", plant_type=PlantType.annual, days_to_maturity="28", notes="Mix of loose-leaf lettuces for cut-and-come-again",
         lot=dict(lot_number="110746", sku="2301.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=1000, germination_rate_pct=94, germination_test_date="10/25")),
    dict(common_name="Sunland Romaine OG", latin_name="Lactuca sativa", plant_type=PlantType.annual, days_to_maturity="56", notes="Romaine — heat tolerant OG pellet",
         lot=dict(lot_number="104700", sku="4788JP.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=250, germination_rate_pct=97, germination_test_date="02/26", certifications="Certified Organic by MOFGA")),
    dict(common_name="Bergams Green OG", latin_name="Lactuca sativa", plant_type=PlantType.annual, days_to_maturity="51", notes="Leaf lettuce — butterhead type",
         lot=dict(lot_number="77960", sku="3663G.53", source_vendor="Johnny's Selected Seeds", quantity_seeds=1000000, germination_rate_pct=99, germination_test_date="12/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="Red Tabby F1", latin_name="Spinacia oleracea", plant_type=PlantType.annual, days_to_maturity="31", notes="Hybrid smooth-leaf spinach",
         lot=dict(lot_number="109771", sku="4567.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=1000, germination_rate_pct=94, germination_test_date="11/25")),
    dict(common_name="Nemesis F1", latin_name="Diplotaxis tenuifolia", plant_type=PlantType.annual, days_to_maturity="35", notes="Hybrid arugula — slow to bolt",
         lot=dict(lot_number="101952", sku="5543.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=500, germination_rate_pct=89, germination_test_date="10/25")),
    # Roots & Alliums
    dict(common_name="SC* Boro F1 OG", latin_name="Beta vulgaris", plant_type=PlantType.annual, days_to_maturity="50", notes="Round red beet — film coated",
         lot=dict(lot_number="111592", sku="3300G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=350, germination_rate_pct=95, germination_test_date="01/26", certifications="Certified Organic by MOFGA")),
    dict(common_name="Shin Kuroda OG", latin_name="Daucus carota var. sativus", plant_type=PlantType.annual, days_to_maturity="58", notes="Early carrot — OG pellet",
         lot=dict(lot_number="107583", sku="4972JP.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=250, germination_rate_pct=89, germination_test_date="11/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="Bolero F1 OG", latin_name="Daucus carota var. sativus", plant_type=PlantType.annual, days_to_maturity="75", notes="Storage carrot — OG pellet",
         lot=dict(lot_number="109047", sku="216JP.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=250, germination_rate_pct=90, germination_test_date="01/26", certifications="Certified Organic by MOFGA")),
    dict(common_name="Deep Purple OG", latin_name="Allium cepa", plant_type=PlantType.annual, days_to_maturity="60", notes="Bunching onion / scallion — film coated",
         lot=dict(lot_number="102984", sku="491G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=500, germination_rate_pct=79, germination_test_date="10/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="Rover F1", latin_name="Raphanus sativus", plant_type=PlantType.annual, days_to_maturity="21", notes="Hybrid round radish — fast crop",
         lot=dict(lot_number="111590", sku="664.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=250, germination_rate_pct=90, germination_test_date="10/25")),
    # Cucurbits
    dict(common_name="Picolino F1 OG", latin_name="Cucumis sativus", plant_type=PlantType.annual, days_to_maturity="50", notes="Mini greenhouse cucumber",
         lot=dict(lot_number="110464", sku="3542G.10", source_vendor="Johnny's Selected Seeds", quantity_seeds=10, germination_rate_pct=98, germination_test_date="11/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="Autumn Wings Blend", latin_name="Cucurbita pepo", plant_type=PlantType.annual, days_to_maturity="95", notes="Small fruited decorative gourds — blend",
         lot=dict(lot_number="104546", sku="2633.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=30, germination_rate_pct=93, germination_test_date="09/25")),
    # Legumes
    dict(common_name="Chiba Green OG", latin_name="Glycine max", plant_type=PlantType.annual, days_to_maturity="82", notes="Edamame / soy bean — certified organic",
         lot=dict(lot_number="107866", sku="3581G.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=100, germination_rate_pct=91, germination_test_date="11/25", certifications="Certified Organic by MOFGA")),
    dict(common_name="Seychelles", latin_name="Phaseolus vulgaris", plant_type=PlantType.annual, days_to_maturity="55", notes="Pole bean — AAS winner",
         lot=dict(lot_number="111306", sku="4545.11", source_vendor="Johnny's Selected Seeds", quantity_seeds=50, germination_rate_pct=94, germination_test_date="10/25")),
    # Herbs (from layout, no packets)
    dict(common_name="Prospera Basil", latin_name="Ocimum basilicum", plant_type=PlantType.annual, days_to_maturity="28", notes="Downy mildew resistant basil", lot=None),
    dict(common_name="Cruiser Cilantro", latin_name="Coriandrum sativum", plant_type=PlantType.annual, days_to_maturity="50", notes="Slow bolt cilantro", lot=None),
    dict(common_name="Sugar Snap Peas", latin_name="Pisum sativum", plant_type=PlantType.annual, days_to_maturity="62", notes="Climbing sugar snap", lot=None),
    dict(common_name="Black Beauty Zucchini", latin_name="Cucurbita pepo", plant_type=PlantType.annual, days_to_maturity="52", notes="Classic dark green zucchini", lot=None),
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = await db.execute(select(PlantVariety))
        if existing.scalars().first():
            print("Varieties already exist, skipping variety seed.")
            variety_ids = {v.common_name: v.id for v in (await db.execute(select(PlantVariety))).scalars().all()}
        else:
            print("Seeding varieties and seed lots...")
            variety_ids = {}
            for v_data in VARIETIES:
                lot_data = v_data.pop("lot", None)
                variety = PlantVariety(**v_data)
                db.add(variety)
                await db.flush()
                variety_ids[variety.common_name] = variety.id
                if lot_data:
                    lot = SeedLot(variety_id=variety.id, **lot_data)
                    db.add(lot)
            await db.commit()
            print(f"  Created {len(variety_ids)} varieties")

        # Get spaces
        spaces_result = await db.execute(select(GrowingSpace).order_by(GrowingSpace.display_order))
        spaces = {s.name: s.id for s in spaces_result.scalars().all()}
        print(f"  Found spaces: {list(spaces.keys())[:5]}...")

        # Get season
        season_result = await db.execute(select(GardenSeason).where(GardenSeason.year == 2026))
        season = season_result.scalar_one_or_none()
        if not season:
            print("No 2026 season found. Exiting.")
            return
        season_id = season.id

        # Update delay to 2 weeks (weather has been cold)
        season.delay_weeks = 2
        season.delay_reason = "Cold weather — seeds not started yet"
        await db.commit()

        # Check if plantings already seeded
        existing_plantings = await db.execute(select(PlantingEvent))
        if existing_plantings.scalars().first():
            print("Plantings already exist, skipping.")
            return

        print("Seeding planting events...")

        def pe(variety_name, space_name, sow_type, planned_sow, planned_transplant=None, planned_harvest=None, qty=None, loc=None):
            vid = variety_ids.get(variety_name)
            sid = spaces.get(space_name)
            if not vid:
                print(f"  WARNING: variety not found: {variety_name}")
                return None
            if not sid:
                print(f"  WARNING: space not found: {space_name}")
                return None
            return PlantingEvent(
                season_id=season_id,
                variety_id=vid,
                space_id=sid,
                sow_type=SowType(sow_type),
                status=PlantingStatus.planned,
                planned_sow_date=planned_sow,
                planned_transplant_date=planned_transplant,
                planned_harvest_start=planned_harvest,
                quantity_planted=qty,
                location_note=loc,
            )

        plantings = [
            # Raised Bed 1: Upper Long Bed — greens, roots, alliums
            pe("Winterbor F1", "Upper Long Bed", "direct", date(2026, 4, 2), planned_harvest=date(2026, 6, 1), qty=2, loc="West end, 2 rows"),
            pe("Bergams Green OG", "Upper Long Bed", "direct", date(2026, 4, 9), planned_harvest=date(2026, 5, 30), loc="Center, succession rows"),
            pe("Shin Kuroda OG", "Upper Long Bed", "direct", date(2026, 4, 2), planned_harvest=date(2026, 5, 30), loc="East section, 3 rows"),
            pe("Nemesis F1", "Upper Long Bed", "direct", date(2026, 4, 2), planned_harvest=date(2026, 5, 7), loc="East end"),
            pe("Deep Purple OG", "Upper Long Bed", "direct", date(2026, 4, 2), planned_harvest=date(2026, 6, 1), loc="North edge"),
            pe("Cruiser Cilantro", "Upper Long Bed", "direct", date(2026, 4, 9), planned_harvest=date(2026, 5, 29), loc="South edge"),

            # Raised Bed 2: Tomato Bed
            pe("New Girl F1 OG", "Tomato Bed", "indoor_start", date(2026, 3, 6), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 7, 11), qty=2, loc="North half"),
            pe("Carbon OG", "Tomato Bed", "indoor_start", date(2026, 3, 6), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 7, 25), qty=2, loc="South half"),

            # Raised Bed 3: Main Center Bed
            pe("Purple Bumble Bee OG", "Main Center Bed", "indoor_start", date(2026, 3, 6), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 7, 19), qty=2, loc="NE corner"),
            pe("Nova F1", "Main Center Bed", "indoor_start", date(2026, 3, 6), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 7, 9), qty=1, loc="NW corner"),
            pe("Sidekick", "Main Center Bed", "indoor_start", date(2026, 3, 13), planned_transplant=date(2026, 4, 16), planned_harvest=date(2026, 5, 27), qty=4, loc="Center row"),
            pe("Red Tabby F1", "Main Center Bed", "direct", date(2026, 4, 2), planned_harvest=date(2026, 5, 3), loc="South section"),
            pe("Allstar Gourmet Lettuce Mix", "Main Center Bed", "direct", date(2026, 4, 9), planned_harvest=date(2026, 5, 7), loc="SW corner"),
            pe("Picolino F1 OG", "Main Center Bed", "indoor_start", date(2026, 4, 16), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 6, 29), qty=2, loc="SE corner trellis"),
            pe("Prospera Basil", "Main Center Bed", "indoor_start", date(2026, 4, 2), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 6, 15), qty=3, loc="Center"),

            # Raised Bed 4: Beet Bed
            pe("SC* Boro F1 OG", "Beet Bed", "direct", date(2026, 3, 27), planned_harvest=date(2026, 5, 16), qty=50, loc="Full bed"),

            # Raised Bed 5: Zucchini & Edamame Bed
            pe("Black Beauty Zucchini", "Zucchini & Edamame Bed", "direct", date(2026, 5, 10), planned_harvest=date(2026, 7, 1), qty=3, loc="West half"),
            pe("Chiba Green OG", "Zucchini & Edamame Bed", "direct", date(2026, 5, 10), planned_harvest=date(2026, 7, 31), loc="East half"),
            pe("Rover F1", "Zucchini & Edamame Bed", "direct", date(2026, 4, 2), planned_harvest=date(2026, 4, 23), loc="Border row"),

            # Raised Bed 6: Bottom Pepper Bed
            pe("Ace F1", "Bottom Pepper Bed", "indoor_start", date(2026, 2, 6), planned_transplant=date(2026, 5, 3), planned_harvest=date(2026, 7, 22), qty=6, loc="West section"),
            pe("Autumn Wings Blend", "Bottom Pepper Bed", "direct", date(2026, 5, 10), planned_harvest=date(2026, 8, 13), qty=4, loc="East section"),

            # Raised Bed 7: Left Wall Chili Bed
            pe("Shishito OG", "Left Wall Chili Bed", "indoor_start", date(2026, 2, 6), planned_transplant=date(2026, 5, 3), planned_harvest=date(2026, 7, 2), qty=4, loc="South two sections"),
            pe("Pantera F1", "Left Wall Chili Bed", "indoor_start", date(2026, 2, 6), planned_transplant=date(2026, 5, 3), planned_harvest=date(2026, 8, 1), qty=4, loc="North two sections"),

            # Containers — Tomatoes
            pe("Indigo Cherry Drops OG", "Indigo Tomato", "indoor_start", date(2026, 3, 6), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 7, 20), qty=1),
            pe("Granadero F1 OG", "Grandero Container A", "indoor_start", date(2026, 3, 6), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 7, 24), qty=1),
            pe("Granadero F1 OG", "Grandero Container B", "indoor_start", date(2026, 3, 6), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 7, 24), qty=1),

            # Containers — Lettuces
            pe("Sunland Romaine OG", "Romaine Container A", "direct", date(2026, 4, 9), planned_harvest=date(2026, 6, 4), qty=4),
            pe("Sunland Romaine OG", "Romaine Container B", "direct", date(2026, 4, 9), planned_harvest=date(2026, 6, 4), qty=4),

            # Containers — Peas
            pe("Sugar Snap Peas", "Peas Container A", "direct", date(2026, 3, 27), planned_harvest=date(2026, 6, 27), qty=6),
            pe("Sugar Snap Peas", "Peas Container B", "direct", date(2026, 3, 27), planned_harvest=date(2026, 6, 27), qty=6),

            # Container — Cucumber
            pe("Picolino F1 OG", "Picolino Cucumber", "indoor_start", date(2026, 4, 16), planned_transplant=date(2026, 5, 10), planned_harvest=date(2026, 6, 29), qty=1),
        ]

        added = 0
        for p in plantings:
            if p:
                db.add(p)
                added += 1

        await db.commit()
        print(f"  Created {added} planting events")
        print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
