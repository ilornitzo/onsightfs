import traceback
from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import FastAPI, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict

from app.db import SessionLocal
from app.schemas.import_orders import ImportOrdersResponse
from app.schemas.contractor_profile import ContractorProfileOut, ContractorProfileUpsert
from app.schemas.orders import OrdersListResponse, OrdersSummaryResponse
from app.schemas.payroll import CreatePayrollBatchesRequest, CreatePayrollBatchesResponse
from app.schemas.rates import (
    ClientCreate,
    ClientOut,
    ContractorPayRateCreate,
    ContractorPayRateOut,
    ContractorPayRateUpdate,
    RecalculatePayRequest,
    RecalculatePayResponse,
)
from app.services.import_orders import import_orders_file
from app.services.amounts import update_order_amounts
from app.services.orders_query import list_orders, summarize_orders
from app.services.contractor_profile import get_contractor_profile, upsert_contractor_profile
from app.services.paid_in import set_order_paid_in_status
from app.services.paid_out import set_order_paid_out_status
from app.services.pdf_exports import generate_contractor_pay_pdf, generate_invoice_pdf
from app.services.onboarding_parse import parse_onboarding_file
from app.services.payroll import confirm_payroll_batch, create_payroll_batches
from app.services.contractor_documents import (
    download_document_file,
    list_contractor_documents,
    save_contractor_document,
)
from app.services.rates import (
    create_contractor,
    create_client,
    create_contractor_pay_rate,
    delete_contractor_pay_rate,
    list_contractors,
    list_clients,
    list_contractor_pay_rates,
    update_contractor_pay_rate,
)
from app.services.recalculate_pay import recalculate_contractor_pay

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ContractorCreate(BaseModel):
    name: str
    external_user_id: str | None = None
    email: str | None = None
    phone: str | None = None
    active: bool | None = True


class ContractorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    external_user_id: str | None = None
    email: str | None = None
    phone: str | None = None
    active: bool


class PaidInUpdateRequest(BaseModel):
    paid: bool


class AmountsUpdateRequest(BaseModel):
    client_pay_amount: str | float | int | None = None
    contractor_pay_amount: str | float | int | None = None


class PdfExportRequest(BaseModel):
    order_ids: list[UUID]


class ContractorDocumentOut(BaseModel):
    id: UUID
    document_type: str
    file_name: str
    created_at: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/contractors/onboarding/parse")
async def post_parse_contractor_onboarding(file: UploadFile | None = File(None)) -> dict[str, str]:
    if file is None:
        raise HTTPException(status_code=400, detail="file is required")

    filename = file.filename or ""
    lower_name = filename.lower()
    supported_suffixes = (".pdf", ".csv", ".xlsx")
    if not lower_name.endswith(supported_suffixes):
        raise HTTPException(status_code=400, detail="file must be PDF, CSV, or XLSX")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="file is empty")

    try:
        parsed = parse_onboarding_file(file_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"failed to parse onboarding file: {e}") from e

    return {
        "name": str(parsed.get("name", "")),
        "business_name": str(parsed.get("business_name", "")),
        "email": str(parsed.get("email", "")),
        "phone": str(parsed.get("phone", "")),
        "address": str(parsed.get("address", "")),
        "dob": str(parsed.get("dob", "")),
        "ein_or_ssn": str(parsed.get("ssn_or_ein", parsed.get("ein_or_ssn", ""))),
        "bank_routing": str(parsed.get("bank_routing_number", parsed.get("bank_routing", ""))),
        "bank_account": str(parsed.get("bank_account_number", parsed.get("bank_account", ""))),
        "notes": str(parsed.get("notes", "")),
    }


@app.post("/api/contractors/{contractor_id}/documents", response_model=ContractorDocumentOut)
async def post_contractor_document(
    contractor_id: UUID,
    file: UploadFile | None = File(None),
    document_type: str | None = Form(None),
) -> ContractorDocumentOut:
    if file is None:
        raise HTTPException(status_code=400, detail="file is required")
    if not document_type:
        raise HTTPException(status_code=400, detail="document_type is required")

    db = SessionLocal()
    try:
        try:
            file_bytes = await file.read()
            result = save_contractor_document(
                db=db,
                contractor_id=contractor_id,
                document_type=document_type,
                file_name=file.filename or "upload.bin",
                mime_type=file.content_type,
                file_bytes=file_bytes,
            )
            return ContractorDocumentOut(**result)
        except ValueError as e:
            message = str(e)
            if message == "contractor not found":
                raise HTTPException(status_code=404, detail=message) from e
            raise HTTPException(status_code=400, detail=message) from e
    finally:
        db.close()


