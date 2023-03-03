from datetime import datetime
from json import loads
from typing import Optional, Union

import boto3
from pydantic import ValidationError
from pylon.core.tools import web, log
from sqlalchemy import desc

from tools import rpc_tools
from ..models.pd.quality_gate import QualityGate
from ..models.pd.report import ReportGetModel
from ..models.pd.test_parameters import UITestParamsCreate, UITestParamsRun, UITestParams
from ..models.pd.ui_test import TestOverrideable, TestCommon
from ..models.ui_report import UIReport
from ..models.ui_tests import UIPerformanceTest
from ..utils.utils import run_test
from ...shared.tools.constants import MINIO_ENDPOINT, MINIO_ACCESS, MINIO_SECRET, MINIO_REGION


class RPC:
    @web.rpc('ui_results_or_404', 'results_or_404')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def ui_results_or_404(self, run_id, report=None) -> dict:
        if not report:
            report = UIReport.query.get_or_404(run_id)
        bucket = report.name.replace("_", "").lower()
        file_name = f"{report.uid}.csv.gz"
        try:
            results = self.get_ui_results(bucket, file_name, report.project_id)
            totals = list(map(lambda x: int(x["load_time"]), results))
        except:
            totals = []

        pd_obj = ReportGetModel.from_orm(report)
        pd_obj.totals = totals
        return pd_obj.validate(pd_obj).dict(exclude={'totals'}, by_alias=True)

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
    def get_ui_results(self, bucket: str, file_name: str, project_id: int, skip_aggregated: bool = True) -> list:
        if skip_aggregated:
            query = "select * from s3object s where s.loop != 0"
        else:
            query = "select * from s3object s"
        s3 = boto3.client('s3',
                          endpoint_url=MINIO_ENDPOINT,
                          aws_access_key_id=MINIO_ACCESS,
                          aws_secret_access_key=MINIO_SECRET,
                          region_name=MINIO_REGION)

        r = s3.select_object_content(
            Bucket=f'p--{project_id}.{bucket}',
            Key=f'{file_name}',
            ExpressionType='SQL',
            Expression=query,
            InputSerialization={
                'CSV': {
                    "FileHeaderInfo": "USE",
                },
                'CompressionType': 'GZIP',
            },
            OutputSerialization={'JSON': {}},
        )
        results = []
        for event in r['Payload']:
            if 'Records' in event:
                records = event['Records']['Payload'].decode('utf-8')
                for each in records.split("\n"):
                    try:
                        rec = loads(each)
                        results.append(rec)
                    except:
                        pass

        return results

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
