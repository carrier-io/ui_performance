from flask_restful import Resource
from flask import request
from ...models.ui_baseline import UIBaseline
from ...models.ui_report import UIReport
from tools import auth


class API(Resource):
    url_params = [
        '<int:project_id>',
        '<int:project_id>/<int:report_id>',
    ]

    def __init__(self, module):
        self.module = module

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.baseline.view"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
            "administration": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def get(self, project_id: int):
        args = request.args
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        baseline = UIBaseline.query.filter_by(project_id=project.id,
                                              test=args.get("test_name"),
                                              environment=args.get("env")).first()
        report_id = baseline.report_uid if baseline else ""
        return {"baseline_id": report_id}

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.baseline.create"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
            "administration": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def post(self, project_id: int):
        try:
            report_id = int(request.json['report_id'])
        except (KeyError, ValueError):
            return 'report_id must be provided', 400
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
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
        added_tag = report.add_tags([{'title': 'Baseline', 'hex': 'f54290'}])
        if added_tag:
            other_reports = UIReport.query.filter(
                UIReport.project_id == project.id,
                UIReport.name == report.name,
                UIReport.environment == report.environment,
                UIReport.id != report_id
            ).all()
            for other_report in other_reports:
                if other_report.is_baseline_report:
                    other_report.delete_tags(['Baseline'])
        return baseline.to_json(), 200

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.baseline.delete"],
        "recommended_roles": {
            "default": {"admin": True, "editor": False, "viewer": False},
            "administration": {"admin": True, "editor": False, "viewer": False},
        }
    })
    def delete(self, project_id: int, report_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        report: UIReport = UIReport.query.filter(
            UIReport.project_id == project.id,
            UIReport.id == report_id
        ).first()
        if not report:
            return 'Not found', 404
        UIBaseline.query.filter(
            UIBaseline.project_id == project.id,
            UIBaseline.test == report.name,
            UIBaseline.environment == report.environment
        ).delete()
        report.delete_tags(['Baseline'])
        return {"message": "baseline was deleted"}, 204
