from app.db.base_class import Base  # noqa: F401

# Import all models here so Alembic can detect them
from app.models.user import User  # noqa: F401
from app.models.garden import Garden, GardenMembership  # noqa: F401
from app.models.space import GrowingSpace  # noqa: F401
from app.models.variety import PlantVariety  # noqa: F401
from app.models.seedlot import SeedLot  # noqa: F401
from app.models.season import GardenSeason  # noqa: F401
from app.models.planting import PlantingEvent  # noqa: F401
from app.models.maintenance import MaintenanceLog  # noqa: F401
from app.models.issue import IssueLog  # noqa: F401
from app.models.harvest import HarvestRecord  # noqa: F401
from app.models.photo import PlantPhoto  # noqa: F401
from app.models.expense import GardenExpense  # noqa: F401
from app.models.grow_light import GrowLightConfig, GrowLightAssignment  # noqa: F401
