from traceback import format_exc
import math
from flask_restful import Resource
from pylon.core.tools import log
from flask import request, make_response

from ...models.pd.test_parameters import UITestParamsRun
from ...models.ui_report import UIReport
from tools import MinioClient, api_tools, auth
from datetime import datetime

from ...models.ui_tests import UIPerformanceTest


class API(Resource):
    url_params = [
        '<int:project_id>',
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
    def get(self, project_id: int):
        args = request.args
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        if args.get("report_id"):
            try:
                report_id = int(args.get("report_id"))
                return UIReport.query.filter_by(project_id=project.id,
                                                id=report_id).first().to_json()
            except ValueError:
                return UIReport.query.filter_by(project_id=project.id,
                                                uid=args.get("report_id")).first().to_json()
        if args.get("name") and args.get("count"):
            reports = UIReport.query.filter_by(project_id=project.id,
                                               name=args['name']).order_by(
                UIReport.id.desc()).limit(args['count'])
            _reports = []
            for each in reports:
                _reports.append(each.to_json())
            return _reports
        total, res = api_tools.get(project.id, args, UIReport)
        reports = [i.to_json() for i in res]
        return {"total": total, "rows": reports}

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.reports.create"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
            "administration": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def post(self, project_id: int):
        args = request.json

        report = UIReport.query.filter_by(uid=args['report_id']).first()

        if report:
            return report.to_json()

        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)

        test_config = None
        if 'test_params' in args:
            try:
                test = UIPerformanceTest.query.filter(
                    UIPerformanceTest.test_uid == args.get('test_id')  # todo: no test_uid
                ).first()
                # test._session.expunge(test) # maybe we'll need to detach object from orm
                test.__dict__['test_parameters'] = test.filtered_test_parameters_unsecret(
                    UITestParamsRun.from_control_tower_cmd(
                        args['test_params']
                    ).dict()['test_parameters']
                )
            except Exception as e:
                log.error('Error parsing params from control tower %s', format_exc())
                return f'Error parsing params from control tower: {e}', 400

        report = UIReport(
            uid=args['report_id'],
            name=args["test_name"],
            project_id=project.id,
            start_time=args["time"],
            is_active=True,
            browser=args["browser_name"],
            browser_version=args["browser_version"],
            environment=args["env"],
            loops=args["loops"],
            aggregation=args["aggregation"]
        )
        if test_config:
            report.test_config = test_config
        report.insert()

        self.module.context.rpc_manager.call.increment_statistics(project_id,
                                                                  'ui_performance_test_runs')
        return report.to_json()

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.reports.edit"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
            "administration": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def put(self, project_id: int):
        args = request.json
        report = UIReport.query.filter_by(project_id=project_id,
                                          uid=args['report_id']).first_or_404()
        report.is_active = False
        report.end_time = datetime.strptime(args["time"], '%Y-%m-%d %H:%M:%S')
        report.test_status = args["status"]
        report.thresholds_total = args["thresholds_total"],
        report.thresholds_failed = args["thresholds_failed"]

        results_json = {"first_contentful_paint": {}, "largest_contentful_paint": {},
                        "first_visual_change": {},
                        "last_visual_change": {}, "load_time": {}, "time_to_first_paint": {},
                        "time_to_first_byte": {},
                        "dom_content_loading": {}, "dom_processing": {},
                        "time_to_interactive": {},
                        "total_blocking_time": {}}
        if "results" in args.keys():
            for each in results_json.keys():
                results_json[each]["mean"] = self.get_aggregated_value("avg",
                                                                       args["results"][each])
                results_json[each]["min"] = self.get_aggregated_value("min",
                                                                      args["results"][each])
                results_json[each]["max"] = self.get_aggregated_value("max",
                                                                      args["results"][each])
                results_json[each]["pct50"] = self.get_aggregated_value("pct50",
                                                                        args["results"][each])
                results_json[each]["pct75"] = self.get_aggregated_value("pct75",
                                                                        args["results"][each])
                results_json[each]["pct90"] = self.get_aggregated_value("pct90",
                                                                        args["results"][each])
                results_json[each]["pct95"] = self.get_aggregated_value("pct95",
                                                                        args["results"][each])
                results_json[each]["pct99"] = self.get_aggregated_value("pct99",
                                                                        args["results"][each])
                setattr(report, each, results_json[each])

        report.duration = (report.end_time - report.start_time).total_seconds()
        exception = args.get("exception")
        if exception:
            report.exception = exception
            report.passed = False

        report.commit()
        if args["status"]['percentage'] == 100:
            self.sio.emit('ui_test_finished', report.to_json())
        return report.to_json(), 200

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.reports.delete"],
        "recommended_roles": {
            "default": {"admin": True, "editor": False, "viewer": False},
            "administration": {"admin": True, "editor": False, "viewer": False},
        }
    })
    def delete(self, project_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        try:
            delete_ids = list(map(int, request.args["id[]"].split(',')))
        except TypeError:
            return make_response('IDs must be integers', 400)
        UIReport.query.filter(
            UIReport.project_id == project.id,
            UIReport.id.in_(delete_ids)
        ).delete()
        UIReport.commit()
        return {"message": "deleted"}, 204

    def get_aggregated_value(self, aggregation, metrics):
        if len(metrics) == 0:
            return 0
        if aggregation == 'max':
            return max(metrics)
        elif aggregation == 'min':
            return min(metrics)
        elif aggregation == 'avg':
            return int(sum(metrics) / len(metrics))
        elif aggregation == 'pct95':
            return self.percentile(metrics, 95)
        elif aggregation == 'pct75':
            return self.percentile(metrics, 75)
        elif aggregation == 'pct90':
            return self.percentile(metrics, 90)
        elif aggregation == 'pct99':
            return self.percentile(metrics, 99)
        elif aggregation == 'pct50':
            return self.percentile(metrics, 50)
        else:
            raise Exception(f"No such aggregation {aggregation}")

    def percentile(self, data, percentile):
        size = len(data)
        if size:
            return sorted(data)[int(math.ceil((size * percentile) / 100)) - 1]
        else:
            return 0
