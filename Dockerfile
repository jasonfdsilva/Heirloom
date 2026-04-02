FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy aiosqlite python-multipart aiofiles

COPY backend/ /app/backend/
COPY --from=frontend-build /build/dist /app/static

RUN mkdir -p /app/data /app/photos

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
