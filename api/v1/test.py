import json
from queue import Empty
from typing import Union

from flask import request
from flask_restful import Resource

from ...models.ui_tests import UIPerformanceTests
from ...utils.utils import run_test


class API(Resource):
    url_params = [
        '<int:project_id>/<int:test_id>',
        '<int:project_id>/<string:test_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int, test_id: Union[int, str]):
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        test = UIPerformanceTests.query.filter(
            UIPerformanceTests.get_api_filter(project.id, test_id)
        ).first()
        if request.args.get("raw"):
            test = test.api_json()
            schedules = test.pop('schedules', [])
            if schedules:
                try:
                    test['scheduling'] = self.module.context.rpc_manager.timeout(
                        2).scheduling_backend_performance_load_from_db_by_ids(schedules)
                except Empty:
                    test['scheduling'] = []
            return test
        if request.args.get("type") == "docker":
            message = test.configure_execution_json('docker', execution=request.args.get("exec", False))
        else:
            message = [{"test_id": test.test_uid}]
        return {"config": message}  # this is cc format

    # def put(self, project_id: int, test_id: Union[int, str]):
    #     """ Update test data and run on demand """
    #     project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
    #     run_test_ = request.json.pop('run_test', False)
    #     test_data, errors = parse_test_data(
    #         project_id=project_id,
    #         request_data=request.json,
    #         rpc=self.module.context.rpc_manager,
    #         common_kwargs={'exclude': {'test_uid', }}
    #     )
    #
    #     if errors:
    #         return errors, 400
    #
    #     test_data['test_parameters'].append(
    #         UIPerformanceTests(
    #             name="test_type",
    #             default=test_data.pop('test_type'),
    #             description='auto-generated from test type'
    #         ).dict()
    #     )
    #     test_data['test_parameters'].append(
    #         UIPerformanceTests(
    #             name="env_type",
    #             default=test_data.pop('env_type'),
    #             description='auto-generated from environment'
    #         ).dict()
    #     )
    #
    #     test_query = UIPerformanceTests.query.filter(UIPerformanceTests.get_api_filter(project_id, test_id))
    #
    #     schedules = test_data.pop('scheduling', [])
    #
    #     test_query.update(test_data)
    #     UIPerformanceTests.commit()
    #     test = test_query.one()
    #
    #     test.handle_change_schedules(schedules)
    #
    #     if run_test_:
    #         resp = run_test(test)
    #         return resp, resp.get('code', 200)
    #
    #     return test.api_json(), 200

    def post(self, project_id: int, test_id: Union[int, str]):
        """ Run test with possible overridden params
        """
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        args = request.json
        config_only_flag = args.pop('type', False)
        execution_flag = args.pop('execution', True)
        params = json.loads(args["params"])

        test = UIPerformanceTests.query.filter(
            UIPerformanceTests.get_ui_filter(project.id, test_id)
        ).first()

        resp = run_test(test, params, config_only=config_only_flag, execution=execution_flag)
        return resp, resp.get('code', 200)
