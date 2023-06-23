from datetime import datetime
from json import loads
from typing import Optional, Union

from pydantic import ValidationError
from pylon.core.tools import web, log
from sqlalchemy import desc

from tools import rpc_tools, MinioClient
from ..models.pd.quality_gate import QualityGate
from ..models.pd.report import ReportGetModel
from ..models.pd.test_parameters import UITestParamsCreate, UITestParamsRun, UITestParams
from ..models.pd.ui_test import TestOverrideable, TestCommon
from ..models.ui_report import UIReport
from ..models.ui_tests import UIPerformanceTest
from ..utils.utils import run_test


class RPC:
    @web.rpc('ui_results_or_404', 'results_or_404')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def ui_results_or_404(self, run_id, report=None) -> dict:
        if not report:
            report = UIReport.query.get_or_404(run_id)
        bucket = report.name.replace("_", "").lower()
        file_name = f"{report.uid}.csv.gz"
        s3_settings = report.test_config.get(
            'integrations', {}).get('system', {}).get('s3_integration', {})
        avg_page_load = 0
        thresholds_missed = 0
        try:
            results = self.get_ui_results(bucket=bucket, file_name=file_name, 
                                          project_id=report.project_id, **s3_settings)
            totals = list(map(lambda x: int(x["load_time"]), results))
            try:
                avg_page_load = round(sum(totals) / len(totals) / 1000, 2)
            except ZeroDivisionError:
                avg_page_load = 0

            try:
                thresholds_missed = round(report.thresholds_failed / report.thresholds_total * 100, 2)
            except ZeroDivisionError:
                thresholds_missed = 0
        except:
            totals = []

        pd_obj = ReportGetModel.from_orm(report)
        pd_obj.totals = totals
        data = pd_obj.validate(pd_obj).dict(exclude={'totals'}, by_alias=True)
        data["avg_page_load"] = avg_page_load
        data["thresholds_missed"] = thresholds_missed
        data["total_pages"] = len(totals)
        return data

    @web.rpc('ui_performance_job_type_by_uid')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def job_type_by_uid(self, project_id: int, test_uid: str) -> Optional[str]:
        test = UIPerformanceTest.query.filter(
            UIPerformanceTest.get_api_filter(project_id, test_uid)
        ).first()
        if test:
            return test.job_type

    @web.rpc(f'ui_performance_test_create_integration_validate_quality_gate')
    @rpc_tools.wrap_exceptions(ValidationError)
    def ui_performance_test_create_integration_validate(self, data: dict, pd_kwargs: Optional[dict] = None, **kwargs) -> dict:
        if not pd_kwargs:
            pd_kwargs = {}
        pd_object = QualityGate(**data)
        return pd_object.dict(**pd_kwargs)

    @web.rpc('ui_performance_execution_json_config_quality_gate')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def make_execution_json_config(self, integration_data: dict) -> dict:
        """ Prepare execution_json for this integration """
        # no extra data to add to execution json
        # but rpc needs to exist
        return integration_data

    @web.rpc('ui_performance_test_create_common_parameters', 'parse_common_test_parameters')
    def parse_common_test_parameters(self, project_id: int, test_params: dict, **kwargs) -> dict:
        overrideable_only = kwargs.pop('overrideable_only', False)
        if overrideable_only:
            pd_object = TestOverrideable(
                **test_params
            )
        else:
            pd_object = TestCommon(
                project_id=project_id,
                **test_params
            )
        return pd_object.dict(**kwargs)

    @web.rpc('ui_performance_test_create_test_parameters', 'parse_test_parameters')
    @rpc_tools.wrap_exceptions(ValidationError)
    def parse_test_parameters(self, data: Union[list, dict], **kwargs) -> dict:
        purpose = kwargs.pop('purpose', None)
        if purpose == 'run':
            pd_object = UITestParamsRun(test_parameters=data)
        elif purpose == 'control_tower':
            pd_object = UITestParamsCreate.from_control_tower(data)
        else:
            pd_object = UITestParamsCreate(test_parameters=data)
        return pd_object.dict(**kwargs)

    @web.rpc('ui_performance_run_scheduled_test', 'run_scheduled_test')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def run_scheduled_test(self, test_id: int, test_params: list) -> dict:
        test = UIPerformanceTest.query.filter(UIPerformanceTest.id == test_id).one()
        test_params_schedule_pd = UITestParams(test_parameters=test_params)
        test_params_existing_pd = UITestParams.from_orm(test)
        test_params_existing_pd.update(test_params_schedule_pd)
        test.__dict__.update(test_params_existing_pd.dict())
        return run_test(test)

    @web.rpc('get_ui_results', 'get_ui_results')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_ui_results(self, 
                       bucket: str, 
                       file_name: str, 
                       project_id: int, 
                       skip_aggregated: bool = True,
                       client: MinioClient = None,
                       integration_id: int = None,
                       is_local: bool=True
                       ) -> list:
        if skip_aggregated:
            query = " where s.loop != 0"
        else:
            query = ""
        if not client:
            client = MinioClient.from_project_id(project_id, integration_id, is_local)
        return client.select_object_content(bucket, file_name, query)

    @web.rpc('ui_performance_get_tests')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_tests(self, project_id: int) -> list[UIPerformanceTest]:
        """ Gets all created tests """
        return UIPerformanceTest.query.filter_by(project_id=project_id).all()

    @web.rpc('ui_performance_get_reports')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_reports(
            self, project_id: int,
            start_time: datetime | None = None,
            end_time: datetime | None = None,
            unique: bool = False
    ) -> list[UIReport]:
        """ Gets all UI reports filtered by time"""

        def _get_unique_reports(objects: list[UIReport]) -> list[UIReport]:
            unique_combinations = {}
            for obj in objects:
                combination = (obj.test_uid, obj.environment, obj.test_type)
                stored_obj = unique_combinations.get(combination)
                if stored_obj is None or obj.start_time > stored_obj.start_time:
                    unique_combinations[combination] = obj

            return list(unique_combinations.values())

        query = UIReport.query.filter(
            UIReport.project_id == project_id,
        ).order_by(
            desc(UIReport.start_time)
        )

        if start_time:
            query = query.filter(UIReport.start_time >= start_time.isoformat())

        if end_time:
            query = query.filter(UIReport.end_time <= end_time.isoformat())

        reports = query.all()
        if unique:
            reports = _get_unique_reports(reports)

        return reports
