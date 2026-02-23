"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers.counties import router as counties_router
from routers.gap import router as gap_router
from routers.tracts import router as tracts_router

app = FastAPI(
    title="Service Gap Dashboard API",
    description="Civic deserts analysis: Census vulnerability + OSM infrastructure",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(counties_router, prefix="/api")
app.include_router(gap_router, prefix="/api")
app.include_router(tracts_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
