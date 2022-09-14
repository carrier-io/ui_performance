import boto3
from typing import Optional, Union
from uuid import uuid4
from pylon.core.tools import web
from pydantic import ValidationError
from json import loads
from ..models.pd.test_parameters import UITestParamsCreate, UITestParamsRun, UITestParams
from ..models.pd.ui_test import TestOverrideable, TestCommon
from ..models.ui_report import UIReport
from ..models.ui_tests import UIPerformanceTest

from tools import rpc_tools
from ...shared.tools.constants import MINIO_ENDPOINT, MINIO_ACCESS, MINIO_SECRET, MINIO_REGION
from ..utils.utils import run_test


class RPC:
    @web.rpc('ui_results_or_404', 'results_or_404')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def ui_results_or_404(self, run_id, report=None):
        # todo: serialization via pydantic models
        if not report:
            report = UIReport.query.get_or_404(run_id)
        bucket = report.name.replace("_", "").lower()
        file_name = f"{report.uid}.csv.gz"
        results = self.get_ui_results(bucket, file_name, report.project_id)

        totals = list(map(lambda x: int(x["load_time"]), results))

        try:
            avg_page_load = sum(totals) / len(totals)
        except ZeroDivisionError:
            avg_page_load = 0

        try:
            thresholds_missed = round(report.thresholds_failed / report.thresholds_total * 100, 2)
        except ZeroDivisionError:
            thresholds_missed = 0

        data = dict(id=report.id, uid=report.uid, project_id=report.project_id, name=report.name,
                    browser=report.browser, test_type=report.test_type, env_type=report.environment,
                    browser_version=report.browser_version, resolution="1380x749", total_pages=len(totals),
                    end_time=report.stop_time, start_time=report.start_time, duration=report.duration,
                    failures=thresholds_missed, thresholds_missed=thresholds_missed, aggregation=report.aggregation,
                    avg_page_load=round(avg_page_load / 1000, 2), tags=[], loops=report.loops,
                    avg_step_duration=0.5, build_id=str(uuid4()), release_id=1, test_status=report.test_status,
                    test_config=report.test_config, )
        return data

    @web.rpc('ui_performance_job_type_by_uid')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def job_type_by_uid(self, project_id: int, test_uid: str) -> Optional[str]:
        test = UIPerformanceTest.query.filter(
                UIPerformanceTest.get_api_filter(project_id, test_uid)
        ).first()
        if test:
            return test.job_type

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
    def get_ui_results(self, bucket, file_name, project_id, skip_aggregated=True):
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
