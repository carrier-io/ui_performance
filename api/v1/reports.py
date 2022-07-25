from flask_restful import Resource
from pylon.core.tools import log
from flask import current_app, request, make_response
from ...models.ui_report import UIReport
from tools import MinioClient, api_tools


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
        args = request.args
        if args.get("report_id"):
            report = UIReport.query.filter_by(project_id=project_id, id=args.get("report_id")).first().to_json()
            return report
        reports = []
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        total, res = api_tools.get(project.id, args, UIReport)
        for each in res:
            each_json = each.to_json()
            each_json["start_time"] = each_json["start_time"].replace("T", " ").split(".")[0]
            reports.append(each_json)
        return {"total": total, "rows": reports}
