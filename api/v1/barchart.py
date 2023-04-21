from flask_restful import Resource
from pylon.core.tools import log
from sqlalchemy import and_
from ...models.ui_report import UIReport
from tools import auth


class API(Resource):
    url_params = [
        '<int:project_id>/<string:report_id>',
        '<int:project_id>/<int:report_id>',
    ]

    def __init__(self, module):
        self.module = module

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.reports.view"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
            "administration": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def get(self, project_id: int, report_id):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        report = UIReport.query.filter(
            and_(UIReport.project_id == project.id, UIReport.id == report_id)).first()
        bucket = report.name.replace("_", "").lower()
        file_name = f"{report.uid}.csv.gz"
        results = self.module.get_ui_results(bucket, file_name, project_id)
        data = []
        names = []
        for each in results:
            if f"{each['name']}_{each['type']}" not in names:
                names.append(f"{each['name']}_{each['type']}")
                data.append({
                    "name": each['name'],
                    "type": each['type'],
                    "loops": {}
                })

        for page in data:
            for each in results:
                if each["name"] == page["name"]:
                    page["loops"][f"{each['loop']}"] = {
                        "load_time": each["load_time"],
                        "dom": each["dom"],
                        "tti": each["tti"],
                        "fcp": each["fcp"],
                        "lcp": each["lcp"],
                        "cls": each["cls"],
                        "tbt": each["tbt"],
                        "fvc": each["fvc"],
                        "lvc": each["lvc"]
                    }
        return data, 200