@app.get("/api/contractors/{contractor_id}/documents", response_model=list[ContractorDocumentOut])
def get_contractor_documents(contractor_id: UUID) -> list[ContractorDocumentOut]:
    db = SessionLocal()
    try:
        try:
            docs = list_contractor_documents(db=db, contractor_id=contractor_id)
            return [ContractorDocumentOut(**doc) for doc in docs]
        except ValueError as e:
            if str(e) == "contractor not found":
                raise HTTPException(status_code=404, detail=str(e)) from e
            raise HTTPException(status_code=400, detail=str(e)) from e
    finally:
        db.close()


@app.get("/api/documents/{document_id}/download")
def get_document_download(document_id: UUID) -> FileResponse:
    db = SessionLocal()
    try:
        try:
            file_path, file_name, media_type = download_document_file(db=db, document_id=document_id)
            return FileResponse(path=file_path, filename=file_name, media_type=media_type)
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
    finally:
        db.close()


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


@app.get("/api/orders", response_model=OrdersListResponse)
def get_orders(
    q: str | None = None,
    contractor: str | None = None,
    client: str | None = None,
    county: str | None = None,
    state: str | None = None,
    city: str | None = None,
    submitted_from: date | None = None,
    submitted_to: date | None = None,
    paid_out_status: Literal["unpaid", "paid"] | None = None,
    billed_status: Literal["unbilled", "billed"] | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    sort: str = "-submitted_to_client_at",
) -> OrdersListResponse:
    db = SessionLocal()
    try:
        try:
            return list_orders(
                db=db,
                q=q,
                contractor=contractor,
                client=client,
                county=county,
                state=state,
                city=city,
                submitted_from=submitted_from,
                submitted_to=submitted_to,
                paid_out_status=paid_out_status,
                billed_status=billed_status,
                limit=limit,
                offset=offset,
                sort=sort,
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e)) from e
    finally:
        db.close()


@app.get("/api/orders/summary", response_model=OrdersSummaryResponse)
def get_orders_summary(
    q: str | None = None,
    contractor: str | None = None,
    client: str | None = None,
    county: str | None = None,
    state: str | None = None,
    city: str | None = None,
    submitted_from: date | None = None,
    submitted_to: date | None = None,
    paid_out_status: Literal["unpaid", "paid"] | None = None,
    billed_status: Literal["unbilled", "billed"] | None = None,
) -> OrdersSummaryResponse:
    db = SessionLocal()
    try:
        return summarize_orders(
            db=db,
            q=q,
            contractor=contractor,
            client=client,
            county=county,
            state=state,
            city=city,
            submitted_from=submitted_from,
            submitted_to=submitted_to,
            paid_out_status=paid_out_status,
            billed_status=billed_status,
        )
    finally:
        db.close()


@app.get("/api/clients", response_model=list[ClientOut])
def get_clients() -> list[ClientOut]:
    db = SessionLocal()
    try:
        return [ClientOut.model_validate(client) for client in list_clients(db)]
    finally:
        db.close()


@app.post("/api/clients", response_model=ClientOut)
def post_client(payload: ClientCreate) -> ClientOut:
    db = SessionLocal()
    try:
        client = create_client(db, payload)
        return ClientOut.model_validate(client)
    finally:
        db.close()


@app.get("/api/contractors", response_model=list[ContractorOut])
def get_contractors() -> list[ContractorOut]:
    db = SessionLocal()
    try:
        return [ContractorOut.model_validate(contractor) for contractor in list_contractors(db)]
    finally:
        db.close()


@app.post("/api/contractors", response_model=ContractorOut)
def post_contractor(payload: ContractorCreate) -> ContractorOut:
    db = SessionLocal()
    try:
        contractor = create_contractor(
            db,
            name=payload.name,
            external_user_id=payload.external_user_id,
            email=payload.email,
            phone=payload.phone,
            active=payload.active,
        )
        return ContractorOut.model_validate(contractor)
    finally:
        db.close()


@app.get("/api/contractors/{contractor_id}/profile", response_model=ContractorProfileOut)
def get_contractor_onboarding_profile(contractor_id: UUID) -> ContractorProfileOut:
    db = SessionLocal()
    try:
        return get_contractor_profile(db, contractor_id)
    finally:
        db.close()


@app.put("/api/contractors/{contractor_id}/profile", response_model=ContractorProfileOut)
def put_contractor_onboarding_profile(contractor_id: UUID, payload: ContractorProfileUpsert) -> ContractorProfileOut:
    db = SessionLocal()
    try:
        try:
            return upsert_contractor_profile(db, contractor_id, payload)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
    finally:
        db.close()


