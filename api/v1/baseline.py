from flask_restful import Resource
from flask import request, make_response
from ...models.ui_baseline import UIBaseline
from ...models.ui_report import UIReport


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
        args = request.args
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        baseline = UIBaseline.query.filter_by(project_id=project.id, test=args.get("test_name"),
                                              environment=args.get("env")).first()
        report_id = baseline.report_id if baseline else 0
        return {"baseline_id": report_id}

    def post(self, project_id: int):
        args = request.json
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        report_id = int(args.get("report_id"))
        report = UIReport.query.filter_by(project_id=project.id, id=report_id).first().to_json()
        baseline = UIBaseline.query.filter_by(project_id=project.id, test=report["name"],
                                              environment=report["environment"]).first()
        if baseline:
            baseline.delete()
        baseline = UIBaseline(test=report["name"],
                              environment=report["environment"],
                              project_id=project.id,
                              report_id=report["uid"])
        baseline.insert()
        return {"message": "baseline is set"}
