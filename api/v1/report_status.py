from flask import request, make_response
from flask_restful import Resource
from tools import auth
from ...models.ui_report import UIReport
from typing import Union


class API(Resource):
    url_params = [
        '<int:project_id>/<int:report_id>',
        '<int:project_id>/<string:report_id>',
    ]

    def __init__(self, module):
        self.module = module
        self.sio = self.module.context.sio

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.reports.view"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
            "administration": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def get(self, project_id: int, report_id: Union[int, str]):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        report = UIReport.query.filter(UIReport.get_api_filter(project.id, report_id)).first().to_json()
        return {"message": report["test_status"]["status"]}

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.reports.edit"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
            "administration": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def put(self, project_id: int, report_id: Union[int, str]):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        report = UIReport.query.filter(UIReport.get_api_filter(project.id, report_id)).first()
        test_status = request.json["test_status"]
        report.test_status = test_status
        report.commit()
        self.sio.emit("ui_test_status_updated", {"status": test_status, 'report_id': report.id})
        if test_status['percentage'] == 100:
            self.sio.emit('ui_test_finished', report.to_json())
        return {"message": f"status changed to {report.test_status['status']}"}
