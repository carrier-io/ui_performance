import json
from queue import Empty

from sqlalchemy import and_

from flask_restful import Resource
from flask import request

from tools import api_tools, auth

from ...models.pd.test_parameters import UITestParam
from ...models.ui_tests import UIPerformanceTest

from ...utils.utils import parse_test_data, run_test


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.tests.view"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
            "administration": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def get(self, project_id: int):
        total, res = api_tools.get(project_id, request.args, UIPerformanceTest)
        rows = [i.api_json(with_schedules=True) for i in res]
        return {'total': total, 'rows': rows}, 200

    @staticmethod
    def get_schedules_ids(filter_) -> set:
        r = set()
        for i in UIPerformanceTest.query.with_entities(UIPerformanceTest.schedules).filter(
                filter_
        ).all():
            r.update(set(*i))
        return r

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.tests.delete"],
        "recommended_roles": {
            "default": {"admin": True, "editor": False, "viewer": False},
            "administration": {"admin": True, "editor": False, "viewer": False},
        }
    })
    def delete(self, project_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        try:
            delete_ids = list(map(int, request.args["id[]"].split(',')))
        except TypeError:
            return 'IDs must be integers', 400

        filter_ = and_(
            UIPerformanceTest.project_id == project.id,
            UIPerformanceTest.id.in_(delete_ids)
        )

        try:
            self.module.context.rpc_manager.timeout(3).scheduling_delete_schedules(
                self.get_schedules_ids(filter_)
            )
        except Empty:
            ...

        UIPerformanceTest.query.filter(
            filter_
        ).delete()
        UIPerformanceTest.commit()

        return {'ids': delete_ids}, 200

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.tests.create"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
            "administration": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def post(self, project_id: int):
        """
        Create test and run on demand
        """
        data = json.loads(request.form.get('data'))
        run_test_ = data.pop('run_test', False)
        engagement_id = data.get('integrations', {}).get('reporters', {}) \
            .get('reporter_engagement', {}).get('id')

        test_data, errors = parse_test_data(
            project_id=project_id,
            request_data=data,
            rpc=self.module.context.rpc_manager,
        )

        if errors:
            return errors, 400

        schedules = test_data.pop('schedules', [])

        test_data['test_parameters'] = test_data.get('test_parameters', [])

        test_data['test_parameters'].append(
            UITestParam(
                name="test_type",
                default=test_data.pop('test_type'),
                description='auto-generated from test type'
            ).dict()
        )
        test_data['test_parameters'].append(
            UITestParam(
                name="env_type",
                default=test_data.pop('env_type'),
                description='auto-generated from environment'
            ).dict()
        )

        if test_data['source']['name'] == 'artifact':
            file = request.files.get('file')
            project = self.module.context.rpc_manager.call.project_get_or_404(
                project_id=project_id)
            api_tools.upload_file('tests', file, project, create_if_not_exists=True)
        test = UIPerformanceTest(**test_data)
        test.insert()

        test.handle_change_schedules(schedules)

        if run_test_:
            resp = run_test(test, engagement_id=engagement_id)
            return resp, resp.get('code', 200)
        return test.api_json(), 200
