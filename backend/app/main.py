from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.base  # noqa: F401 — must be first to register all models with SQLAlchemy
from app.api.routes import auth, expenses, gardens, logs, photos, plantings, schedule, seasons, seedlots, spaces, varieties
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(gardens.router)
app.include_router(spaces.router)
app.include_router(varieties.router)
app.include_router(plantings.router)
app.include_router(logs.router)
app.include_router(photos.router)
app.include_router(seasons.router)
app.include_router(seedlots.router)
app.include_router(expenses.router)
app.include_router(schedule.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
