import enum


class PaidOutStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"


class BilledStatus(str, enum.Enum):
    unbilled = "unbilled"
    billed = "billed"


class PayrollBatchStatus(str, enum.Enum):
    draft = "draft"
    approved = "approved"
    paid = "paid"
    void = "void"


class DocumentType(str, enum.Enum):
    w9 = "w9"
    insurance = "insurance"
    contract = "contract"
    other = "other"
