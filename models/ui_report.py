from uuid import uuid4

from ..utils.utils import get_bucket_name, get_report_file_name
from sqlalchemy import String, Column, Integer, Boolean, JSON, ARRAY, DateTime
from tools import db_tools, db, rpc_tools, constants as c


class UIReport(db_tools.AbstractBaseMixin, db.Base, rpc_tools.RpcMixin):
    __tablename__ = "ui_report"

    id = Column(Integer, primary_key=True)
    uid = Column(String(128), unique=True, nullable=False)
    name = Column(String(128), unique=False)
    project_id = Column(Integer, unique=False, nullable=False)
    test_status = Column(
        JSON,
        default={
            "status": "Pending...",
            "percentage": 0,
            "description": "Check if there are enough workers to perform the test"
        }
    )
    start_time = Column(DateTime, unique=False)
    end_time = Column(DateTime, unique=False)
    duration = Column(Integer, unique=False, nullable=True)
    is_active = Column(Boolean, unique=False)
    browser = Column(String(128), unique=False)
    browser_version = Column(String(128), unique=False)
    environment = Column(String(128), unique=False, nullable=True)
    test_type = Column(String(128), unique=False, nullable=True)
    base_url = Column(String(128), unique=False, nullable=True)
    thresholds_total = Column(Integer, unique=False, nullable=True, default=0)
    thresholds_failed = Column(Integer, unique=False, nullable=True, default=0)
    exception = Column(String(1024), unique=False)
    passed = Column(Boolean, unique=False, default=True)
    loops = Column(Integer, unique=False, nullable=True)
    aggregation = Column(String(128), unique=False)
    test_config = Column(JSON, nullable=False, unique=False)
    test_uid = Column(String(128), unique=False, nullable=False)
    first_contentful_paint = Column(JSON, unique=False, nullable=True)
    largest_contentful_paint = Column(JSON, unique=False, nullable=True)
    first_visual_change = Column(JSON, unique=False, nullable=True)
    last_visual_change = Column(JSON, unique=False, nullable=True)
    dom_content_loading = Column(JSON, unique=False, nullable=True)
    dom_processing = Column(JSON, unique=False, nullable=True)
    time_to_interactive = Column(JSON, unique=False, nullable=True)
    time_to_first_byte = Column(JSON, unique=False, nullable=True)
    time_to_first_paint = Column(JSON, unique=False, nullable=True)
    load_time = Column(JSON, unique=False, nullable=True)
    total_blocking_time = Column(JSON, unique=False, nullable=True)
    tags = Column(ARRAY(String), default=[])

    #engagement id
    engagement = Column(String(64), nullable=True, default=None)

    def insert(self):
        if not self.uid:
            self.uid = uuid4()
        if not self.test_config:
            from .ui_tests import UIPerformanceTest
            self.test_config = UIPerformanceTest.query.filter(
                UIPerformanceTest.get_api_filter(self.project_id, self.test_uid)
            ).first().api_json()
        super().insert()

    @property
    def bucket_name(self):
        return get_bucket_name(self.name)

    @property
    def report_file_name(self):
        return get_report_file_name(self.uid)

