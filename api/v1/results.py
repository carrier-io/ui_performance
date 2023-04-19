from flask_restful import Resource
from pylon.core.tools import log
from ...models.ui_report import UIReport
from tools import api_tools, auth


class API(Resource):
    url_params = [
        '<int:project_id>/<string:report_id>',
    ]

    def __init__(self, module):
        self.module = module

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.results.view"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def get(self, project_id: int, report_id: str):
        report = UIReport.query.filter_by(project_id=project_id,
                                          uid=report_id).first().to_json()
        bucket = report["name"].replace("_", "").lower()
        file_name = f"{report_id}.csv.gz"
        results = self.module.get_ui_results(bucket, file_name, project_id)

        response = []
        for res in results:
            res[
                "report"] = f"{api_tools.build_api_url('artifacts', 'artifact', mode='default')}/{project_id}/reports/{res['file_name']}",
            response.append(res)
        return response

    # def post(self, project_id: int, report_id: str):
    #     args = request.json
    #
    #     metrics = args["metrics"]
    #
    #     result = UIResult.query.filter_by(project_id=project_id, identifier=args['identifier']).first()
    #
    #     name = args.get("name")
    #     if result:
    #         name = result.name
    #
    #     result = UIResult(
    #         project_id=project_id,
    #         report_uid=report_id,
    #         name=name,
    #         timestamp=metrics["timestamps"],
    #         loop=args["loop"],
    #         identifier=args['identifier'],
    #         session_id=args['session_id'],
    #         type=args["type"],
    #         bucket_name=args["bucket_name"],
    #         file_name=args["file_name"],
    #         thresholds_total=args["thresholds_total"],
    #         thresholds_failed=args["thresholds_failed"],
    #         requests=metrics["requests"],
    #         domains=metrics["domains"],
    #         total=metrics["total"],
    #         speed_index=metrics["speed_index"],
    #         time_to_first_byte=metrics["time_to_first_byte"],
    #         time_to_first_paint=metrics["time_to_first_paint"],
    #         dom_content_loading=metrics["dom_content_loading"],
    #         dom_processing=metrics["dom_processing"],
    #         locators=args["locators"],
    #         resolution=args["resolution"],
    #         browser_version=args["browser_version"],
    #         fcp=metrics["first_contentful_paint"],
    #         lcp=metrics["largest_contentful_paint"],
    #         cls=metrics["cumulative_layout_shift"],
    #         tbt=metrics["total_blocking_time"],
    #         fvc=metrics["first_visual_change"],
    #         lvc=metrics["last_visual_change"],
    #         tti=metrics["time_to_interactive"]
    #     )
    #
    #     result.insert()
    #     return result.to_json()

    # def put(self, project_id: int, report_id: int):
    #     args = request.json
    #     results = UIResult.query.filter_by(project_id=project_id, id=report_id).first_or_404()
    #     locators = args["locators"]
    #     results.locators = locators
    #
    #     results.commit()
    #
    #     return results.to_json()
