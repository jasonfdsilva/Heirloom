from datetime import date, datetime

from pydantic import BaseModel

from app.models.issue import IssueType, IssueSeverity


class IssueLogCreate(BaseModel):
    planting_event_id: int
    issue_type: IssueType
    name: str | None = None
    severity: IssueSeverity = IssueSeverity.low
    occurred_at: date
    notes: str | None = None


class IssueLogRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    planting_event_id: int
    logged_by_user_id: int
    issue_type: IssueType
    name: str | None
    severity: IssueSeverity
    occurred_at: date
    resolved_at: date | None
    notes: str | None
    created_at: datetime


class IssueLogUpdate(BaseModel):
    severity: IssueSeverity | None = None
    resolved_at: date | None = None
    notes: str | None = None
