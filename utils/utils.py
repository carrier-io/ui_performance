import json
from datetime import datetime
from queue import Empty
from typing import List, Tuple, Union, Optional
from uuid import uuid4
from pydantic import ValidationError

from pylon.core.tools import log

from tools import TaskManager, rpc_tools


def test_parameter_value_by_name(test_parameters: List[dict], param_name: str) -> Optional[str]:
    for i in test_parameters:
        if i['name'] == param_name:
            return i['default']


def run_test(test: 'UIPerformanceTest', config_only: bool = False, execution: bool = False, engagement_id: str = None) -> dict:
    event = test.configure_execution_json(execution=execution)
    if config_only:
        return event

    from ...projects.models.quota import ProjectQuota
    quota = ProjectQuota.query.filter_by(project_id=test.project_id).first().to_json()
    requested_resources = {"cpu": test.parallel_runners * test.env_vars["cpu_quota"],
                           "memory": test.parallel_runners * test.env_vars["memory_quota"]}
    test_duration_limit = quota.get("test_duration_limit")
    if not test_duration_limit:
        test_duration_limit = -1
    cpu_limit = quota.get("cpu_limit")
    memory_limit = quota.get("memory_limit")
    if cpu_limit and cpu_limit != -1 and requested_resources["cpu"] > cpu_limit:
        return {"quota": quota, "requested_resources": requested_resources, "error_type": "limits",
                "message": "Not enough cpu resources to execute the test. Check project's limits", "code": 400}
    if memory_limit and memory_limit != -1 and requested_resources["memory"] > memory_limit:
        return {"quota": quota, "requested_resources": requested_resources, "error_type": "limits",
                "message": "Not enough memory resources to execute the test. Check project's limits", "code": 400}

    from ..models.ui_report import UIReport
    report = UIReport(
        uid=uuid4(),
        name=test_parameter_value_by_name(test.all_test_parameters.dict()['test_parameters'], 'test_name'),
        project_id=test.project_id,
        start_time=datetime.utcnow().isoformat(" ").split(".")[0],
        is_active=True,
        browser=test.browser_name,
        browser_version=test.browser_version,  # todo: same value as browser?
        environment=test_parameter_value_by_name(test.test_parameters, 'env_type'),
        test_type=test_parameter_value_by_name(test.test_parameters, 'test_type'),
        loops=test.loops,
        aggregation=test.aggregation,
        test_config=test.api_json(),
        test_uid=test.test_uid,
        engagement=engagement_id
    )
    report.insert()
    event["cc_env_vars"]["REPORT_ID"] = str(report.uid)
    event["cc_env_vars"]["test_duration_limit"] = str(test_duration_limit)

    resp = TaskManager(test.project_id).run_task(event=[event], queue_name="__internal")

    test.rpc.call.increment_statistics(test.project_id, 'ui_performance_test_runs')
    test.event_manager.fire_event('usage_create_test_resource_usage', report.to_json())
    resp['result_id'] = report.id  # for test rerun
    return resp


class ValidationErrorPD(Exception):
    def __init__(self, loc: Union[str, list], msg: str):
        self.loc = [loc] if isinstance(loc, str) else loc
        self.msg = msg
        super().__init__({'loc': self.loc, 'msg': msg})

    def json(self):
        return json.dumps(self.dict())

    def dict(self):
        return {'loc': self.loc, 'msg': self.msg}


def parse_test_data(project_id: int, request_data: dict,
                    *,
                    rpc=None, common_kwargs: dict = None,
                    test_create_rpc_kwargs: dict = None,
                    raise_immediately: bool = False,
                    skip_validation_if_undefined: bool = True,
                    ) -> Tuple[dict, list]:
    """
    Parses data while creating test

    :param project_id: Project id
    :param request_data: data from request json to validate
    :param rpc: instance of rpc_manager or None(will be initialized)
    :param common_kwargs: kwargs for common_test_parameters
            (test parameters apart from test_params table. E.g. name, description)
    :param test_create_rpc_kwargs: for each test_data key a rpc is called - these kwargs will be passed to rpc call
    :param raise_immediately: weather to raise validation error on first encounter or raise after collecting all errors
    :param skip_validation_if_undefined: if no rpc to validate test_data key is found
            data will remain untouched if True or erased if False
    :return:
    """
    if not rpc:
        rpc = rpc_tools.RpcMixin().rpc

    if not request_data.get('integrations'):
        request_data['integrations'] = {}

    common_kwargs = common_kwargs or dict()
    test_create_rpc_kwargs = test_create_rpc_kwargs or dict()
    errors = list()
    common_params = request_data.pop('common_params', {})
    cloud_settings = common_params.get('env_vars', {}).get('cloud_settings')

    if cloud_settings:
        integration_name = cloud_settings.get("integration_name")

        cloud_settings["cpu_cores_limit"] = common_params['env_vars']["cpu_quota"]
        cloud_settings["memory_limit"] = common_params['env_vars']["memory_quota"]
        cloud_settings["concurrency"] = common_params['parallel_runners']

        try:
            cloud_settings["ec2_instance_type"] = common_params["env_vars"]["cloud_settings"]["ec2_instance_type"]
        except:
            cloud_settings["ec2_instance_type"] = "auto"

        request_data["integrations"]["clouds"] = {}
        request_data["integrations"]["clouds"][integration_name] = cloud_settings

    s3_settings = request_data.get('integrations', {}).get('system', {}).get('s3_integration')
    if not s3_settings:
        default_integration = rpc.call.integrations_get_defaults(
            project_id=project_id, name='s3_integration'
        )
        if default_integration:
            request_data['integrations'].setdefault('system', {})['s3_integration'] = {
                "integration_id": default_integration.integration_id, 
                "is_local": bool(default_integration.project_id)
            }

    try:
        test_data = rpc.call.ui_performance_test_create_common_parameters(
            project_id=project_id,
            test_params=common_params,
            **common_kwargs
        )
    except ValidationError as e:
        test_data = dict()
        errors.extend(e.errors())
        if raise_immediately:
            return test_data, errors

    for k, v in request_data.items():
        try:
            test_data.update(rpc.call_function_with_timeout(
                func=f'ui_performance_test_create_{k}',
                timeout=2,
                data=v,
                **test_create_rpc_kwargs
            ))
        except Empty:
            log.warning(f'Cannot find parser for {k}')
            if skip_validation_if_undefined:
                test_data.update({k: v})
        except ValidationError as e:
            for i in e.errors():
                i['loc'] = (k, *i['loc'])
            errors.extend(e.errors())

            if raise_immediately:
                return test_data, errors
        except Exception as e:
            from traceback import format_exc
            log.warning(f'Exception as e {type(e)} in ui_performance_test_create_{k}\n{format_exc()}')
            e.loc = [k, *getattr(e, 'loc', [])]
            errors.append(ValidationErrorPD(e.loc, str(e)).dict())
            if raise_immediately:
                return test_data, errors

    return test_data, errors


def get_bucket_name(test_name: str) -> str:
    return test_name.replace('_', '').lower()


def get_report_file_name(uid: str) -> str:
    return f'{uid}.csv.gz'
