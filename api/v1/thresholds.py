from sqlalchemy import and_
from flask import request
from flask_restful import Resource

from pydantic import ValidationError

from ...models.thresholds import UIThresholds
from ...models.pd.thresholds import ThresholdPD

from tools import api_tools, auth


class API(Resource):
    url_params = [
        '<int:project_id>',
        '<int:project_id>/<int:threshold_id>',
    ]

    def __init__(self, module):
        self.module = module

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.thresholds.view"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": True},
            "administration": {"admin": True, "editor": True, "viewer": True},
        }
    })
    def get(self, project_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        if request.args.get("test") and request.args.get("env"):
            res = UIThresholds.query.filter(and_(
                UIThresholds.project_id == project.id,
                UIThresholds.test == request.args.get("test"),
                UIThresholds.environment == request.args.get("env")
            )).all()
            return [th.to_json() for th in res], 200
        total, res = api_tools.get(project_id, request.args, UIThresholds)
        return {'total': total, 'rows': [i.to_json() for i in res]}, 200

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.thresholds.edit"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
            "administration": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def post(self, project_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        try:
            pd_obj = ThresholdPD(project_id=project.id, **request.json)
        except ValidationError as e:
            return e.errors(), 400
        th = UIThresholds(**pd_obj.dict())
        th.insert()
        return th.to_json(), 201

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.thresholds.delete"],
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
            return 'IDs must be integers', 400

        filter_ = and_(
            UIThresholds.project_id == project.id,
            UIThresholds.id.in_(delete_ids)
        )
        UIThresholds.query.filter(
            filter_
        ).delete()
        UIThresholds.commit()
        return {'ids': delete_ids}, 204

    @auth.decorators.check_api({
        "permissions": ["performance.ui_performance.thresholds.edit"],
        "recommended_roles": {
            "default": {"admin": True, "editor": True, "viewer": False},
            "administration": {"admin": True, "editor": True, "viewer": False},
        }
    })
    def put(self, project_id: int, threshold_id: int):
        project = self.module.context.rpc_manager.call.project_get_or_404(
            project_id=project_id)
        try:
            pd_obj = ThresholdPD(project_id=project.id, **request.json)
        except ValidationError as e:
            return e.errors(), 400
        th_query = UIThresholds.query.filter(
            UIThresholds.project_id == project.id,
            UIThresholds.id == threshold_id
        )
        th_query.update(pd_obj.dict())
        UIThresholds.commit()
        return th_query.one().to_json(), 200
