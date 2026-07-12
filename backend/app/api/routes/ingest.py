from fastapi import APIRouter

router = APIRouter(tags=["Ingest"])


@router.get("/ingest")
def ingest() -> dict:
    return {
        "message": "Ingest endpoint ready.",
    }
