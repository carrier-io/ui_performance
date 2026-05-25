from typing import Optional
from flask import request
from flask_restful import Resource

from ...models.ui_report import UIReport
from pylon.core.tools import log
from tools import db


class API(Resource):
    url_params = [
        '<int:project_id>',
        '<int:project_id>/<int:report_id>',
    ]
    SERVICE_TAGS = ('baseline',)

    def __init__(self, module):
        self.module = module

    def get(self, project_id: int):
        """Get available tags, optionally filtered by report IDs"""
        try:
            report_ids = request.args.getlist('report_id[]')
            log.info(f"Fetching tags for project {project_id}, report_ids: {report_ids}")

            with db.with_project_schema_session(project_id):
                if not report_ids:
                    # Return service tags only
                    log.info(f"Returning service tags for project {project_id}")
                    return {"service tags": list(self.SERVICE_TAGS)}, 200

                # Get reports by IDs
                reports = UIReport.query.filter(
                    UIReport.id.in_(report_ids)
                ).all()

                if not reports:
                    log.warning(f"No reports found for project {project_id} with IDs {report_ids}")

                # Aggregate unique tags
                all_tags = {}
                for report in reports:
                    if report.tags:
                        for tag in report.tags:
                            title = tag.get('title', '')
                            if title not in all_tags:
                                all_tags[title] = {
                                    'title': title,
                                    'hex': tag.get('hex', '#5933c6'),
                                    'is_selected': True
                                }

                log.info(f"Fetched {len(all_tags)} unique tags for project {project_id}")
                return {"tags": list(all_tags.values())}, 200

        except Exception as e:
            log.error(f"Error fetching tags for project {project_id}: {str(e)}")
            return {"message": "Error fetching tags"}, 500

    def post(self, project_id: int, report_id: int):
        """Replace tags for a single report"""
        try:
            data = request.json
            tags = data.get('tags', [])

            # Validate tag structure
            if tags and not all(isinstance(tag, dict) and 'title' in tag and 'hex' in tag for tag in tags):
                return {"message": "You should use 'title' and 'hex' as keys to describe tags"}, 400

            # Check for service tags
            tag_titles = {tag['title'].lower() for tag in tags}
            if tag_titles & set(self.SERVICE_TAGS):
                return {"message": "You cannot add this names to tags"}, 400

            with db.with_project_schema_session(project_id):
                report = UIReport.query.filter(
                    UIReport.id == report_id
                ).first()

                if not report:
                    return {"message": "Report not found"}, 404

                report.replace_tags(tags)

            return {"message": "Tags was updated"}, 200

        except Exception as e:
            log.error(f"Error updating tags: {str(e)}")
            return {"message": "Error updating tags"}, 500

    def put(self, project_id: int):
        """Add tags to multiple reports"""
        try:
            report_ids = request.args.getlist('report_id[]')
            if not report_ids:
                return {"message": "You slould specify report ids"}, 400

            data = request.json
            tags = data.get('tags', [])

            # Validate tag structure
            if not all(isinstance(tag, dict) and 'title' in tag and 'hex' in tag for tag in tags):
                return {"message": "You should use 'title' and 'hex' as keys to describe tags"}, 400

            # Check for service tags
            tag_titles = {tag['title'].lower() for tag in tags}
            if tag_titles & set(self.SERVICE_TAGS):
                return {"message": "You cannot add this names to tags"}, 400

            added_titles = set()
            with db.with_project_schema_session(project_id):
                reports = UIReport.query.filter(
                    UIReport.id.in_(report_ids)
                ).all()

                for report in reports:
                    added = report.add_tags(tags)
                    added_titles.update(added)

            if not added_titles:
                return {"message": "Provided tags are already exist"}, 400

            return {"message": f"Tags {added_titles} were added"}, 200

        except Exception as e:
            log.error(f"Error adding tags: {str(e)}")
            return {"message": "Error adding tags"}, 500

    def delete(self, project_id: int):
        """Delete tags from multiple reports"""
        try:
            report_ids = request.args.getlist('report_id[]')
            if not report_ids:
                return {"message": "You slould specify report ids"}, 400

            tags_to_delete = request.args.getlist('tags[]')
            if not tags_to_delete:
                return {"message": "You should specify tags to delete"}, 400

            deleted_titles = set()
            with db.with_project_schema_session(project_id):
                reports = UIReport.query.filter(
                    UIReport.id.in_(report_ids)
                ).all()

                for report in reports:
                    deleted = report.delete_tags(tags_to_delete)
                    deleted_titles.update(deleted)

            return {"message": f"Tag {deleted_titles} were deleted"}, 204

        except Exception as e:
            log.error(f"Error deleting tags: {str(e)}")
            return {"message": "Error deleting tags"}, 500
