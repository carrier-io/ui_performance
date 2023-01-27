from datetime import datetime
from typing import Optional

from pydantic import BaseModel, validator
from sqlalchemy import String, literal_column, asc, func, not_
from collections import OrderedDict, defaultdict

from pylon.core.tools import web, log

from tools import rpc_tools

from ..models.ui_baseline import UIBaseline
from ..models.ui_report import UIReport
from ..utils.utils import get_bucket_name, get_report_file_name


class ReportBuilderReflection(BaseModel):
    id: int
    uid: str
    name: str
    bucket_name: Optional[str]
    report_file_name: Optional[str]

    @validator('bucket_name', always=True)
    def set_bucket_name(cls, value: str, values: dict):
        return get_bucket_name(values['name'])

    @validator('report_file_name', always=True)
    def set_report_file_name(cls, value: str, values: dict):
        return get_report_file_name(values['uid'])

    # @property
    # def bucket_name(self):
    #     self

    class Config:
        orm_mode = True

class ReportResultsModel(BaseModel):
    timestamp: str
    type: str
    load_time: int
    dom: int
    tti: int
    fcp: int
    lcp: int
    cls: int
    tbt: int
    fvc: int
    lvc: int

columns = OrderedDict((
    ('id', UIReport.id),
    ('uid', UIReport.uid),
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
                  start_time: Optional[datetime] = None,
                  end_time: Optional[datetime] = None,
                  exclude_uids: Optional[list] = None) -> tuple:
        log.info('ui_performance rpc | %s | %s', project_id, [start_time, end_time])

        query = UIReport.query.with_entities(
            *columns.values()
        ).filter(
            UIReport.project_id == project_id,
            func.lower(UIReport.test_status['status'].cast(String)).in_(('"finished"', '"failed"', '"success"'))
        ).order_by(
            asc(UIReport.start_time)
        )

        if start_time:
            query = query.filter(UIReport.start_time >= start_time)

        if end_time:
            query = query.filter(UIReport.end_time <= end_time)

        if exclude_uids:
            query = query.filter(not_(UIReport.uid.in_(exclude_uids)))

        # log.info('ui final query %s', query)

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

    @web.rpc('ui_performance_get_builder_data', 'get_builder_data')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def query_builder_data(self, project_id: int, report_ids: list) -> dict:
        reports = UIReport.query.filter(
            UIReport.project_id == project_id,
            UIReport.id.in_(report_ids)
        ).all()
        return self.compile_builder_data(project_id, reports)

    @web.rpc('ui_performance_compile_builder_data', 'compile_builder_data')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def compile_builder_data(self, project_id: int, reports: list):
        data = dict()
        page_names = set()
        earliest_date = None
        loop_earliest_dates = defaultdict(dict)
        # data = {
        #     8: {
        #         1: {
        #             'timestamp': '',
        #             ...
        #         },
        #         2: {
        #
        #         },
        #         3: {
        #
        #         }
        #     }
        # }
        for report in reports:
            if isinstance(report, dict):
                report_reflection = ReportBuilderReflection.parse_obj(report)
            else:
                report_reflection = ReportBuilderReflection.from_orm(report)

            # log.info('rrd, %s', report_reflection.dict())

            results = self.get_ui_results(
                report_reflection.bucket_name,
                report_reflection.report_file_name,
                project_id
            )
            data[report_reflection.id] = dict()

            for r in results:
                page_name = r.pop('name')
                page_names.add(page_name)
                loop = int(r.pop('loop'))
                result_model = ReportResultsModel.parse_obj(r)

                if not data[report_reflection.id].get(page_name):
                    data[report_reflection.id][page_name] = dict()
                data[report_reflection.id][page_name][loop] = result_model.dict()

                current_date = datetime.fromisoformat(result_model.timestamp)
                if earliest_date is None or earliest_date > current_date:
                    earliest_date = current_date
                if not loop_earliest_dates[report_reflection.id].get(loop) or \
                        loop_earliest_dates[report_reflection.id][loop] > current_date:
                    loop_earliest_dates[report_reflection.id][loop] = current_date

        return {
            'datasets': data,
            'page_names': list(page_names),
            'earliest_date': earliest_date.isoformat(),
            'loop_earliest_dates': loop_earliest_dates
        }
