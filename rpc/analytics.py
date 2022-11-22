from typing import Optional
from sqlalchemy import JSON, cast, Integer, String, literal_column, desc, asc, func
from collections import OrderedDict

from pylon.core.tools import web, log

from tools import rpc_tools

from ..models.ui_baseline import UIBaseline
from ..models.ui_report import UIReport


columns = OrderedDict((
    ('id', UIReport.id),
    ('group', literal_column("'ui_performance'").label('group')),
    ('name', UIReport.name),
    ('start_time', UIReport.start_time),
    ('test_type', UIReport.test_type),
    ('test_env', UIReport.environment),
    ('status', UIReport.test_status['status']),
    ('duration', UIReport.duration),
    ('tags', UIReport.tags),
    ('tags', UIReport.tags),
    ('total', UIReport.load_time),
    ('first_contentful_paint', UIReport.first_contentful_paint),
    ('largest_contentful_paint', UIReport.largest_contentful_paint),
    ('first_visual_change', UIReport.first_visual_change),
    ('last_visual_change', UIReport.last_visual_change),
    ('dom_content_loading', UIReport.dom_content_loading),
    ('dom_processing', UIReport.dom_processing),
    ('time_to_interactive', UIReport.time_to_interactive),
    ('time_to_first_byte', UIReport.time_to_first_byte),
    ('time_to_first_paint', UIReport.time_to_first_paint),
    ('total_blocking_time', UIReport.total_blocking_time),
))


class RPC:
    @web.rpc('performance_analysis_test_runs_ui_performance')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def test_runs(self, project_id: int,
                               start_time, end_time=None) -> tuple:
        log.info('ui_performance rpc | %s | %s', project_id, [start_time, end_time])

        query = UIReport.query.with_entities(
            *columns.values()
        ).filter(
            UIReport.project_id == project_id,
            UIReport.start_time >= start_time,
            func.lower(UIReport.test_status['status'].cast(String)).in_(('"finished"', '"failed"', '"success"'))
        ).order_by(
            asc(UIReport.start_time)
        )

        if end_time:
            query.filter(UIReport.end_time <= end_time)

        return tuple(zip(columns.keys(), i) for i in query.all())

    @web.rpc('ui_performance_get_baseline_report_id')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_baseline_report_id(self, project_id: int, test_name: str, test_env: str) -> Optional[int]:
        result = UIBaseline.query.with_entities(UIBaseline.report_id).filter(
            UIBaseline.project_id == project_id,
            UIBaseline.test == test_name,
            UIBaseline.environment == test_env,
        ).first()
        try:
            return result[0]
        except (TypeError, IndexError):
            return

    @web.rpc('ui_performance_get_results_by_ids')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_results_by_ids(self, project_id: int, report_ids: list):
        log.info('ui_performance_get_results_by_ids %s %s', project_id, report_ids)
        query = UIReport.query.with_entities(
            *columns.values()
        ).filter(
            UIReport.project_id == project_id,
            UIReport.id.in_(report_ids),
        )

        return tuple(zip(columns.keys(), i) for i in query.all())

