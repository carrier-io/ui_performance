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

from pylon.core.tools import log
from sqlalchemy import Column, Integer, String, JSON, ARRAY, and_

from tools import db_tools, db, rpc_tools, secrets_tools



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

