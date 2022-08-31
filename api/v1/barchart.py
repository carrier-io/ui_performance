from flask_restful import Resource
from pylon.core.tools import log
from sqlalchemy import and_
from ...models.ui_report import UIReport
from ...models.ui_result import UIResult


class API(Resource):
    url_params = [
        '<int:project_id>/<string:report_id>',
        '<int:project_id>/<int:report_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int, report_id):
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        report = UIReport.query.filter(and_(UIReport.project_id == project.id, UIReport.id == report_id)).first()
        results = UIResult.query.filter(
            and_(UIResult.project_id == project.id, UIResult.report_uid == report.uid)).all()
        data = []
        for each in results:
            data.append({
                "name": each.name,
                "type": each.type,
                "load_time": each.total,
                "dom": each.dom_processing,
                "tti": each.tti,
                "fcp": each.fcp,
                "lcp": each.lcp,
                "cls": each.cls,
                "tbt": each.tbt,
                "fvc": each.fvc,
                "lvc": each.lvc
            })

        return data, 200
