import traceback

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from app.db import SessionLocal
from app.schemas.import_orders import ImportOrdersResponse
from app.services.import_orders import import_orders_file

app = FastAPI()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/import/orders", response_model=ImportOrdersResponse)
async def import_orders(file: UploadFile = File(...)) -> ImportOrdersResponse:
    db = SessionLocal()
    try:
        try:
            return import_orders_file(db=db, file_obj=file.file, filename=file.filename)
        except Exception as e:
            print(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "type": e.__class__.__name__,
                        "message": str(e),
                    }
                },
            )
    finally:
        db.close()