@app.get("/api/contractors/pay_rates", response_model=list[ContractorPayRateOut])
def get_contractor_pay_rates(
    contractor_id: UUID | None = None,
    client_id: UUID | None = None,
) -> list[ContractorPayRateOut]:
    db = SessionLocal()
    try:
        rates = list_contractor_pay_rates(db, contractor_id=contractor_id, client_id=client_id)
        return [ContractorPayRateOut.model_validate(rate) for rate in rates]
    finally:
        db.close()


@app.post("/api/contractors/pay_rates", response_model=ContractorPayRateOut)
def post_contractor_pay_rate(payload: ContractorPayRateCreate) -> ContractorPayRateOut:
    db = SessionLocal()
    try:
        rate = create_contractor_pay_rate(db, payload)
        return ContractorPayRateOut.model_validate(rate)
    finally:
        db.close()


@app.put("/api/contractors/pay_rates/{rate_id}", response_model=ContractorPayRateOut)
def put_contractor_pay_rate(rate_id: UUID, payload: ContractorPayRateUpdate) -> ContractorPayRateOut:
    db = SessionLocal()
    try:
        try:
            rate = update_contractor_pay_rate(db, rate_id, payload)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return ContractorPayRateOut.model_validate(rate)
    finally:
        db.close()


@app.delete("/api/contractors/pay_rates/{rate_id}")
def remove_contractor_pay_rate(rate_id: UUID) -> dict[str, bool]:
    db = SessionLocal()
    try:
        try:
            delete_contractor_pay_rate(db, rate_id)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
        return {"deleted": True}
    finally:
        db.close()


@app.post("/api/pay/recalculate", response_model=RecalculatePayResponse)
def post_recalculate_pay(payload: RecalculatePayRequest) -> RecalculatePayResponse:
    db = SessionLocal()
    try:
        return recalculate_contractor_pay(db, payload)
    finally:
        db.close()


@app.post("/api/payroll/batches")
def post_payroll_batches(payload: CreatePayrollBatchesRequest) -> dict:
    db = SessionLocal()
    try:
        return create_payroll_batches(db, payload)
    finally:
        db.close()


@app.post("/api/payroll/batches/{batch_id}/confirm")
def post_confirm_payroll_batch(batch_id: UUID) -> dict[str, str | int]:
    db = SessionLocal()
    try:
        try:
            return confirm_payroll_batch(db, batch_id)
        except ValueError as e:
            if str(e) == "batch not found":
                raise HTTPException(status_code=404, detail=str(e)) from e
            raise HTTPException(status_code=400, detail=str(e)) from e
    finally:
        db.close()


@app.post("/api/orders/{order_id}/paid_in")
def post_order_paid_in(order_id: UUID, payload: PaidInUpdateRequest) -> dict[str, str]:
    db = SessionLocal()
    try:
        try:
            return set_order_paid_in_status(db, order_id, payload.paid)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
    finally:
        db.close()


@app.post("/api/orders/{order_id}/paid_out")
def post_order_paid_out(order_id: UUID, payload: PaidInUpdateRequest) -> dict[str, str]:
    db = SessionLocal()
    try:
        try:
            return set_order_paid_out_status(db, order_id, payload.paid)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e
    finally:
        db.close()


@app.patch("/api/orders/{order_id}/amounts")
def patch_order_amounts(order_id: UUID, payload: AmountsUpdateRequest) -> dict[str, str | None]:
    db = SessionLocal()
    try:
        try:
            return update_order_amounts(
                db,
                order_id=order_id,
                client_pay_amount=payload.client_pay_amount,
                contractor_pay_amount=payload.contractor_pay_amount,
            )
        except ValueError as e:
            if str(e) == "order not found":
                raise HTTPException(status_code=404, detail=str(e)) from e
            raise HTTPException(status_code=422, detail=str(e)) from e
    finally:
        db.close()


@app.post("/api/exports/invoice.pdf")
def post_invoice_pdf(payload: PdfExportRequest) -> Response:
    db = SessionLocal()
    try:
        try:
            pdf_bytes = generate_invoice_pdf(db, payload.order_ids)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        return Response(content=pdf_bytes, media_type="application/pdf")
    finally:
        db.close()


@app.post("/api/exports/contractor_pay.pdf")
def post_contractor_pay_pdf(payload: PdfExportRequest) -> Response:
    db = SessionLocal()
    try:
        try:
            pdf_bytes = generate_contractor_pay_pdf(db, payload.order_ids)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        return Response(content=pdf_bytes, media_type="application/pdf")
    finally:
        db.close()
