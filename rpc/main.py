from typing import Optional
from uuid import uuid4

from tools import rpc_tools
from pylon.core.tools import web

from ..models.ui_report import UIReport
from ..models.ui_result import UIResult
from ..models.ui_tests import UIPerformanceTests


class RPC:
    @web.rpc('ui_results_or_404')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def ui_results_or_404(self, run_id, report=None):
        if not report:
            report = UIReport.query.get_or_404(run_id)
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

        data = dict(id=report.id, uid=report.uid, project_id=report.project_id, name=report.name,
                    browser=report.browser, test_type=report.test_type, env_type=report.environment,
                    browser_version=report.browser_version, resolution="1380x749", total_pages=len(totals),
                    end_time=report.stop_time, start_time=report.start_time, duration=report.duration,
                    failures=thresholds_missed, thresholds_missed=thresholds_missed, aggregation=report.aggregation,
                    avg_page_load=round(avg_page_load / 1000, 2), tags=[], loops=report.loops,
                    avg_step_duration=0.5, build_id=str(uuid4()), release_id=1, test_status=report.test_status)
        return data

    @web.rpc('ui_performance_job_type_by_uid')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def job_type_by_uid(self, project_id: int, test_uid: str) -> Optional[str]:
        test = UIPerformanceTests.query.filter(
                UIPerformanceTests.get_api_filter(project_id, test_uid)
        ).first()
        if test:
            return test.job_type
