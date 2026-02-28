# OnsightFS Canonical Data Model

## Scope
This document defines the canonical OnsightFS data model for imports from InspectorADE Excel exports.

Source headers:
ID, Address, City, State, Zip, CountyName, OrderNumber, WorkCode, InspectorPay, ClientPay, Due, InspectorDueDate, ECD, DataEntryErrorCode, WindowStartDate, WindowEndDate, Client, Inspector, InspectorUserID, Assigned, Ordered, Imported, Completed, Submitted, SubmittedToClient, SubmittedToClientBy, Owner, Lender, LoanNumber, Vacant, PhotoRequired, Instructions, Note, Latitude, Longitude, QCUser, MappingAddress1, MappingAddress2, MappingCity, MappingState, MappingZip, Source

## Conventions
- Types: `uuid`, `string`, `text`, `integer`, `decimal(12,2)`, `boolean`, `date`, `datetime`, `enum`.
- Nullability is explicit per field.
- Canonical order identifier is `order_uid`, sourced from import column `ID`.
- All imported orders must retain `import_batch_id` for auditability.

## Entity: Order (Core)
| Field | Type | Nullable | Notes / Source |
|---|---|---|---|
| id | uuid | No | Internal primary key |
| import_batch_id | uuid | No | FK to ImportBatch |
| order_uid | string | No | Unique canonical ID from `ID` |
| order_number | string | Yes | From `OrderNumber` |
| work_code | string | Yes | From `WorkCode` |
| client_id | uuid | Yes | FK to Client (resolved from name) |
| contractor_id | uuid | Yes | FK to Contractor (resolved from name/user id) |
| client_name_raw | string | Yes | Raw import value from `Client` |
| contractor_name_raw | string | Yes | Raw import value from `Inspector` |
| contractor_user_id | string | Yes | From `InspectorUserID` |
| address | string | Yes | From `Address` |
| city | string | Yes | From `City` |
| state | string | Yes | From `State` |
| zip | string | Yes | From `Zip` |
| county | string | Yes | From `CountyName` |
| latitude | decimal(10,7) | Yes | From `Latitude` |
| longitude | decimal(10,7) | Yes | From `Longitude` |
| due_date | date | Yes | From `Due` |
| inspector_due_date | date | Yes | From `InspectorDueDate` |
| ecd_date | date | Yes | From `ECD` |
| window_start_date | date | Yes | From `WindowStartDate` |
| window_end_date | date | Yes | From `WindowEndDate` |
| ordered_at | datetime | Yes | From `Ordered` |
| assigned_at | datetime | Yes | From `Assigned` |
| imported_at | datetime | Yes | From `Imported` |
| completed_at | datetime | Yes | From `Completed` |
| submitted_at | datetime | Yes | From `Submitted` |
| submitted_to_client_at | datetime | Yes | From `SubmittedToClient`; used as Date Submitted |
| submitted_to_client_by | string | Yes | From `SubmittedToClientBy` |
| source | string | Yes | From `Source` |
| owner | string | Yes | From `Owner` |
| lender | string | Yes | From `Lender` |
| loan_number | string | Yes | From `LoanNumber` |
| vacant | boolean | Yes | From `Vacant` |
| photo_required | boolean | Yes | From `PhotoRequired` |
| instructions | text | Yes | From `Instructions` |
| note | text | Yes | From `Note` |
| qc_user | string | Yes | From `QCUser` |
| mapping_address_1 | string | Yes | From `MappingAddress1` |
| mapping_address_2 | string | Yes | From `MappingAddress2` |
| mapping_city | string | Yes | From `MappingCity` |
| mapping_state | string | Yes | From `MappingState` |
| mapping_zip | string | Yes | From `MappingZip` |
| data_entry_error_code | string | Yes | From `DataEntryErrorCode` |
| client_pay_amount | decimal(12,2) | Yes | Imported `ClientPay` snapshot |
| contractor_pay_amount | decimal(12,2) | Yes | Imported `InspectorPay` snapshot |
| paid_out_status | enum | No | `unpaid` or `paid` |
| billed_status | enum | No | `unbilled` or `billed` |
| missing_paid_out_rate | boolean | No | True if no ContractorPayRate matches |
| conflicting_paid_out_rate | boolean | No | True if multiple same-priority ContractorPayRate matches |
| missing_paid_in_rate | boolean | No | True if no ClientBillingRate matches |
| conflicting_paid_in_rate | boolean | No | True if multiple same-priority ClientBillingRate matches |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

## Entity: Contractor
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| name | string | No | Canonical display name |
| external_user_id | string | Yes | InspectorADE `InspectorUserID` |
| email | string | Yes | Optional |
| phone | string | Yes | Optional |
| active | boolean | No | Soft active flag |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

## Entity: Client
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| name | string | No | Canonical display name |
| external_ref | string | Yes | Optional source identifier |
| active | boolean | No | Soft active flag |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

## Entity: ContractorPayRate (Paid Out Rules)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| contractor_id | uuid | No | FK to Contractor |
| client_id | uuid | No | FK to Client |
| state | string | Yes | Optional wildcard when null |
| county | string | Yes | Optional wildcard when null |
| city | string | Yes | Optional wildcard when null |
| amount | decimal(12,2) | No | Amount to pay contractor |
| priority | integer | No | Lower value = higher precedence |
| active | boolean | No | Rule enabled flag |
| effective_start_date | date | Yes | Optional date bound |
| effective_end_date | date | Yes | Optional date bound |
| notes | text | Yes | Optional |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

