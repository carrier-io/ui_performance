from flask_restful import Resource
from datetime import datetime
from pylon.core.tools import log
from sqlalchemy import and_
from tools import auth
from ...models.ui_report import UIReport


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
        s3_settings = report.test_config.get(
            'integrations', {}).get('system', {}).get('s3_integration', {})
        results = self.module.get_ui_results(bucket=bucket, file_name=file_name, 
                                             project_id=project_id, **s3_settings)
        data = []
        names = []
        for each in results:
            if f"{each['name']}_{each['type']}" not in names:
                names.append(f"{each['name']}_{each['type']}")
                data.append({
                    "name": each['name'],
                    "type": each['type'],
                    "labels": [],
                    "datasets": {
                        "load_time": [],
                        "dom": [],
                        "tti": [],
                        "fcp": [],
                        "lcp": [],
                        "cls": [],
                        "tbt": [],
                        "fvc": [],
                        "lvc": []
                    }
                })
        for page in data:
            for each in results:
                if each["name"] == page["name"]:
                    page["labels"].append(
                        datetime.strptime(each["timestamp"].replace("+00:00", ""),
                                          "%Y-%m-%dT%H:%M:%S").strftime("%Y-%m-%d %H:%M:%S"))
                    for metric in ["load_time", "dom", "tti", "fcp", "lcp", "cls", "tbt",
                                   "fvc", "lvc"]:
                        page["datasets"][metric].append(each[metric])

        return data, 200
