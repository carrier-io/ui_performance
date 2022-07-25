#     Copyright 2021 getcarrier.io
#
#     Licensed under the Apache License, Version 2.0 (the "License");
#     you may not use this file except in compliance with the License.
#     You may obtain a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#     Unless required by applicable law or agreed to in writing, software
#     distributed under the License is distributed on an "AS IS" BASIS,
#     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#     See the License for the specific language governing permissions and
#     limitations under the License.

from queue import Empty
from typing import List, Union
from json import dumps
from pylon.core.tools import log
from sqlalchemy import Column, Integer, String, JSON, ARRAY, and_

from tools import db_tools, db, rpc_tools, constants as c, secrets_tools


class UIPerformanceTests(db_tools.AbstractBaseMixin, db.Base, rpc_tools.RpcMixin):
    __tablename__ = "performance_tests_ui"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, unique=False, nullable=False)
    test_uid = Column(String(128), unique=True, nullable=False)
    name = Column(String(128), nullable=False)
    bucket = Column(String(128), nullable=False)
    file = Column(String(128), nullable=False)
    entrypoint = Column(String(128), nullable=False)
    runner = Column(String(128), nullable=False)
    region = Column(String(128), nullable=False)
    browser = Column(String(128), nullable=False)
    reporting = Column(ARRAY(String), nullable=False)
    parallel = Column(Integer, nullable=False)
    params = Column(JSON)
    env_vars = Column(JSON)
    customization = Column(JSON)
    git = Column(JSON)
    cc_env_vars = Column(JSON)
    job_type = Column(String(20))
    loops = Column(Integer)
    aggregation = Column(String(20))

    def configure_execution_json(self, output='cc', browser=None, test_type=None, params=None, env_vars=None, reporting=None,
                                 customization=None, cc_env_vars=None, parallel=None, execution=False):

        reports = []
        for report in self.reporting:
            if report:
                reports.append(f"-r {report}")

        cmd = f"-sc {self.entrypoint} -l {self.loops} -b {browser} " \
              f"-a {self.aggregation} {' '.join(reports)} -tid {self.test_uid}"

        execution_json = {
            "container": self.runner,
            "execution_params": {
                "cmd": cmd
                #"REMOTE_URL": f'{unsecret("{{secret.redis_host}}", project_id=self.project_id)}:4444'
            },
            "cc_env_vars": {},
            "bucket": self.bucket,
            "job_name": self.name,
            "artifact": self.file,
            "job_type": self.job_type,
            "test_id": self.test_uid,
            "concurrency": 1,
            "channel": self.region
        }

        # if "jira" in self.reporting:
        #     execution_json["execution_params"]["JIRA"] = unsecret("{{secret.jira}}", project_id=self.project_id)
        #
        # if "ado" in self.reporting:
        #     execution_json["execution_params"]["ADO"] = unsecret("{{secret.ado}}", project_id=self.project_id)
        #
        # if "quality" in self.reporting:
        #     execution_json["quality_gate"] = True
        # if "junit" in self.reporting:
        #     execution_json["junit"] = True

        if self.git:
            execution_json["git"] = self.git

        if self.env_vars:
            for key, value in self.env_vars.items():
                execution_json["execution_params"][key] = value

        if self.cc_env_vars:
            for key, value in self.cc_env_vars.items():
                execution_json["cc_env_vars"][key] = value
        if "RABBIT_HOST" not in execution_json["cc_env_vars"].keys():
            execution_json["cc_env_vars"]["RABBIT_HOST"] = "{{secret.rabbit_host}}"
        public_queues = self.rpc.call.get_rabbit_queues("carrier")
        if execution_json["channel"] in public_queues:
            execution_json["cc_env_vars"]["RABBIT_USER"] = "{{secret.rabbit_user}}"
            execution_json["cc_env_vars"]["RABBIT_PASSWORD"] = "{{secret.rabbit_password}}"
            execution_json["cc_env_vars"]["RABBIT_VHOST"] = "carrier"
        else:
            execution_json["cc_env_vars"]["RABBIT_USER"] = "{{secret.rabbit_project_user}}"
            execution_json["cc_env_vars"]["RABBIT_PASSWORD"] = "{{secret.rabbit_project_password}}"
            execution_json["cc_env_vars"]["RABBIT_VHOST"] = "{{secret.rabbit_project_vhost}}"

        if self.customization:
            for key, value in self.customization.items():
                if "additional_files" not in execution_json["execution_params"]:
                    execution_json["execution_params"]["additional_files"] = dict()
                execution_json["execution_params"]["additional_files"][key] = value
        execution_json["execution_params"] = dumps(execution_json["execution_params"])
        if execution:
            execution_json = secrets_tools.unsecret(execution_json, project_id=self.project_id)
        if output == 'cc':
            return execution_json

        return f'docker run -t --rm -e project_id={self.project_id} ' \
               f'-e galloper_url={secrets_tools.unsecret("{{secret.galloper_url}}", project_id=self.project_id)} ' \
               f"-e token=\"{secrets_tools.unsecret('{{secret.auth_token}}', project_id=self.project_id)}\" " \
               f'getcarrier/control_tower:{c.CURRENT_RELEASE} ' \
               f'--test_id {self.test_uid}'

    @classmethod
    def get_ui_filter(cls, project_id: int, test_id: Union[int, str]):
        if isinstance(test_id, int):
            return and_(
                cls.project_id == project_id,
                cls.id == test_id
            )
        return and_(
            cls.project_id == project_id,
            cls.test_uid == test_id
        )