Matching behavior:
- Match on exact `contractor_id` and `client_id`.
- Location matching uses most specific applicable rule where null location fields act as wildcards.
- Precedence order by `priority` ascending.
- If zero matches: `missing_paid_out_rate = true`.
- If multiple top-priority matches: `conflicting_paid_out_rate = true`.

## Entity: ClientBillingRate (Paid In Rules)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| client_id | uuid | No | FK to Client |
| state | string | Yes | Optional wildcard when null |
| county | string | Yes | Optional wildcard when null |
| city | string | Yes | Optional wildcard when null |
| amount | decimal(12,2) | No | Amount billed to client |
| priority | integer | No | Lower value = higher precedence |
| active | boolean | No | Rule enabled flag |
| effective_start_date | date | Yes | Optional date bound |
| effective_end_date | date | Yes | Optional date bound |
| notes | text | Yes | Optional |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

Matching behavior:
- Match on exact `client_id`.
- Location matching uses most specific applicable rule where null location fields act as wildcards.
- Precedence order by `priority` ascending.
- If zero matches: `missing_paid_in_rate = true`.
- If multiple top-priority matches: `conflicting_paid_in_rate = true`.

## Entity: PayrollBatch
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| batch_name | string | No | Human-readable identifier |
| period_start | date | No | Payroll period start |
| period_end | date | No | Payroll period end |
| contractor_id | uuid | Yes | Optional single-contractor batch |
| status | enum | No | `draft`, `approved`, `paid`, `void` |
| approved_at | datetime | Yes | Approval timestamp |
| paid_at | datetime | Yes | Payment timestamp |
| notes | text | Yes | Optional |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

## Entity: PayrollBatchItem
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| payroll_batch_id | uuid | No | FK to PayrollBatch |
| order_id | uuid | No | FK to Order |
| contractor_id | uuid | No | FK to Contractor |
| pay_amount | decimal(12,2) | No | Final paid out amount |
| paid_out_status | enum | No | `unpaid` or `paid` |
| paid_at | datetime | Yes | Item payment timestamp |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

## Entity: Document (Contractor Docs)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| contractor_id | uuid | No | FK to Contractor |
| document_type | enum | No | Example: `w9`, `insurance`, `contract`, `other` |
| file_name | string | No | Original file name |
| mime_type | string | Yes | Optional |
| storage_path | string | No | Internal storage locator |
| expires_on | date | Yes | Optional expiration |
| verified | boolean | No | Admin verification flag |
| verified_at | datetime | Yes | Verification timestamp |
| notes | text | Yes | Optional |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

## Entity: ImportBatch (Audit)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | No | Primary key |
| source_system | string | No | Expected value: `InspectorADE` |
| source_file_name | string | No | Imported file name |
| source_file_hash | string | Yes | Optional checksum |
| imported_by | string | Yes | User identifier |
| imported_at | datetime | No | Import timestamp |
| row_count | integer | No | Total rows parsed |
| inserted_count | integer | No | New orders inserted |
| duplicate_count | integer | No | Rows skipped as duplicates |
| error_count | integer | No | Invalid rows |
| notes | text | Yes | Optional |
| created_at | datetime | No | System timestamp |
| updated_at | datetime | No | System timestamp |

## Accounting Table Visible Columns (Canonical Order)
1. Contractor
2. Client
3. County
4. City
5. Address
6. Zip
7. Client Pay
8. Contractor Pay
9. Date Submitted (`submitted_to_client_at` / `SubmittedToClient`)
10. Due Date (`due_date` / `Due`)

## Uniqueness and Dedupe Rules
- Primary uniqueness key: `order_uid` (from import `ID`), globally unique.
- Secondary dedupe key: (`client_name_raw`, `order_number`) for cross-check and legacy rows where `ID` may be missing/dirty.
- Every imported order must store `import_batch_id`.
- Duplicate prevention on ingest:
  - If incoming `order_uid` already exists, do not insert a new Order row.
  - Record duplicate in ImportBatch metrics (`duplicate_count`).
  - Optionally update mutable non-financial metadata only via explicit update mode (not default ingest).

## Statuses and Flags
- `paid_out_status`: `unpaid` | `paid`
- `billed_status`: `unbilled` | `billed`
- `missing_paid_out_rate`: boolean
- `conflicting_paid_out_rate`: boolean
- `missing_paid_in_rate`: boolean
- `conflicting_paid_in_rate`: boolean

## Import Field Requirements (Practical)
| Import Header | Required | Notes |
|---|---|---|
| ID | Yes | Becomes `order_uid`; required for primary dedupe |
| Client | Yes | Needed to resolve/create Client |
| Inspector | Yes | Needed to resolve/create Contractor |
| Address | Yes | Operationally required for work identification |
| City | Yes | Used by rate rules and reporting |
| State | Yes | Used by rate rules and reporting |
| Zip | Yes | Used for addressing/reporting |
| CountyName | No | Strongly recommended for county-level rate rules |
| OrderNumber | No | Used for secondary dedupe and client reference |
| ClientPay | No | Imported snapshot; may be overridden by billing rate |
| InspectorPay | No | Imported snapshot; may be overridden by pay rate |
| SubmittedToClient | No | Date Submitted column in accounting view |
| Due | No | Due Date column in accounting view |
| All other source columns | No | Stored when present for audit/operations |
