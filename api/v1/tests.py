from sqlalchemy import and_
from uuid import uuid4
from json import loads

from flask_restful import Resource
from flask import request, make_response

from tools import api_tools
from ...models.ui_tests import UIPerformanceTests
from tools import constants as c


class API(Resource):

    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
        reports = []
        total, res = api_tools.get(project_id, request.args, UIPerformanceTests)
        for each in res:
            reports.append(each.to_json())
        return make_response(
            {"total": total, "rows": reports},
            200
        )

    def delete(self, project_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)

        try:
            delete_ids = list(map(int, request.args["id[]"].split(',')))
        except TypeError:
            return make_response('IDs must be integers', 400)
        query_result = UIPerformanceTests.query.filter(
            and_(UIPerformanceTests.project_id == project.id, UIPerformanceTests.id.in_(delete_ids))
        ).all()
        for each in query_result:
            each.delete()
        return make_response({'ids': delete_ids}, 200)

    def post(self, project_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        from pylon.core.tools import log
        args = request.form

        browser = args["browser"] if args.get("browser") not in ["Nothing selected", ""] else "Chrome_undefined"
        if args["runner"] == "Observer":
            runner = f"getcarrier/observer:{c.CURRENT_RELEASE}"
        elif args["runner"] == "Lighthouse":
            runner = f"getcarrier/observer-lighthouse:{c.CURRENT_RELEASE}"
        elif args["runner"] == "Lighthouse-Nodejs":
            runner = f"getcarrier/observer-lighthouse-nodejs:{c.CURRENT_RELEASE}"
        else:
            runner = f"getcarrier/observer-browsertime:{c.CURRENT_RELEASE}"
        job_type = "observer"

        if args.get("git"):
            file_name = ""
            bucket = ""
            git_settings = loads(args["git"])
        else:
            git_settings = {}
            file_name = args["file"].filename
            bucket = "tests"
            api_tools.upload_file(bucket, args["file"], project, create_if_not_exists=True)

        env_vars = loads(args["env_vars"])
        if "ENV" not in env_vars.keys():
            env_vars['ENV'] = 'Default'
        if args.get("region") == "":
            args["region"] = "default"

        test = UIPerformanceTests(project_id=project.id,
                                  test_uid=str(uuid4()),
                                  name=args["name"],
                                  bucket=bucket,
                                  file=file_name,
                                  entrypoint=args["entrypoint"],
                                  runner=runner,
                                  browser=browser,
                                  git=git_settings,
                                  parallel=1,
                                  reporting=args["reporter"].split(","),
                                  params=loads(args["params"]),
                                  env_vars=env_vars,
                                  customization=loads(args["customization"]),
                                  cc_env_vars=loads(args["cc_env_vars"]),
                                  job_type=job_type,
                                  loops=args['loops'],
                                  region=args['region'],
                                  aggregation=args['aggregation'])
        test.insert()
        log.info(test.to_json())
        return test.to_json(exclude_fields=("id",))
