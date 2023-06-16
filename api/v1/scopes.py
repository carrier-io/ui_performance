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
        _scopes = set()
        bucket = request.args['name'].replace("_", "").lower()
        integrations_args = self._get_s3_inregrations_args(project_id)
        for integration_args in integrations_args:
            try:
                client = MinioClient.from_project_id(project_id, **integration_args)
                files = client.list_files(bucket)
            except Exception:
                files = []
            for each in files:
                if ".csv.gz" in each["name"]:
                    results = self.module.get_ui_results(bucket, each["name"], project_id, 
                                                         client, **integration_args)
                    for page in results:
                        _scopes.add(
                            dumps({"name": page["name"], "identifier": page["identifier"]}))

        scopes = []
        for each in _scopes:
            scopes.append(loads(each))
        return scopes, 200

    def _get_s3_inregrations_args(self, project_id):
        integrations_args = []
        integrations = self.module.context.rpc_manager.call.integrations_get_all_integrations_by_name(
            project_id, 's3_integration')
        for integration in integrations:
            integrations_args.append({'integration_id': integration.id, 
                                      'is_local': bool(integration.project_id)
                                      })
        return integrations_args
