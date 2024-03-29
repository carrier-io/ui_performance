from flask import request
from flask_restful import Resource
from sqlalchemy import and_
from tools import auth
from ...models.ui_report import UIReport


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
        query_result = UIReport.query.with_entities(UIReport.environment).filter(
            UIReport.name == request.args.get("name"),
            UIReport.project_id == project.id
        ).distinct(UIReport.environment).all()
        return [i[0] for i in query_result], 200
