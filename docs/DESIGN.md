# Stage 4: Design Document

## 1. Data Models

### `Asset`
Represents an inventoriable piece of corporate equipment.
- `id` (String): Unique identifier (e.g., 'A1').
- `name` (String): Display name of the equipment.
- `category` (String): Grouping category (e.g., 'Laptop', 'Monitor').
- `status` (Enum): `AVAILABLE`, `MAINTENANCE`.
- `maxDuration` (Integer): Maximum allowed checkout duration in days.

### `Reservation`
Represents a user's booking for an asset.
- `id` (String): Auto-incremented reservation ID (e.g., 'R1').
- `assetId` (String): Foreign key to the Asset.
- `userId` (String): String representing the user who booked it.
- `startDate` (ISO Date String): Start date of checkout.
- `endDate` (ISO Date String): End date of checkout.
- `status` (Enum): `APPROVED`, `PENDING_APPROVAL`, `CANCELLED`, `RETURNED`.
- `createdAt` (ISO Date String): Timestamp of creation.

## 2. API Specifications (Key Flows)

### Request Validation Lifecycle
The `POST /api/reservations` endpoint acts as a strict security and business-logic gatekeeper.

```mermaid
flowchart TD
    Start([POST /api/reservations]) --> XSS{Is UserId safe?}
    XSS -- No --> Err400_1[400: Invalid Format]
    XSS -- Yes --> DateValid{Dates valid & future?}
    DateValid -- No --> Err400_2[400: Past / Invalid]
    DateValid -- Yes --> Maint{Asset in Maint?}
    Maint -- Yes --> Err400_3[400: In Maintenance]
    Maint -- No --> Dur{Duration <= Max?}
    Dur -- No --> Err400_4[400: Exceeds Max Duration]
    Dur -- Yes --> Quota{User Active < 2?}
    
    Quota -- No --> Q_Wait[Set Status: PENDING_APPROVAL]
    Quota -- Yes --> Q_Approve[Set Status: APPROVED]
    
    Q_Wait --> Overlap{Has Date Overlap?}
    Q_Approve --> Overlap
    
    Overlap -- Yes --> Err409[409: Conflict Double-Book]
    Overlap -- No --> Save[(Save to DB)]
    Save --> End([201 Created])
```

### `GET /api/assets`
- **Purpose**: Retrieve catalog of available assets.
- **Response**: `200 OK` Array of `Asset` objects.

### `POST /api/reservations`
- **Purpose**: Create a new reservation.
- **Payload**: `{ "assetId": "A1", "userId": "test", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }`
- **Success Response**: `201 Created` with created `Reservation` object.

### `POST /api/reservations/:id/cancel`
- **Purpose**: Cancel an active reservation.
- **Success Response**: `200 OK` `{ "message": "Reservation cancelled successfully." }`

## 3. Error Handling Matrix
The application uses strict input validation. Errors return a standard JSON format: `{ "error": "Description" }`

| Scenario | HTTP Status Code | Message |
| :--- | :--- | :--- |
| Missing required fields | 400 Bad Request | "Missing required fields." |
| Script injection in `userId` | 400 Bad Request | "Invalid userId format." |
| End date before Start date | 400 Bad Request | "End date must be strictly after start date." |
| Booking in the past | 400 Bad Request | "Cannot book in the past." |
| Asset in maintenance | 400 Bad Request | "Asset is currently in maintenance." |
| Booking duration > `maxDuration` | 400 Bad Request | "Exceeds maximum duration of X days for this asset." |
| Date Overlap (Double Book) | 409 Conflict | "Asset is already reserved for the requested dates." |
