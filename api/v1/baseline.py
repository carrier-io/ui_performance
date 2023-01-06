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
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        baseline = UIBaseline.query.filter(
            UIBaseline.project_id == project.id,
            UIBaseline.test == request.args.get("test_name"),
            UIBaseline.environment == request.args.get("env")
        ).first()
        try:
            return {"baseline": baseline.summary, "report_id": baseline.report_id}, 200
        except AttributeError:
            return 'Baseline not found', 404


    def post(self, project_id: int):
        try:
            report_id = int(request.json['report_id'])
        except (KeyError, ValueError):
            return 'report_id must be provided', 400
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        report: UIReport = UIReport.query.filter(
            UIReport.project_id == project.id,
            UIReport.id == report_id
        ).first()
        if not report:
            return 'Not found', 404
        baseline = UIBaseline(
            test=report.name,
            environment=report.environment,
            project_id=project.id,
            report_uid=report.uid,
            report_id=report.id,
        )
        baseline.insert()
        return baseline.to_json(), 200
