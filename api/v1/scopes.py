from flask import request
from json import dumps, loads
from flask_restful import Resource
from pylon.core.tools import log
from tools import auth
from ....shared.tools.minio_client import MinioClient


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.thresholds.create"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
            "administration": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def get(self, project_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        _scopes = set()
        client = MinioClient(project=project)
        bucket = request.args['name'].replace("_", "").lower()
        files = client.list_files(bucket)
        for each in files:
            if ".csv.gz" in each["name"]:
                log.info(each["name"])
                results = self.module.get_ui_results(bucket, each["name"], project_id)
                for page in results:
                    _scopes.add(
                        dumps({"name": page["name"], "identifier": page["identifier"]}))

        scopes = []
        for each in _scopes:
            scopes.append(loads(each))
        return scopes, 200
