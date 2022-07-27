from flask_restful import Resource
from pylon.core.tools import log
from flask import current_app, request, make_response
from ...models.ui_report import UIReport
from ...models.ui_result import UIResult
from tools import api_tools
from uuid import uuid4


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def __calcualte_limit(self, limit, total):
        return len(total) if limit == 'All' else limit

    def get(self, project_id: int):
        args = request.args
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        total, reports = api_tools.get(project_id, args, UIReport)

        res = []

        for report in reports:
            results = UIResult.query.filter_by(report_uid=report.uid).all()

            totals = list(map(lambda x: x.total, results))

            try:
                avg_page_load = sum(totals) / len(totals)
            except ZeroDivisionError:
                avg_page_load = 0

            try:
                thresholds_missed = round(report.thresholds_failed / report.thresholds_total * 100, 2)
            except ZeroDivisionError:
                thresholds_missed = 0

            data = dict(id=report.id, project_id=project.id, name=report.name, environment=report.environment,
                        browser=report.browser, test_type=report.test_type,
                        browser_version=report.browser_version, resolution="1380x749",
                        end_time=report.stop_time, start_time=report.start_time, duration=report.duration,
                        failures=thresholds_missed,
                        thresholds_missed=thresholds_missed,
                        avg_page_load=round(avg_page_load / 1000, 2),
                        avg_step_duration=0.5, build_id=str(uuid4()), release_id=1, test_status=report.test_status)
            res.append(data)

        for each in res:
            each["start_time"] = each["start_time"].replace("T", " ").replace("Z", "")
        return {"total": total, "rows": res}

    def delete(self, project_id: int):
        args = request.args
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        query_result = UIReport.query.filter(
            and_(UIReport.project_id == project.id, UIReport.id.in_(args["id[]"]))
        ).all()

        for each in query_result:
            self.__delete_report_results(project_id, each.uid)
            each.delete()
        return {"message": "deleted"}

    def __delete_report_results(self, project_id, report_id):
        results = UIResult.query.filter_by(project_id=project_id, report_uid=report_id).all()
        for result in results:
            result.delete()