from flask_restful import Resource
from tools import auth
from ...models.ui_report import UIReport
from ...models.ui_tests import UIPerformanceTest
from ...utils.utils import run_test


class API(Resource):
    url_params = [
        '<int:result_id>',
    ]

    def __init__(self, module):
        self.module = module

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.tests.edit"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def post(self, result_id: int):
        """
        Post method for re-running test
        """
        report = UIReport.query.get_or_404(result_id)
        config = report.test_config
        config.pop('job_type', None)
        proxy_test = UIPerformanceTest(**config)
        resp = run_test(proxy_test, config_only=False, execution=False)
        return resp, resp.get('code', 200)
