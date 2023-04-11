from flask_restful import Resource
from pylon.core.tools import log
from flask import request


class API(Resource):
    url_params = [
        '<int:project_id>',
    ]

    def __init__(self, module):
        self.module = module

    def post(self, project_id: int):
        self.module.context.rpc_manager.call.project_get_or_404(project_id=project_id)
        report_ids = request.json['ids']

        return self.module.get_builder_data(project_id, report_ids), 200
