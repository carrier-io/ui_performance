from datetime import datetime
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, validator


class StatusField(BaseModel):
    status: str = 'Pending...'
    percentage: int = 0
    description: str = 'Check if there are enough workers to perform the test'


class ReportGetModel(BaseModel):
    id: int
    uid: str
    project_id: int
    name: str
    browser: str
    test_type: str
    environment: str
    browser_version: str
    resolution: Optional[str] = '1380x749'
    duration: Optional[int]
    aggregation: str
    tags: Optional[list] = []
    loops: int
    thresholds_failed: int
    thresholds_total: int
    test_status: StatusField = StatusField()
    test_config: dict

    failures: Optional[float] = 0
    thresholds_missed: Optional[float] = 0

    totals: list = []
    total_pages: Optional[int] = 0
    avg_page_load: Optional[float] = 0
    avg_step_duration: Optional[float] = 0.5
    build_id: Optional[str]
    release_id: Optional[int] = 1

    start_time: datetime
    end_time: Optional[datetime]

    @validator('total_pages', always=True)
    def set_total_pages(cls, value, values: dict):
        return len(values['totals'])

    @validator('avg_page_load', always=True)
    def set_page_load(cls, value, values: dict):
        totals = values['totals']
        try:
            return round(sum(totals) / values['total_pages'] / 1000, 2)
        except ZeroDivisionError:
            return 0

    @validator('failures', always=True)
    def compute_failures(cls, value, values: dict):
        try:
            result = round(values['thresholds_failed'] / values['thresholds_total'] * 100, 2)
            values['thresholds_missed'] = result
        except ZeroDivisionError:
            result = 0
        return result

    @validator('start_time', 'end_time')
    def format_dates(cls, value: Optional[datetime]):
        if not value:
            return value
        return value.isoformat()

    @validator('build_id', always=True)
    def set_uuid(cls, value: str):
        if value:
            return value
        return str(uuid4())

    class Config:
        fields = {
            'env_type': 'environment'
        }
        orm_mode = True

