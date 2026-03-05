from __future__ import annotations

from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation
from io import BytesIO
from uuid import UUID

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order


def _collapse_ws(text: str) -> str:
    return " ".join(text.split())


def _normalize_name(value: object) -> str:
    raw = "" if value is None else str(value)
    return _collapse_ws(raw.strip()).casefold()


def _display_name(value: object) -> str:
    raw = "" if value is None else str(value)
    return _collapse_ws(raw.strip())


def _most_common_non_empty_name(values: list[object]) -> str:
    cleaned = [_display_name(v) for v in values]
    non_empty = [name for name in cleaned if name]
    if not non_empty:
        return "Unknown"
    return Counter(non_empty).most_common(1)[0][0]


def _to_decimal(value: object) -> Decimal:
    if value is None:
        return Decimal("0.00")
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0.00")


def _submitted_date_text(order: Order) -> str:
    if order.submitted_to_client_at is None:
        return ""
    return order.submitted_to_client_at.date().isoformat()


def _fetch_orders(db: Session, order_ids: list[UUID]) -> list[Order]:
    if not order_ids:
        return []
    orders = db.execute(select(Order).where(Order.id.in_(order_ids))).scalars().all()
    return sorted(
        orders,
        key=lambda o: (
            o.submitted_to_client_at.isoformat() if o.submitted_to_client_at else "",
            (o.address or "").lower(),
        ),
    )


def _build_pdf(title: str, who_label: str, who_value: str, headers: list[str], rows: list[list[str]], total: Decimal) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    story = [
        Paragraph("<b>ONSIGHT FIELD SERVICES LLC</b>", styles["Heading3"]),
        Paragraph("360-915-3968", styles["Normal"]),
        Paragraph("Onsight Field Services", styles["Normal"]),
        Spacer(1, 10),
        Paragraph(f"<b>{title}</b>", styles["Title"]),
        Spacer(1, 8),
        Paragraph(f"{who_label}: {who_value}", styles["Normal"]),
        Paragraph(f"Date: {date.today().isoformat()}", styles["Normal"]),
        Spacer(1, 12),
    ]

    table_data = [headers, *rows]
    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e6e9ef")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#a0a7b4")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f9fc")]),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"<b>Total: {total.quantize(Decimal('0.01'))}</b>", styles["Heading3"]))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_invoice_pdf(db: Session, order_ids: list[UUID]) -> bytes:
    orders = _fetch_orders(db, order_ids)
    if not orders:
        raise ValueError("No orders selected.")

    normalized_clients = {
        _normalize_name(o.client_name_raw) for o in orders if _normalize_name(o.client_name_raw)
    }
    if len(normalized_clients) > 1:
        found = ", ".join(sorted(normalized_clients)[:5])
        raise ValueError(f"Multiple clients selected; found: {found}")

    client_name = _most_common_non_empty_name([o.client_name_raw for o in orders])
    total = Decimal("0.00")
    rows: list[list[str]] = []

    for order in orders:
        amount = _to_decimal(order.client_pay_amount)
        total += amount
        rows.append(
            [
                _submitted_date_text(order),
                str(order.address or ""),
                str(order.city or ""),
                str(order.county or ""),
                str(order.zip or ""),
                f"{amount}",
            ]
        )

    return _build_pdf(
        title="INVOICE",
        who_label="Client",
        who_value=client_name,
        headers=["SubmittedToClient", "Address", "City", "County", "Zip", "Amount"],
        rows=rows,
        total=total,
    )


def generate_contractor_pay_pdf(db: Session, order_ids: list[UUID]) -> bytes:
    orders = _fetch_orders(db, order_ids)
    if not orders:
        raise ValueError("No orders selected.")

    normalized_contractors = {
        _normalize_name(o.contractor_name_raw) for o in orders if _normalize_name(o.contractor_name_raw)
    }
    if len(normalized_contractors) > 1:
        found = ", ".join(sorted(normalized_contractors)[:5])
        raise ValueError(f"Multiple contractors selected; found: {found}")

    contractor_name = _most_common_non_empty_name([o.contractor_name_raw for o in orders])
    total = Decimal("0.00")
    rows: list[list[str]] = []

    for order in orders:
        amount = _to_decimal(order.contractor_pay_amount)
        total += amount
        rows.append(
            [
                _submitted_date_text(order),
                str(order.address or ""),
                str(order.city or ""),
                str(order.county or ""),
                str(order.zip or ""),
                f"{amount}",
            ]
        )

    return _build_pdf(
        title="CONTRACTOR PAY STATEMENT",
        who_label="Contractor",
        who_value=contractor_name,
        headers=["SubmittedToClient", "Address", "City", "County", "Zip", "Amount"],
        rows=rows,
        total=total,
    )
