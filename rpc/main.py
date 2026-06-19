from datetime import datetime
from json import loads
from typing import Optional, Union

from pydantic import ValidationError
from pylon.core.tools import web, log
from sqlalchemy import desc

from tools import rpc_tools, MinioClient
from ..models.pd.quality_gate import QualityGate
from ..models.pd.report import ReportGetModel
from ..models.pd.test_parameters import UITestParamsCreate, UITestParamsRun, UITestParams
from ..models.pd.ui_test import TestOverrideable, TestCommon
from ..models.ui_report import UIReport
from ..models.ui_tests import UIPerformanceTest
from ..utils.utils import run_test


class RPC:
    @web.rpc('ui_results_or_404', 'results_or_404')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def ui_results_or_404(self, run_id, report=None) -> dict:
        if not report:
            report = UIReport.query.get_or_404(run_id)
        bucket = report.name.replace("_", "").lower()
        file_name = f"{report.uid}.csv.gz"
        s3_settings = report.test_config.get(
            'integrations', {}).get('system', {}).get('s3_integration', {})
        avg_page_load = 0
        thresholds_missed = 0
        try:
            results = self.get_ui_results(bucket=bucket, file_name=file_name, 
                                          project_id=report.project_id, **s3_settings)
            totals = list(map(lambda x: int(x["load_time"]), results))
            try:
                avg_page_load = round(sum(totals) / len(totals) / 1000, 2)
            except ZeroDivisionError:
                avg_page_load = 0

            try:
                thresholds_missed = round(report.thresholds_failed / report.thresholds_total * 100, 2)
            except ZeroDivisionError:
                thresholds_missed = 0
        except:
            totals = []

        pd_obj = ReportGetModel.from_orm(report)
        pd_obj.totals = totals
        data = pd_obj.validate(pd_obj).dict(exclude={'totals'}, by_alias=True)
        data["avg_page_load"] = avg_page_load
        data["thresholds_missed"] = thresholds_missed
        data["total_pages"] = len(totals)
        return data

    @web.rpc('ui_performance_job_type_by_uid')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def job_type_by_uid(self, project_id: int, test_uid: str) -> Optional[str]:
        test = UIPerformanceTest.query.filter(
            UIPerformanceTest.get_api_filter(project_id, test_uid)
        ).first()
        if test:
            return test.job_type

    @web.rpc(f'ui_performance_test_create_integration_validate_quality_gate')
    @rpc_tools.wrap_exceptions(ValidationError)
    def ui_performance_test_create_integration_validate(self, data: dict, pd_kwargs: Optional[dict] = None, **kwargs) -> dict:
        if not pd_kwargs:
            pd_kwargs = {}
        pd_object = QualityGate(**data)
        return pd_object.dict(**pd_kwargs)

    @web.rpc('ui_performance_execution_json_config_quality_gate')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def make_execution_json_config(self, integration_data: dict) -> dict:
        """ Prepare execution_json for this integration """
        # no extra data to add to execution json
        # but rpc needs to exist
        return integration_data

    @web.rpc('ui_performance_evaluate_quality_gate')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def evaluate_quality_gate(self, project_id: int, report_id: int, quality_gate_config: dict) -> dict:
        """
        Evaluate Quality Gate criteria for a test report.

        Args:
            project_id: Project ID
            report_id: Current test report ID
            quality_gate_config: Quality Gate configuration dict

        Returns:
            dict: Evaluation result with pass/fail status and details
        """
        from ..models.ui_baseline import UIBaseline

        # Load current report
        report = UIReport.query.get(report_id)
        if not report:
            raise RuntimeError(f"Report {report_id} not found")

        result = {
            "passed": True,
            "failed_criteria": [],
            "details": {}
        }

        # Evaluate missed_thresholds
        if quality_gate_config.get("missed_thresholds", -1) != -1:
            threshold = quality_gate_config["missed_thresholds"]
            try:
                actual = round(report.thresholds_failed / report.thresholds_total * 100, 2)
            except ZeroDivisionError:
                actual = 0

            passed = actual <= threshold
            result["details"]["missed_thresholds"] = {
                "passed": passed,
                "configured": True,
                "value": actual,
                "threshold": threshold
            }
            if not passed:
                result["passed"] = False
                result["failed_criteria"].append("missed_thresholds")
        else:
            result["details"]["missed_thresholds"] = {"configured": False, "passed": True}

        # Evaluate baseline_deviation
        if quality_gate_config.get("baseline_deviation", -1) != -1:
            threshold = quality_gate_config["baseline_deviation"]

            # Fetch baseline
            baseline = UIBaseline.query.filter_by(
                project_id=project_id,
                test=report.name,
                environment=report.environment
            ).first()

            if baseline:
                baseline_report = UIReport.query.get(baseline.report_id)
                if baseline_report:
                    comparison_result = self._compare_with_baseline(
                        report, baseline_report, threshold
                    )
                    result["details"]["baseline_deviation"] = comparison_result
                    if not comparison_result["passed"]:
                        result["passed"] = False
                        result["failed_criteria"].append("baseline_deviation")
                else:
                    # Baseline report not found
                    log.warning(f"Baseline report {baseline.report_id} not found for test '{report.name}' in '{report.environment}'")
                    result["details"]["baseline_deviation"] = {
                        "passed": True,
                        "configured": True,
                        "baseline_available": False,
                        "metrics_failed": [],
                        "metrics_checked": [],
                        "threshold": threshold,
                        "max_deviation": None
                    }
            else:
                # No baseline available - pass with warning
                log.warning(f"Baseline deviation check skipped - no baseline for test '{report.name}' in '{report.environment}'")
                result["details"]["baseline_deviation"] = {
                    "passed": True,
                    "configured": True,
                    "baseline_available": False,
                    "metrics_failed": [],
                    "metrics_checked": [],
                    "threshold": threshold,
                    "max_deviation": None
                }
        else:
            result["details"]["baseline_deviation"] = {"configured": False, "passed": True}

        # Deviation check (placeholder - not computed yet in current implementation)
        if quality_gate_config.get("deviation", -1) != -1:
            result["details"]["deviation"] = {
                "passed": True,
                "configured": True,
                "value": None,  # Not yet implemented
                "threshold": quality_gate_config["deviation"]
            }
        else:
            result["details"]["deviation"] = {"configured": False, "passed": True}

        return result

    def _compare_with_baseline(self, current_report, baseline_report, threshold):
        """Compare current report metrics against baseline."""
        METRICS = [
            'load_time', 'dom_processing', 'time_to_interactive',
            'first_contentful_paint', 'largest_contentful_paint',
            'total_blocking_time',
            'first_visual_change', 'last_visual_change'
        ]

        failed_metrics = []
        max_deviation = 0

        # Extract metrics from reports
        current_metrics = self._extract_metrics(current_report)
        baseline_metrics = self._extract_metrics(baseline_report)

        for metric in METRICS:
            current_val = current_metrics.get(metric)
            baseline_val = baseline_metrics.get(metric)

            if current_val is None or baseline_val is None or baseline_val == 0:
                continue

            deviation_pct = ((current_val - baseline_val) / baseline_val) * 100

            if deviation_pct > threshold:
                failed_metrics.append(metric)
                max_deviation = max(max_deviation, deviation_pct)

        return {
            "passed": len(failed_metrics) == 0,
            "configured": True,
            "baseline_available": True,
            "metrics_failed": failed_metrics,
            "metrics_checked": METRICS,
            "threshold": threshold,
            "max_deviation": round(max_deviation, 2) if max_deviation > 0 else None
        }

    def _extract_metrics(self, report):
        """Extract aggregated metrics from report."""
        metrics = {}

        # Metric columns are JSON - extract aggregated value
        # The JSON typically contains aggregated metrics based on report.aggregation
        metric_columns = [
            'load_time', 'dom_processing', 'time_to_interactive',
            'first_contentful_paint', 'largest_contentful_paint',
            'total_blocking_time',
            'first_visual_change', 'last_visual_change'
        ]

        for metric_name in metric_columns:
            metric_value = getattr(report, metric_name, None)
            if metric_value is not None and isinstance(metric_value, dict):
                # Extract the aggregated value based on aggregation method
                # Common keys: 'avg', 'max', 'min', 'pct95', 'pct50'
                aggregation = report.aggregation or 'avg'
                metrics[metric_name] = metric_value.get(aggregation, metric_value.get('avg', 0))
            elif metric_value is not None:
                # If it's a direct value
                metrics[metric_name] = metric_value

        return metrics

    @web.rpc('ui_performance_test_create_common_parameters', 'parse_common_test_parameters')
    def parse_common_test_parameters(self, project_id: int, test_params: dict, **kwargs) -> dict:
        overrideable_only = kwargs.pop('overrideable_only', False)
        if overrideable_only:
            pd_object = TestOverrideable(
                **test_params
            )
        else:
            pd_object = TestCommon(
                project_id=project_id,
                **test_params
            )
        return pd_object.dict(**kwargs)

    @web.rpc('ui_performance_test_create_test_parameters', 'parse_test_parameters')
    @rpc_tools.wrap_exceptions(ValidationError)
    def parse_test_parameters(self, data: Union[list, dict], **kwargs) -> dict:
        purpose = kwargs.pop('purpose', None)
        if purpose == 'run':
            pd_object = UITestParamsRun(test_parameters=data)
        elif purpose == 'control_tower':
            pd_object = UITestParamsCreate.from_control_tower(data)
        else:
            pd_object = UITestParamsCreate(test_parameters=data)
        return pd_object.dict(**kwargs)

    @web.rpc('ui_performance_run_scheduled_test', 'run_scheduled_test')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def run_scheduled_test(self, test_id: int, test_params: list, run=True) -> dict:
        test = UIPerformanceTest.query.filter(UIPerformanceTest.id == test_id).one()
        test_params_schedule_pd = UITestParams(test_parameters=test_params)
        test_params_existing_pd = UITestParams.from_orm(test)
        test_params_existing_pd.update(test_params_schedule_pd)
        test.__dict__.update(test_params_existing_pd.dict())
        if run:
            return run_test(test)
        else:
            return {}

    @web.rpc('get_ui_results', 'get_ui_results')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_ui_results(self, 
                       bucket: str, 
                       file_name: str, 
                       project_id: int, 
                       skip_aggregated: bool = True,
                       client: MinioClient = None,
                       integration_id: int = None,
                       is_local: bool=True
                       ) -> list:
        if skip_aggregated:
            query = " where s.loop != 0"
        else:
            query = ""
        if not client:
            client = MinioClient.from_project_id(project_id, integration_id, is_local)
        return client.select_object_content(bucket, file_name, query)

    @web.rpc('ui_performance_get_tests')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_tests(self, project_id: int) -> list[UIPerformanceTest]:
        """ Gets all created tests """
        return UIPerformanceTest.query.filter_by(project_id=project_id).all()

    @web.rpc('ui_performance_get_reports')
    @rpc_tools.wrap_exceptions(RuntimeError)
    def get_reports(
            self, project_id: int,
            start_time: datetime | None = None,
            end_time: datetime | None = None,
            unique: bool = False
    ) -> list[UIReport]:
        """ Gets all UI reports filtered by time"""

        def _get_unique_reports(objects: list[UIReport]) -> list[UIReport]:
            unique_combinations = {}
            for obj in objects:
                combination = (obj.test_uid, obj.environment, obj.test_type)
                stored_obj = unique_combinations.get(combination)
                if stored_obj is None or obj.start_time > stored_obj.start_time:
                    unique_combinations[combination] = obj

            return list(unique_combinations.values())

        query = UIReport.query.filter(
            UIReport.project_id == project_id,
        ).order_by(
            desc(UIReport.start_time)
        )

        if start_time:
            query = query.filter(UIReport.start_time >= start_time.isoformat())

        if end_time:
            query = query.filter(UIReport.end_time <= end_time.isoformat())

        reports = query.all()
        if unique:
            reports = _get_unique_reports(reports)

        return reports
